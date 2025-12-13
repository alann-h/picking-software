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

export async function createBulkRun(orderedQuoteIds: (string | number)[], companyId: string, connectionType: ConnectionType, runName?: string): Promise<Run> {
    // Convert all quote IDs to strings to handle mixed types (integers and strings)
    const stringQuoteIds = orderedQuoteIds.map(id => String(id));

    try {
        await ensureQuotesExistInDB(stringQuoteIds, companyId, connectionType);
        return await prisma.$transaction(async (tx) => {
            // Get quotes with FOR UPDATE equivalent (Prisma handles this automatically in transactions)
            const quotes = await tx.quote.findMany({
                where: { id: { in: stringQuoteIds } },
                select: { 
                    id: true, 
                    status: true,
                    customer: {
                        select: {
                            id: true,
                            defaultDeliveryType: true
                        }
                    }
                },
            });

            if (quotes.length !== stringQuoteIds.length) {
                throw new Error('Internal Server Error: Could not retrieve all quotes for run creation.');
            }
            
            // Allow any status to be added to a run
            // for (const quote of quotes) {
            //     if (!['pending', 'checking'].includes(quote.status)) {
            //         throw new InputError(`Quote ID ${quote.id} has status '${quote.status}' and cannot be added to a run.`);
            //     }
            // }

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
                    driverName: true,
                    status: true,
                },
            });
            
            const runId = newRun.id;

            // Create run items with priorities
            const runItemsData = stringQuoteIds.map((quoteId, index) => {
                const quote = quotes.find(q => q.id === quoteId);
                return {
                    runId,
                    quoteId,
                    priority: index,
                    type: quote?.customer?.defaultDeliveryType || undefined,
                };
            });

            await tx.runItem.createMany({
                data: runItemsData,
            });

            // Update quotes status to assigned ONLY if they are currently pending
            await tx.quote.updateMany({
                where: { 
                    id: { in: stringQuoteIds },
                    status: 'pending'
                },
                data: { status: 'assigned' },
            });

            return {
                id: newRun.id,
                company_id: newRun.companyId,
                created_at: newRun.createdAt,
                run_number: Number(newRun.runNumber),
                run_name: newRun.runName,
                driver_name: newRun.driverName,
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
                companyId
            },
            orderBy: { runNumber: 'desc' },
            select: {
                id: true,
                companyId: true,
                createdAt: true,
                runNumber: true,
                runName: true,
                driverName: true,
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
                            select: { customerName: true, address: true },
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
                customerAddress: item.quote.customer.address || undefined,
                totalAmount: item.quote.totalAmount.toNumber(),
                priority: item.priority,
                orderStatus: item.quote.status,
                size: item.size || undefined,
                type: item.type || undefined,
                deliveryCost: item.deliveryCost?.toNumber(),
                notes: item.notes || undefined,
            });
        }

        const finalResult: RunWithDetails[] = runs.map(run => ({
            id: run.id,
            company_id: run.companyId,
            created_at: run.createdAt,
            run_number: Number(run.runNumber),
            run_name: run.runName,
            driver_name: run.driverName,
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
    const allowedStatuses: RunStatus[] = ['pending', 'completed'];
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
                driverName: true,
                status: true,
            },
        });

        return {
            id: updatedRun.id,
            company_id: updatedRun.companyId,
            created_at: updatedRun.createdAt,
            run_number: Number(updatedRun.runNumber),
            run_name: updatedRun.runName,
            driver_name: updatedRun.driverName,
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

export async function updateRunQuotes(runId: string, orderedQuoteIds: (string | number)[], companyId: string, connectionType: ConnectionType): Promise<{message: string}> {
    if (!Array.isArray(orderedQuoteIds)) {
        throw new InputError('Invalid data format: orderedQuoteIds must be an array.');
    }

    // Convert all quote IDs to strings to handle mixed types (integers and strings)
    const stringQuoteIds = orderedQuoteIds.map(id => String(id));

    try {
        // Fetch quotes from QuickBooks/Xero if they don't exist in DB yet
        if (stringQuoteIds.length > 0) {
            await ensureQuotesExistInDB(stringQuoteIds, companyId, connectionType);
        }

        await prisma.$transaction(async (tx) => {
            // 1. Get existing run items to PRESERVE their details (notes, size, type, cost)
            const existingRunItems = await tx.runItem.findMany({
                where: { runId },
                select: { 
                    quoteId: true,
                    size: true,
                    type: true,
                    deliveryCost: true,
                    notes: true,
                },
            });

            // Map for quick lookup of existing details
            const existingItemsMap = new Map(existingRunItems.map(item => [item.quoteId, item]));
            const existingQuoteIdsRaw = new Set(existingRunItems.map(item => item.quoteId));

            // 2. Identify NEW quotes (those not currently in the run)
            const newQuoteIds = stringQuoteIds.filter(id => !existingQuoteIdsRaw.has(id));

            // 3. Fetch Customer Defaults for ONLY the NEW quotes
            // We need this to populate 'type' (forklift/hand_unload) correctly for new items
            let newQuotesDefaults = new Map<string, string | null>();
            if (newQuoteIds.length > 0) {
                const newQuotesData = await tx.quote.findMany({
                    where: { id: { in: newQuoteIds } },
                    select: {
                        id: true,
                        customer: {
                            select: { defaultDeliveryType: true }
                        }
                    }
                });
                newQuotesDefaults = new Map(newQuotesData.map(q => [q.id, q.customer?.defaultDeliveryType || null]));
            }

            // 4. Delete ALL existing run items (so we can recreate them in the correct new order)
            await tx.runItem.deleteMany({
                where: { runId },
            });

            // 5. Create new run items, merging PRESERVED data with NEW DEFAULTS
            if (stringQuoteIds.length > 0) {
                const runItemsData = stringQuoteIds.map((quoteId, index) => {
                    // Check if we have preserved data
                    const existingItem = existingItemsMap.get(quoteId);

                    if (existingItem) {
                        // PRESERVE existing details
                        return {
                            runId,
                            quoteId,
                            priority: index,
                            size: existingItem.size,
                            type: existingItem.type, // Keep the manually set type if it exists
                            deliveryCost: existingItem.deliveryCost,
                            notes: existingItem.notes,
                        };
                    } else {
                        // NEW ITEM: Use Customer Default for type, others null
                        const defaultType = newQuotesDefaults.get(quoteId);
                        return {
                            runId,
                            quoteId,
                            priority: index,
                            size: null,
                            type: (defaultType as 'hand_unload' | 'forklift' | null) || undefined, // Use customer default
                            deliveryCost: null,
                            notes: null,
                        };
                    }
                });

                await tx.runItem.createMany({
                    data: runItemsData,
                });

                // 6. Update status to 'assigned' ONLY for NEW quotes
                if (newQuoteIds.length > 0) {
                    await tx.quote.updateMany({
                        where: { 
                            id: { in: newQuoteIds },
                            status: { in: ['pending', 'checking'] } // Only update if status allows it
                        },
                        data: { status: 'assigned' },
                    });
                }
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
                driverName: true,
                status: true,
            },
        });

        return {
            id: updatedRun.id,
            company_id: updatedRun.companyId,
            created_at: updatedRun.createdAt,
            run_number: Number(updatedRun.runNumber),
            run_name: updatedRun.runName,
            driver_name: updatedRun.driverName,
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

export async function updateRunDriver(runId: string, driverName: string | null): Promise<Run> {
    try {
        const updatedRun = await prisma.run.update({
            where: { id: runId },
            data: { driverName },
            select: {
                id: true,
                companyId: true,
                createdAt: true,
                runNumber: true,
                runName: true,
                driverName: true,
                status: true,
            },
        });

        return {
            id: updatedRun.id,
            company_id: updatedRun.companyId,
            created_at: updatedRun.createdAt,
            run_number: Number(updatedRun.runNumber),
            run_name: updatedRun.runName,
            driver_name: updatedRun.driverName,
            status: updatedRun.status,
        };
    } catch (error: unknown) {
        if (error instanceof Object && 'code' in error && error.code === 'P2025') {
             throw new InputError(`Run with ID ${runId} not found.`);
        }
        console.error('Error in updateRunDriver service:', error);
        throw error;
    }
}

export interface RunItemUpdate {
    quoteId: string;
    size?: string;
    type?: string;
    deliveryCost?: number;
    notes?: string;
}

export async function updateRunItemsDetails(runId: string, items: RunItemUpdate[]): Promise<void> {
    try {
        await prisma.$transaction(async (tx) => {
            for (const item of items) {
                const updatedRunItem = await tx.runItem.update({
                    where: {
                        runId_quoteId: {
                            runId,
                            quoteId: item.quoteId
                        }
                    },
                    data: {
                        size: item.size,
                        type: item.type === '' ? null : (item.type as 'hand_unload' | 'forklift' | null),
                        deliveryCost: item.deliveryCost,
                        notes: item.notes
                    },
                    include: { quote: true } // Include quote to get customerId
                });

                // If type is provided, update customer default
                if (item.type && item.type !== '') {
                     if (updatedRunItem.quote.customerId) {
                         await tx.customer.update({
                             where: { id: updatedRunItem.quote.customerId },
                             data: { defaultDeliveryType: item.type as 'hand_unload' | 'forklift' }
                         });
                     }
                }
            }
        });
    } catch (error) {
        console.error(`Error updating run items for run ${runId}:`, error);
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

export async function getLatestDriverName(companyId: string): Promise<string | null> {
    try {
        const lastRun = await prisma.run.findFirst({
            where: { 
                companyId,
                AND: [
                    { driverName: { not: null } },
                    { driverName: { not: '' } }
                ]
            },
            orderBy: { createdAt: 'desc' },
            select: { driverName: true }
        });
        return lastRun?.driverName || null;
    } catch (error) {
        console.error('Error getting latest driver name:', error);
        return null;
    }
}

export interface ReportData {
    summary: {
        totalRuns: number;
        totalCost: number;
        totalItems: number;
    };
    dailyBreakdown: {
        date: string;
        runsCount: number;
        totalCost: number;
        itemCount: number;
    }[];
}

export async function getRunReports(companyId: string, startDate: Date, endDate: Date): Promise<ReportData> {
    try {
        // Ensure endDate includes the full end day
        const adjustedEndDate = new Date(endDate);
        adjustedEndDate.setHours(23, 59, 59, 999);

        const runs = await prisma.run.findMany({
            where: {
                companyId,
                createdAt: {
                    gte: startDate,
                    lte: adjustedEndDate,
                },
                // status: { not: 'cancelled' } // Uncomment if you have 'cancelled' status
            },
            include: {
                runItems: {
                    select: {
                        deliveryCost: true
                    }
                }
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        const summary = {
            totalRuns: 0,
            totalCost: 0,
            totalItems: 0,
        };

        const breakdownMap = new Map<string, { runsCount: number; totalCost: number; itemCount: number }>();

        for (const run of runs) {
            summary.totalRuns++;
            
            const runDate = run.createdAt.toISOString().split('T')[0];
            
            let runCost = 0;
            let runItemsCount = 0;

            for (const item of run.runItems) {
                runItemsCount++;
                if (item.deliveryCost) {
                    runCost += item.deliveryCost.toNumber();
                }
            }

            summary.totalCost += runCost;
            summary.totalItems += runItemsCount;

            // Update daily breakdown
            const currentDay = breakdownMap.get(runDate) || { runsCount: 0, totalCost: 0, itemCount: 0 };
            currentDay.runsCount++;
            currentDay.totalCost += runCost;
            currentDay.itemCount += runItemsCount;
            breakdownMap.set(runDate, currentDay);
        }

        const dailyBreakdown = Array.from(breakdownMap.entries()).map(([date, stats]) => ({
            date,
            ...stats
        })).sort((a, b) => a.date.localeCompare(b.date));

        return {
            summary,
            dailyBreakdown
        };

    } catch (error) {
        console.error('Error generating run reports:', error);
        throw new Error('Failed to generate reports');
    }
}
