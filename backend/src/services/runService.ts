import { AccessError, InputError } from '../middlewares/errorHandler.js';
import { query, transaction } from '../helpers.js';
import { ensureQuotesExistInDB } from './quoteService.js';
import { ConnectionType } from '../types/auth.js';
import { Run, RunStatus, RunWithDetails, RunItemFromDB, QuoteInRun } from '../types/run.js';
import { OrderStatus } from '../types/quote.js';
import { PoolClient } from 'pg';

async function getNextRunNumber(companyId: string): Promise<number> {
    const result: { next_run_number: number }[] = await query(
        'SELECT COALESCE(MAX(run_number), 0) + 1 AS next_run_number FROM runs WHERE company_id = $1',
        [companyId]
    );
    return result[0].next_run_number;
}

export async function createBulkRun(orderedQuoteIds: string[], companyId: string, connectionType: ConnectionType): Promise<Run> {
    try {
        await ensureQuotesExistInDB(orderedQuoteIds, companyId, connectionType);
        return await transaction(async (client: PoolClient) => {
            const quotesResult = await client.query<{ id: string, status: OrderStatus }>(
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

            const newRunResult = await client.query<Run>(
                `INSERT INTO runs (company_id, run_number, status)
                 VALUES ($1, $2, 'pending'::run_status)
                 RETURNING id, company_id, created_at, run_number, status`,
                [companyId, nextRunNumber]
            );
            
            const newRun = newRunResult.rows[0];
            const runId = newRun.id;

            const values: (string | number)[] = [];
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
    } catch (error: any) {
        console.error('Error in createBulkRun service:', error);
        throw error;
    }
}

export async function getRunsByCompanyId(companyId: string): Promise<RunWithDetails[]> {
    try {
        const runsSql = `
            SELECT id, company_id, created_at, run_number, status
            FROM runs
            WHERE company_id = $1 AND status IN ('pending'::run_status, 'checking'::run_status)
            ORDER BY run_number DESC
        `;
        const runsResult: Run[] = await query(runsSql, [companyId]);

        if (runsResult.length === 0) {
            return [];
        }
        const runs = runsResult;
        const runIds = runs.map(run => run.id);

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
            WHERE ri.run_id = ANY($1)
            ORDER BY ri.priority ASC
        `;
        const itemsResult: RunItemFromDB[] = await query(itemsSql, [runIds] as any);
        const items = itemsResult;

        const itemsByRunId = new Map<string, QuoteInRun[]>();
        for (const item of items) {
            if (!itemsByRunId.has(item.run_id)) {
                itemsByRunId.set(item.run_id, []);
            }
            itemsByRunId.get(item.run_id)!.push({
                quoteId: item.id,
                quoteNumber: item.quote_number,
                customerName: item.customer_name,
                totalAmount: parseFloat(item.total_amount),
                priority: item.priority,
                orderStatus: item.status
            });
        }

        const finalResult: RunWithDetails[] = runs.map(run => ({
            ...run,
            quotes: itemsByRunId.get(run.id) || []
        }));

        return finalResult;

    } catch (error: any) {
        console.error('Error in getRunsByCompanyId service:', error);
        throw new AccessError('Failed to fetch runs.');
    }
}

export async function updateRunStatus(runId: string, newStatus: RunStatus): Promise<Run> {
    const allowedStatuses: RunStatus[] = ['pending', 'checking', 'finalised'];
    if (!allowedStatuses.includes(newStatus)) {
        throw new InputError(`Invalid status: ${newStatus}. Must be one of ${allowedStatuses.join(', ')}.`);
    }

    try {
        const result: Run[] = await query(
            'UPDATE runs SET status = $1 WHERE id = $2 RETURNING id, company_id, created_at, run_number, status',
            [newStatus, runId]
        );
        if (result.length === 0) {
            throw new InputError(`Run with ID ${runId} not found.`);
        }
        return result[0];
    } catch (error: any) {
        console.error('Error in updateRunStatus service:', error);
        throw error;
    }
}

export async function updateRunQuotes(runId: string, orderedQuoteIds: string[]): Promise<{message: string}> {
    if (!Array.isArray(orderedQuoteIds)) {
        throw new InputError('Invalid data format: orderedQuoteIds must be an array.');
    }

    try {
        await transaction(async (client: PoolClient) => {
            await client.query('DELETE FROM run_items WHERE run_id = $1', [runId]);

            if (orderedQuoteIds.length > 0) {
                const values: (string | number)[] = [];
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

    } catch (error: any) {
        console.error(`Error updating quotes for run ${runId}:`, error);
        throw error;
    }
}

export async function deleteRunById(runId: string): Promise<{message: string}> {
    try {
        await transaction(async (client: PoolClient) => {
            const itemsResult = await client.query<{ id: string }>(
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
    } catch (error: any) {
        console.error(`Error deleting run ${runId}:`, error);
        throw error;
    }
}
