import {
    createBulkRun,
    getRunsByCompanyId,
    updateRunStatus,
    updateRunQuotes as updateRunQuotesService,
    deleteRunById as deleteRunByIdService,
    updateRunName,
    updateRunDriver,
    updateRunItemsDetails,
    getLatestDriverName,
    getRunReports,
    RunItemUpdate
} from '../services/runService.js'; // New service file for runs
import { Request, Response, NextFunction } from 'express';
import { RunStatus } from '../types/run.js';

/**
 * Controller to create a new run.
 * Accessible by Admins only.
 */
export async function createBulkRunController(req: Request, res: Response, next: NextFunction) {
    const { orderedQuoteIds, companyId, runName } = req.body;
    const connectionType = req.session.connectionType;
    if (!connectionType) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        // Service handles conversion to strings internally
        const newRun = await createBulkRun(orderedQuoteIds, companyId, connectionType, runName);
        res.status(201).json(newRun);
    } catch (error) {
        next(error);
    }
}

/**
 * Controller to get active runs for a specific company.
 * Can be accessed by admins or relevant users of the company.
 */
export async function getCompanyRunsController(req: Request, res: Response, next: NextFunction) {
    const { companyId } = req.params;
    try {
        const runs = await getRunsByCompanyId(companyId);
        res.status(200).json(runs);
    } catch (error) {
        next(error);
    }
}

/**
 * Controller to update the status of a run.
 * Accessible by Admins only.
 */
export async function updateRunStatusController(req: Request, res: Response, next: NextFunction) {
    const { runId } = req.params;
    const { status } = req.body as { status: RunStatus };
    
    // might want to get companyId from the runId to ensure the admin is authorized for this run
    // const run = await getRunById(runId);
    // if (run && req.user.companyId !== run.companyId) {
    //     throw new AccessError('Unauthorized: You cannot update runs for another company.');
    // }

    try {
        const updatedRun = await updateRunStatus(runId, status);
        res.status(200).json(updatedRun);
    } catch (error) {
        next(error);
    }
}

export async function updateRunQuotesController(req: Request, res: Response, next: NextFunction) {
    try {
        const { runId } = req.params;
        const { orderedQuoteIds } = req.body;
        const companyId = req.session.companyId;
        const connectionType = req.session.connectionType;

        if (!companyId || !connectionType) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!orderedQuoteIds) {
            return res.status(400).json({ message: 'Missing orderedQuoteIds in request body.' });
        }
        
        const result = await updateRunQuotesService(runId, orderedQuoteIds, companyId, connectionType);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

export async function updateRunNameController(req: Request, res: Response, next: NextFunction) {
    try {
        const { runId } = req.params;
        const { runName } = req.body;
        
        if (!runName || typeof runName !== 'string') {
            return res.status(400).json({ error: 'runName is required and must be a string' });
        }
        
        const updatedRun = await updateRunName(runId, runName);
        res.status(200).json(updatedRun);
    } catch (error) {
        next(error);
    }
}

export async function updateRunDriverController(req: Request, res: Response, next: NextFunction) {
    try {
        const { runId } = req.params;
        const { driverName } = req.body;
        
        const updatedRun = await updateRunDriver(runId, driverName);
        res.status(200).json(updatedRun);
    } catch (error) {
        next(error);
    }
}

export async function updateRunItemsDetailsController(req: Request, res: Response, next: NextFunction) {
    try {
        const { runId } = req.params;
        const { items } = req.body as { items: RunItemUpdate[] };
        
        if (!Array.isArray(items)) {
             return res.status(400).json({ error: 'items must be an array' });
        }

        await updateRunItemsDetails(runId, items);
        res.status(200).json({ message: 'Run items updated successfully' });
    } catch (error) {
        next(error);
    }
}

export async function deleteRunController(req: Request, res: Response, next: NextFunction) {
    try {
        const { runId } = req.params;
        await deleteRunByIdService(runId);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
}

export async function getLatestDriverNameController(req: Request, res: Response, next: NextFunction) {
    try {
        const companyId = req.session.companyId;
        if (!companyId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const driverName = await getLatestDriverName(companyId);
        res.status(200).json({ driverName });
    } catch (error) {
        next(error);
    }
}

export async function getRunReportsController(req: Request, res: Response, next: NextFunction) {
    try {
        const companyId = req.session.companyId;
        if (!companyId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { startDate, endDate, dateFilter } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required parameters' });
        }

        const start = new Date(startDate as string);
        const end = new Date(endDate as string);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ error: 'Invalid date format' });
        }

        const filterMode = (dateFilter === 'completed' || dateFilter === 'created') 
            ? dateFilter 
            : 'created';

        const reportData = await getRunReports(companyId, start, end, filterMode);
        res.status(200).json(reportData);
    } catch (error) {
        next(error);
    }
}
