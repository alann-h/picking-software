import { AccessError, InputError } from '../middlewares/errorHandler.js';
import { ensureQuotesExistInDB } from './quoteService.js';
import { ConnectionType } from '../types/auth.js';
import { Run, RunStatus, RunWithDetails, QuoteInRun, RunItemStatus } from '../types/run.js';
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
                    completedAt: true,
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
                completed_at: newRun.completedAt,
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
                completedAt: true,
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
                runItemStatus: item.status as RunItemStatus, // Cast to our type
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
            completed_at: run.completedAt,
        }));

        return finalResult;

    } catch (error: unknown) {
        console.error('Error in getRunsByCompanyId service:', error);
        throw new AccessError('Failed to fetch runs.');
    }
}

export async function updateRunItemStatus(runId: string, quoteId: string, status: RunItemStatus): Promise<void> {
    try {
        await prisma.$transaction(async (tx) => {
            // Update Run Item Status
            await tx.runItem.update({
                where: {
                    runId_quoteId: {
                        runId,
                        quoteId
                    }
                },
                data: { status: status as any } // Cast to any to avoid Prisma enum mismatch if types aren't perfectly synced yet
            });

            // If status is DELIVERED, update Quote Status to COMPLETED
            if (status === 'delivered') {
                await tx.quote.update({
                    where: { id: quoteId },
                    data: { status: 'completed' }
                });
            }
            // If status is UNDELIVERED, Quote Status stays ASSIGNED (or whatever it was)
        });
    } catch (error) {
        console.error(`Error updating run item status for ${runId}/${quoteId}:`, error);
        throw error;
    }
}

export async function updateRunItemsStatusBulk(runId: string, quoteIds: string[], status: RunItemStatus): Promise<void> {
    try {
        await prisma.$transaction(async (tx) => {
             // 1. Update all specified items to the new status
            await tx.runItem.updateMany({
                where: {
                    runId,
                    quoteId: { in: quoteIds }
                },
                data: { status: status as any }
            });

            // 2. If delivered, update quotes to completed.
            if (status === 'delivered') {
                await tx.quote.updateMany({
                    where: { id: { in: quoteIds } },
                    data: { status: 'completed' }
                });
            }
            // If undelivered or pending, we might consider reverting quote status?
            // "pending" run item status usually implies the delivery hasn't happened yet.
            // If we are "undoing" delivery (setting back to pending), we should probably set quote status back to 'assigned' (if it was completed).
            // However, the Quote might have been completed by other means.
            // Safer to only set to 'completed' on delivery. 
            // If reverting to pending/undelivered, maybe check if they were completed and revert to assigned?
            // Let's stick to the plan: if delivered -> completed.
        });
    } catch (error) {
        console.error(`Error bulk updating run items for run ${runId}:`, error);
        throw error;
    }
}

export async function moveUndeliveredItems(sourceRunId: string, targetRunId: string, itemIds: string[]): Promise<void> {
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Verify items are in source run and have status 'undelivered' (optional strictness, or just 'undelivered'/'pending')
            // For now, we trust the UI/Input but ideally check.

            // 2. Fetch details of these items from Source Run (to preserve notes/size/type/cost)
            const sourceItems = await tx.runItem.findMany({
                where: {
                    runId: sourceRunId,
                    quoteId: { in: itemIds }
                }
            });

            if (sourceItems.length === 0) return;

            // 3. Create items in Target Run
            // We need to determine priority. Let's append them to the end of the target run.
            const targetRunItemCount = await tx.runItem.count({ where: { runId: targetRunId } });
            
            const newItemsData = sourceItems.map((item, index) => ({
                runId: targetRunId,
                quoteId: item.quoteId,
                priority: targetRunItemCount + index,
                size: item.size,
                type: item.type,
                deliveryCost: item.deliveryCost,
                notes: item.notes,
                status: 'pending' as const, // Reset to pending for the new day
            }));

            await tx.runItem.createMany({
                data: newItemsData as any // Cast for enum compatibility
            });
        });
    } catch (error) {
        console.error(`Error moving items from run ${sourceRunId} to ${targetRunId}:`, error);
        throw error;
    }
}

export async function updateRunStatus(runId: string, newStatus: RunStatus): Promise<Run> {
    const allowedStatuses: RunStatus[] = ['pending', 'completed'];
    if (!allowedStatuses.includes(newStatus)) {
        throw new InputError(`Invalid status: ${newStatus}. Must be one of ${allowedStatuses.join(', ')}.`);
    }

    try {
        const completedAtData = newStatus === 'completed' 
            ? new Date() 
            : newStatus === 'pending' ? null : undefined; 

        const dataToUpdate: any = { status: newStatus };
        if (completedAtData !== undefined) {
             dataToUpdate.completedAt = completedAtData;
        }

        // If marking COMPLETED, automatically set all PENDING items to DELIVERED
        // This is a "bulk resolve" convenience. Failed items should have been marked failed/undelivered manually beforehand 
        // OR the user can mark them undelivered AFTER.
        // DECISION: Let's NOT auto-change to delivered to avoid overwriting 'undelivered' intent accidentally?
        // Actually, users usually expect "Complete Run" to mean "Everything went fine unless I said otherwise".
        // Let's set PENDING -> DELIVERED. UNDELIVERED -> stays UNDELIVERED.
        if (newStatus === 'completed') {
             // We need to do this in a transaction if we want to update quote statuses too.
             // But updateRunStatus doesn't natively use a transaction wrapper around the whole function, 
             // but we can add logic inside.
             // However, separating concerns: Let the user mark items.
             // User Request: "I would still have to set it pending then edit then remove then set complete right?" 
             // implying they want automation.
             // Let's keep it simple: Status update just updates the RUN. Items status is managed individually or we can add a "Complete All" button in UI.
        }

        const updatedRun = await prisma.run.update({
            where: { id: runId },
            data: dataToUpdate,
            select: {
                id: true,
                companyId: true,
                createdAt: true,
                runNumber: true,
                runName: true,
                driverName: true,
                status: true,
                completedAt: true,
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
            completed_at: updatedRun.completedAt,
        };
    } catch (error: unknown) {
        if (error instanceof Object && 'code' in error && error.code === 'P2025') {
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

    const stringQuoteIds = orderedQuoteIds.map(id => String(id));

    try {
        if (stringQuoteIds.length > 0) {
            await ensureQuotesExistInDB(stringQuoteIds, companyId, connectionType);
        }

        await prisma.$transaction(async (tx) => {
            const existingRunItems = await tx.runItem.findMany({
                where: { runId },
                select: { 
                    quoteId: true,
                    size: true,
                    type: true,
                    deliveryCost: true,
                    notes: true,
                    status: true // Preserve status
                },
            });

            const existingItemsMap = new Map(existingRunItems.map(item => [item.quoteId, item]));
            const existingQuoteIdsRaw = new Set(existingRunItems.map(item => item.quoteId));

            const newQuoteIds = stringQuoteIds.filter(id => !existingQuoteIdsRaw.has(id));

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

            // Using deleteMany on items that are meant to stay might lose history if we aren't careful?
            // "updateRunQuotes" is usually used for drag-drop reordering or adding/removing.
            // If we delete and recreate, we reset the ID (if autoincrement) and potentially lose status if we don't copy it.
            // We MUST copy 'status' back.

            await tx.runItem.deleteMany({
                where: { runId },
            });

            if (stringQuoteIds.length > 0) {
                const runItemsData = stringQuoteIds.map((quoteId, index) => {
                    const existingItem = existingItemsMap.get(quoteId);

                    if (existingItem) {
                        return {
                            runId,
                            quoteId,
                            priority: index,
                            size: existingItem.size,
                            type: existingItem.type,
                            deliveryCost: existingItem.deliveryCost,
                            notes: existingItem.notes,
                            status: existingItem.status // PRESERVE STATUS
                        };
                    } else {
                        const defaultType = newQuotesDefaults.get(quoteId);
                        return {
                            runId,
                            quoteId,
                            priority: index,
                            size: null,
                            type: (defaultType as 'hand_unload' | 'forklift' | null) || undefined,
                            deliveryCost: null,
                            notes: null,
                            status: 'pending' as const // New items are pending
                        };
                    }
                });

                await tx.runItem.createMany({
                    data: runItemsData as any,
                });

                if (newQuoteIds.length > 0) {
                    await tx.quote.updateMany({
                        where: { 
                            id: { in: newQuoteIds },
                            status: { in: ['pending', 'checking'] }
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
                completedAt: true,
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
            completed_at: updatedRun.completedAt,
        };
    } catch (error: unknown) {
        if (error instanceof Object && 'code' in error && error.code === 'P2025') {
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
                completedAt: true,
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
            completed_at: updatedRun.completedAt,
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
                    include: { quote: true } 
                });

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
            const runItems = await tx.runItem.findMany({
                where: { runId },
                select: { quoteId: true },
            });
            const quoteIdsToRelease = runItems.map(item => item.quoteId);

            await tx.runItem.deleteMany({
                where: { runId },
            });

            await tx.run.delete({
                where: { id: runId },
            });

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
        runs: RunWithDetails[];
    }[];
}

export async function getRunReports(
    companyId: string, 
    startDate: Date, 
    endDate: Date, 
    dateFilter: 'created' | 'completed' = 'created'
): Promise<ReportData> {
    try {
        // startDate and endDate are already set to the correct UTC range for the Australian day by the controller.
        // So we don't need to manually adjust them here.
        
        const dateField = dateFilter === 'completed' ? 'completedAt' : 'createdAt';
        
        const runs = await prisma.run.findMany({
            where: {
                companyId,
                [dateField]: {
                    gte: startDate,
                    lte: endDate,
                },
                ...(dateFilter === 'completed' && { completedAt: { not: null } }),
            },
            include: {
                runItems: {
                    include: {
                        quote: {
                            include: {
                                customer: {
                                    select: {
                                        customerName: true,
                                        address: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { priority: 'asc' }
                }
            },
            orderBy: {
                [dateField]: 'asc'
            }
        });

        const summary = {
            totalRuns: 0,
            totalCost: 0,
            totalItems: 0,
        };

        const breakdownMap = new Map<string, { runsCount: number; totalCost: number; itemCount: number; runs: RunWithDetails[] }>();

        for (const run of runs) {
            summary.totalRuns++;
            
            summary.totalRuns++;
            
            const rawDate = (run as any)[dateField]; 
            // Use helper to get Australian date string (DD/MM/YYYY HH:MM AM/PM)
            // But for grouping we want YYYY-MM-DD key.
            // formatTimestampForSydney returns "DD/MM/YYYY, HH:MM am/pm"
            // Let's parse that or just use the same logic as the helper but output YYYY-MM-DD.
            // Actually, we can just use toLocaleDateString with Australia/Sydney manually here to be safe and simple for the key.
            
            const runDate = new Date(rawDate).toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' }); // YYYY-MM-DD
            
            let runCost = 0;
            let runItemsCount = 0;

            const runQuotes: QuoteInRun[] = run.runItems.map(item => ({
                quoteId: item.quoteId,
                quoteNumber: item.quote.quoteNumber || '',
                customerName: item.quote.customer.customerName,
                customerAddress: item.quote.customer.address || undefined,
                totalAmount: item.quote.totalAmount.toNumber(),
                priority: item.priority,
                orderStatus: item.quote.status,
                runItemStatus: item.status as RunItemStatus,
                size: item.size || undefined,
                type: item.type || undefined,
                deliveryCost: item.deliveryCost?.toNumber(),
                notes: item.notes || undefined,
            }));

            // Calculate cost and count
            for (const item of run.runItems) {
                let shouldCount = true;
                if (run.status === 'completed') {
                    if (item.status === 'undelivered') shouldCount = false;
                    if (item.status !== 'delivered') shouldCount = false;
                }
                
                if (shouldCount) {
                    runItemsCount++;
                    if (item.deliveryCost) {
                        runCost += item.deliveryCost.toNumber();
                    }
                }
            }

            summary.totalCost += runCost;
            summary.totalItems += runItemsCount;

            const currentDay = breakdownMap.get(runDate) || { runsCount: 0, totalCost: 0, itemCount: 0, runs: [] };
            currentDay.runsCount++;
            currentDay.totalCost += runCost;
            currentDay.itemCount += runItemsCount;
            
            currentDay.runs.push({
                id: run.id,
                company_id: run.companyId,
                created_at: run.createdAt,
                run_number: Number(run.runNumber),
                run_name: run.runName,
                driver_name: run.driverName,
                status: run.status,
                completed_at: run.completedAt,
                quotes: runQuotes,
                total_delivery_cost: runCost
            });

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

