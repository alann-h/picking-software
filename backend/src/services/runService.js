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
        const result = await query(
            `SELECT r.id, r.companyid, r.created_at, r.quoteid, r.run_number, r.status,
                    q.customername, q.totalamount
             FROM runs r
             JOIN quotes q ON r.quoteid = q.quoteid
             WHERE r.companyid = $1 AND r.status IN ('pending', 'checking')
             ORDER BY r.run_number DESC`,
            [companyId]
        );
        if (result.length == 0) {
            return null;
        }

        return result.map(row => ({
            id: row.id,
            companyid: row.companyid,
            created_at: row.created_at,
            quoteid: row.quoteid,
            run_number: row.run_number,
            status: row.status,
            customername: row.customername,
            totalamt: parseFloat(row.totalamount)
        }));
    } catch (error) {
        console.log('Error in getRunsByCompanyId service:', error);
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