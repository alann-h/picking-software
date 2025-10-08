import { AccessError, InputError } from '../middlewares/errorHandler.js';
import { ensureQuotesExistInDB } from './quoteService.js';
import { ConnectionType } from '../types/auth.js';
import { Run, RunStatus, RunWithDetails, QuoteInRun } from '../types/run.js';
import { prisma } from '../lib/prisma.js';

async function getNextRunNumber(companyId: string): Promise<number> {
    const result = await prisma.run.aggregate({
        where: { companyId },
        _max: { runNumber: true },
    });
    return Number(result._max.runNumber || 0) + 1;
}

export async function createBulkRun(orderedQuoteIds: string[], companyId: string, connectionType: ConnectionType, runName?: string): Promise<Run> {
    try {
        await ensureQuotesExistInDB(orderedQuoteIds, companyId, connectionType);
        return await prisma.$transaction(async (tx) => {
            // Get quotes with FOR UPDATE equivalent (Prisma handles this automatically in transactions)
            const quotes = await tx.quote.findMany({
                where: { id: { in: orderedQuoteIds } },
                select: { id: true, status: true },
            });

            if (quotes.length !== orderedQuoteIds.length) {
                throw new Error('Internal Server Error: Could not retrieve all quotes for run creation.');
            }
            
            for (const quote of quotes) {
                if (!['pending', 'checking'].includes(quote.status)) {
                    throw new InputError(`Quote ID ${quote.id} has status '${quote.status}' and cannot be added to a run.`);
                }
            }

            const nextRunNumber = await getNextRunNumber(companyId);

            // Create the run
            const newRun = await tx.run.create({
                data: {
                    companyId,
                    runNumber: nextRunNumber,
                    runName: runName || null,
                    status: 'pending',
                },
                select: {
                    id: true,
                    companyId: true,
                    createdAt: true,
                    runNumber: true,
                    runName: true,
                    status: true,
                },
            });
            
            const runId = newRun.id;

            // Create run items with priorities
            const runItemsData = orderedQuoteIds.map((quoteId, index) => ({
                runId,
                quoteId,
                priority: index,
            }));

            await tx.runItem.createMany({
                data: runItemsData,
            });

            // Update quotes status to assigned
            await tx.quote.updateMany({
                where: { id: { in: orderedQuoteIds } },
                data: { status: 'assigned' },
            });

            return {
                id: newRun.id,
                company_id: newRun.companyId,
                created_at: newRun.createdAt,
                run_number: Number(newRun.runNumber),
                run_name: newRun.runName,
                status: newRun.status,
            };
        });
    } catch (error: unknown) {
        console.error('Error in createBulkRun service:', error);
        throw error;
    }
}

export async function getRunsByCompanyId(companyId: string): Promise<RunWithDetails[]> {
    try {
        const runs = await prisma.run.findMany({
            where: {
                companyId,
                status: { in: ['pending', 'finalised'] },
            },
            orderBy: { runNumber: 'desc' },
            select: {
                id: true,
                companyId: true,
                createdAt: true,
                runNumber: true,
                runName: true,
                status: true,
            },
        });

        if (runs.length === 0) {
            return [];
        }

        const runIds = runs.map(run => run.id);

        const items = await prisma.runItem.findMany({
            where: { runId: { in: runIds } },
            include: {
                quote: {
                    include: {
                        customer: {
                            select: { customerName: true },
                        },
                    },
                },
            },
            orderBy: { priority: 'asc' },
        });

        const itemsByRunId = new Map<string, QuoteInRun[]>();
        for (const item of items) {
            if (!itemsByRunId.has(item.runId)) {
                itemsByRunId.set(item.runId, []);
            }
            itemsByRunId.get(item.runId)!.push({
                quoteId: item.quoteId,
                quoteNumber: item.quote.quoteNumber || '',
                customerName: item.quote.customer.customerName,
                totalAmount: item.quote.totalAmount.toNumber(),
                priority: item.priority,
                orderStatus: item.quote.status,
            });
        }

        const finalResult: RunWithDetails[] = runs.map(run => ({
            id: run.id,
            company_id: run.companyId,
            created_at: run.createdAt,
            run_number: Number(run.runNumber),
            run_name: run.runName,
            status: run.status,
            quotes: itemsByRunId.get(run.id) || [],
        }));

        return finalResult;

    } catch (error: unknown) {
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
        const updatedRun = await prisma.run.update({
            where: { id: runId },
            data: { status: newStatus },
            select: {
                id: true,
                companyId: true,
                createdAt: true,
                runNumber: true,
                runName: true,
                status: true,
            },
        });

        return {
            id: updatedRun.id,
            company_id: updatedRun.companyId,
            created_at: updatedRun.createdAt,
            run_number: Number(updatedRun.runNumber),
            run_name: updatedRun.runName,
            status: updatedRun.status,
        };
    } catch (error: unknown) {
        if (error instanceof Object && 'code' in error && error.code === 'P2025') {
            // Prisma error for record not found
            throw new InputError(`Run with ID ${runId} not found.`);
        }
        console.error('Error in updateRunStatus service:', error);
        throw error;
    }
}

export async function updateRunQuotes(runId: string, orderedQuoteIds: string[]): Promise<{message: string}> {
    if (!Array.isArray(orderedQuoteIds)) {
        throw new InputError('Invalid data format: orderedQuoteIds must be an array.');
    }

    try {
        await prisma.$transaction(async (tx) => {
            // Delete existing run items
            await tx.runItem.deleteMany({
                where: { runId },
            });

            // Create new run items if there are any
            if (orderedQuoteIds.length > 0) {
                const runItemsData = orderedQuoteIds.map((quoteId, index) => ({
                    runId,
                    quoteId,
                    priority: index,
                }));

                await tx.runItem.createMany({
                    data: runItemsData,
                });
            }
        });

        return { message: `Run ${runId} was updated successfully.` };

    } catch (error: unknown) {
        console.error(`Error updating quotes for run ${runId}:`, error);
        throw error;
    }
}

export async function updateRunName(runId: string, runName: string): Promise<Run> {
    try {
        const updatedRun = await prisma.run.update({
            where: { id: runId },
            data: { runName },
            select: {
                id: true,
                companyId: true,
                createdAt: true,
                runNumber: true,
                runName: true,
                status: true,
            },
        });

        return {
            id: updatedRun.id,
            company_id: updatedRun.companyId,
            created_at: updatedRun.createdAt,
            run_number: Number(updatedRun.runNumber),
            run_name: updatedRun.runName,
            status: updatedRun.status,
        };
    } catch (error: unknown) {
        if (error instanceof Object && 'code' in error && error.code === 'P2025') {
            // Prisma error for record not found
            throw new InputError(`Run with ID ${runId} not found.`);
        }
        console.error('Error in updateRunName service:', error);
        throw error;
    }
}

export async function deleteRunById(runId: string): Promise<{message: string}> {
    try {
        await prisma.$transaction(async (tx) => {
            // Get quote IDs from run items before deleting them
            const runItems = await tx.runItem.findMany({
                where: { runId },
                select: { quoteId: true },
            });
            const quoteIdsToRelease = runItems.map(item => item.quoteId);

            // Delete run items first (due to foreign key constraints)
            await tx.runItem.deleteMany({
                where: { runId },
            });

            // Delete the run
            await tx.run.delete({
                where: { id: runId },
            });

            // Release quotes back to pending status
            if (quoteIdsToRelease.length > 0) {
                await tx.quote.updateMany({
                    where: { id: { in: quoteIdsToRelease } },
                    data: { status: 'pending' },
                });
            }
        });

        return { message: `Run ${runId} was successfully deleted.` };
    } catch (error: unknown) {
        console.error(`Error deleting run ${runId}:`, error);
        throw error;
    }
}
