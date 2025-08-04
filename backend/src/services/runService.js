import { AccessError, InputError } from '../middlewares/errorHandler.js';
import { query, transaction } from '../helpers.js'; // Assuming you have these helpers

/**
 * Fetches the next available run number for a given company.
 * @param {string} companyId The ID of the company.
 * @returns {Promise<number>} The next sequential run number.
 */
async function getNextRunNumber(companyId) {
    const result = await query(
        'SELECT COALESCE(MAX(run_number), 0) + 1 AS next_run_number FROM runs WHERE companyid = $1',
        [companyId]
    );
    return result[0].next_run_number;
}

/**
 * Creates a new run entry in the database.
 * @param {number} quoteId The ID of the quote to associate with the run.
 * @param {string} companyId The ID of the company creating the run.
 * @returns {Promise<object>} The newly created run object.
 * @throws {InputError} If the quote does not exist or is not in a valid status.
 * @throws {AccessError} If there's a database error.
 */
export async function createBulkRun(orderedQuoteIds, companyId) {
    try {
        return await transaction(async (client) => {
            const quotesResult = await client.query(
                'SELECT quoteid, orderstatus FROM quotes WHERE quoteid = ANY($1::int[])',
                [orderedQuoteIds]
            );

            if (quotesResult.rows.length !== orderedQuoteIds.length) {
                const foundIds = new Set(quotesResult.rows.map(r => r.quoteid));
                const missingIds = orderedQuoteIds.filter(id => !foundIds.has(id));
                throw new InputError(`The following quotes were not found: ${missingIds.join(', ')}`);
            }
            
            for (const quote of quotesResult.rows) {
                if (!['pending', 'checking'].includes(quote.orderstatus)) {
                    throw new InputError(`Quote ID ${quote.quoteid} has status '${quote.orderstatus}' and cannot be added to a run.`);
                }
            }

            const nextRunNumber = await getNextRunNumber(companyId, client);

            const newRunResult = await client.query(
                `INSERT INTO runs (companyid, run_number, status)
                 VALUES ($1, $2, 'pending')
                 RETURNING id, companyid, created_at, run_number, status`,
                [companyId, nextRunNumber]
            );
            
            const newRun = newRunResult.rows[0];
            const runId = newRun.id;

            const runItemsValues = orderedQuoteIds.map((quoteId, index) => {
                return `(${runId}, ${quoteId}, ${index})`;
            }).join(',');

            await client.query(
                `INSERT INTO run_items (run_id, quote_id, priority) VALUES ${runItemsValues}`
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
            SELECT id, companyid, created_at, run_number, status
            FROM runs
            WHERE companyid = $1 AND status IN ('pending', 'checking')
            ORDER BY run_number DESC
        `;
        const runsResult = await query(runsSql, [companyId]);

        if (runsResult.length === 0) {
            return [];
        }

        const runs = runsResult.rows;
        const runIds = runs.map(run => run.id);

        // --- Step 2: Fetch all related items for those runs in a single batch ---
        const itemsSql = `
            SELECT 
                ri.run_id, 
                ri.priority, 
                q.quoteid, 
                q.customername, 
                q.totalamount
            FROM run_items ri
            JOIN quotes q ON ri.quote_id = q.quoteid
            WHERE ri.run_id = ANY($1) -- Use ANY($1) to match all IDs in the runIds array
            ORDER BY ri.priority ASC
        `;
        const itemsResult = await query(itemsSql, [runIds]);
        const items = itemsResult.rows;

        const itemsByRunId = new Map();
        for (const item of items) {
            if (!itemsByRunId.has(item.run_id)) {
                itemsByRunId.set(item.run_id, []);
            }
            itemsByRunId.get(item.run_id).push({
                quoteId: item.quoteid,
                customerName: item.customername,
                totalAmount: parseFloat(item.totalamount),
                priority: item.priority
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
            'UPDATE runs SET status = $1 WHERE id = $2 RETURNING id, companyid, created_at, quoteid, run_number, status',
            [newStatus, runId]
        );
        if (result.rows.length === 0) {
            throw new InputError(`Run with ID ${runId} not found.`);
        }
        return result.rows[0];
    } catch (error) {
        console.error('Error in updateRunStatus service:', error);
        throw error; // Re-throw specific errors like InputError
    }
}