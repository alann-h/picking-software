import {
    createBulkRun,
    getRunsByCompanyId,
    updateRunStatus,
} from '../services/runService.js'; // New service file for runs

/**
 * Controller to create a new run.
 * Accessible by Admins only.
 */
export async function createBulkRunController(req, res, next) {
    const { quoteId, companyId } = req.body; 

    try {
        const newRun = await createBulkRun(quoteId, companyId);
        res.status(201).json(newRun);
    } catch (error) {
        next(error);
    }
}

/**
 * Controller to get active runs for a specific company.
 * Can be accessed by admins or relevant users of the company.
 */
export async function getCompanyRunsController(req, res, next) {
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
export async function updateRunStatusController(req, res, next) {
    const { runId } = req.params;
    const { status } = req.body;
    
    // You might want to get companyId from the runId to ensure the admin is authorized for this run
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