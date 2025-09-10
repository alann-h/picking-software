import {
    createBulkRun,
    getRunsByCompanyId,
    updateRunStatus,
    updateRunQuotes as updateRunQuotesService,
    deleteRunById as deleteRunByIdService,
} from '../services/runService.js'; // New service file for runs
import { Request, Response, NextFunction } from 'express';
import { RunStatus } from '../types/run.js';

/**
 * Controller to create a new run.
 * Accessible by Admins only.
 */
export async function createBulkRunController(req: Request, res: Response, next: NextFunction) {
    const { orderedQuoteIds, companyId } = req.body;
    const connectionType = req.session.connectionType;
    if (!connectionType) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const newRun = await createBulkRun(orderedQuoteIds, companyId, connectionType);
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

        if (!orderedQuoteIds) {
            return res.status(400).json({ message: 'Missing orderedQuoteIds in request body.' });
        }
        const result = await updateRunQuotesService(runId, orderedQuoteIds);
        res.status(200).json(result);
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
