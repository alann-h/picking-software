import { AccessError, InputError } from '../middlewares/errorHandler.js';
import { query, transaction } from '../helpers.js';
import { ensureQuotesExistInDB } from './quoteService.js';


/**
 * Fetches the next available run number for a given company.
 * @param {string} companyId The ID of the company.
 * @returns {Promise<number>} The next sequential run number.
 */
async function getNextRunNumber(companyId) {
    const result = await query(
        'SELECT COALESCE(MAX(run_number), 0) + 1 AS next_run_number FROM runs WHERE company_id = $1',
        [companyId]
    );
    return result[0].next_run_number;
}

/**
 * Creates a new run entry in the database.
 * @param {string[]} orderedQuoteIds The ID of the quote to associate with the run.
 * @param {string} companyId The ID of the company creating the run.
 * @param {string} connectionType The connection type ('qbo' or 'xero').
 * @returns {Promise<object>} The newly created run object.
 * @throws {InputError} If the quote does not exist or is not in a valid status.
 * @throws {AccessError} If there's a database error.
 */
export async function createBulkRun(orderedQuoteIds, companyId, connectionType) {
    try {
        await ensureQuotesExistInDB(orderedQuoteIds, companyId, connectionType);
        return await transaction(async (client) => {
            const quotesResult = await client.query(
                'SELECT id, status FROM quotes WHERE id = ANY($1::text[]) FOR UPDATE',
                [orderedQuoteIds]
            );

            if (quotesResult.rows.length !== orderedQuoteIds.length) {
                throw new Error('Internal Server Error: Could not retrieve all quotes for run creation.');
            }
            
            for (const quote of quotesResult.rows) {
                if (!['pending', 'checking'].includes(quote.status)) {
                    throw new InputError(`Quote ID ${quote.id} has status '${quote.status}' and cannot be added to a run.`);
                }
            }

            const nextRunNumber = await getNextRunNumber(companyId);

            const newRunResult = await client.query(
                `INSERT INTO runs (company_id, run_number, status)
                 VALUES ($1, $2, 'pending'::run_status)
                 RETURNING id, company_id, created_at, run_number, status`,
                [companyId, nextRunNumber]
            );
            
            const newRun = newRunResult.rows[0];
            const runId = newRun.id;

            const values = [];
            const placeholders = orderedQuoteIds.map((quoteId, index) => {
                const offset = index * 3;
                values.push(runId, quoteId, index);
                return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
            }).join(',');

            await client.query(
                `INSERT INTO run_items (run_id, quote_id, priority) VALUES ${placeholders}`,
                values
            );

            await client.query(
                `UPDATE quotes SET status = 'assigned'::order_status WHERE id = ANY($1::text[])`,
                [orderedQuoteIds]
            );

            return newRun;
        });
    } catch (error) {
        console.error('Error in createBulkRun service:', error);
        throw error;
    }
}

/**
 * Retrieves all active runs for a given company.
 * Joins with the quotes table to get customer name and total amount.
 * @param {string} companyId The ID of the company.
 * @returns {Promise<Array<object>>} A list of run objects.
 * @throws {AccessError} If there's a database error.
 */
export async function getRunsByCompanyId(companyId) {
    try {
        // --- Step 1: Fetch all the parent 'runs' for the company ---
        const runsSql = `
            SELECT id, company_id, created_at, run_number, status
            FROM runs
            WHERE company_id = $1 AND status IN ('pending'::run_status, 'checking'::run_status)
            ORDER BY run_number DESC
        `;
        const runsResult = await query(runsSql, [companyId]);

        if (runsResult.length === 0) {
            return [];
        }
        const runs = runsResult;
        const runIds = runs.map(run => run.id);

        // --- Step 2: Fetch all related items for those runs in a single batch ---
        const itemsSql = `
            SELECT 
                ri.run_id, 
                ri.priority, 
                q.id, 
                q.quote_number,
                c.customer_name, 
                q.total_amount,
                q.status
            FROM run_items ri
            JOIN quotes q ON ri.quote_id = q.id
            JOIN customers c ON q.customer_id = c.id
            WHERE ri.run_id = ANY($1) -- Use ANY($1) to match all IDs in the runIds array
            ORDER BY ri.priority ASC
        `;
        const itemsResult = await query(itemsSql, [runIds]);
        const items = itemsResult;

        const itemsByRunId = new Map();
        for (const item of items) {
            if (!itemsByRunId.has(item.run_id)) {
                itemsByRunId.set(item.run_id, []);
            }
            itemsByRunId.get(item.run_id).push({
                quoteId: item.id,
                quoteNumber: item.quote_number,
                customerName: item.customer_name,
                totalAmount: parseFloat(item.total_amount),
                priority: item.priority,
                orderStatus: item.status
            });
        }

        const finalResult = runs.map(run => ({
            ...run,
            quotes: itemsByRunId.get(run.id) || []
        }));

        return finalResult;

    } catch (error) {
        console.error('Error in getRunsByCompanyId service:', error);
        throw new AccessError('Failed to fetch runs.');
    }
}

/**
 * Updates the status of an existing run.
 * @param {string} runId The ID of the run to update.
 * @param {string} newStatus The new status to set ('pending', 'checking', 'finalised').
 * @returns {Promise<object>} The updated run object.
 * @throws {InputError} If the run is not found or the status is invalid.
 * @throws {AccessError} If there's a database error.
 */
export async function updateRunStatus(runId, newStatus) {
    const allowedStatuses = ['pending', 'checking', 'finalised'];
    if (!allowedStatuses.includes(newStatus)) {
        throw new InputError(`Invalid status: ${newStatus}. Must be one of ${allowedStatuses.join(', ')}.`);
    }

    try {
        const result = await query(
            'UPDATE runs SET status = $1 WHERE id = $2 RETURNING id, company_id, created_at, run_number, status',
            [newStatus, runId]
        );
        if (result[0].length === 0) {
            throw new InputError(`Run with ID ${runId} not found.`);
        }
        return result[0];
    } catch (error) {
        console.error('Error in updateRunStatus service:', error);
        throw error; // Re-throw specific errors like InputError
    }
}

/**
 * Updates the quotes and their priorities for a specific run.
 * This is done by replacing the existing run items with a new set.
 * @param {string} runId The ID of the run to update.
 * @param {number[]} orderedQuoteIds An array of quote IDs in the new desired order.
 * @returns {Promise<{message: string}>} A success message.
 */
export async function updateRunQuotes(runId, orderedQuoteIds) {
    // Ensure there are quotes to update. If the array is empty, it means the user wants to clear the run.
    if (!Array.isArray(orderedQuoteIds)) {
        throw new InputError('Invalid data format: orderedQuoteIds must be an array.');
    }

    try {
        await transaction(async (client) => {
            await client.query('DELETE FROM run_items WHERE run_id = $1', [runId]);

            if (orderedQuoteIds.length > 0) {
                const values = [];
                const placeholders = orderedQuoteIds.map((quoteId, index) => {
                    const offset = index * 3;
                    values.push(runId, quoteId, index);
                    return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
                }).join(',');

                await client.query(
                    `INSERT INTO run_items (run_id, quote_id, priority) VALUES ${placeholders}`,
                    values
                );
            }
        });

        return { message: `Run ${runId} was updated successfully.` };

    } catch (error) {
        console.error(`Error updating quotes for run ${runId}:`, error);
        throw error;
    }
}

/**
 * Deletes a run and its associated items from the database.
 * It also resets the status of the quotes within that run to 'pending'.
 * @param {string} runId The ID of the run to delete.
 * @returns {Promise<{message: string}>} A success message.
 */
export async function deleteRunById(runId) {
    try {
        await transaction(async (client) => {
            const itemsResult = await client.query(
                'SELECT id FROM run_items WHERE run_id = $1',
                [runId]
            );
            const quoteIdsToRelease = itemsResult.rows.map(item => item.id);

            await client.query('DELETE FROM run_items WHERE run_id = $1', [runId]);

            await client.query('DELETE FROM runs WHERE id = $1', [runId]);

            if (quoteIdsToRelease.length > 0) {
                await client.query(
                    `UPDATE quotes SET status = 'pending'::order_status WHERE id = ANY($1::text[])`,
                    [quoteIdsToRelease]
                );
            }
        });

        return { message: `Run ${runId} was successfully deleted.` };
    } catch (error) {
        console.error(`Error deleting run ${runId}:`, error);
        throw error;
    }
}
