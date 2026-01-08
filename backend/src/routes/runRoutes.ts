import { Router } from 'express';
import asyncHandler from '../middlewares/asyncHandler.js';
import { isAuthenticated, isAdmin, requireSubscription } from '../middlewares/authMiddleware.js';
import {
    createBulkRunController,
    getCompanyRunsController,
    updateRunStatusController,
    updateRunQuotesController,
    deleteRunController,
    updateRunNameController,
    updateRunDriverController,
    updateRunItemsDetailsController,
    getLatestDriverNameController,
    getRunReportsController,
    updateRunItemStatusController,
    updateRunItemsStatusBulkController,
    moveUndeliveredItemsController
} from '../controllers/runController.js';
import {
    validate,
    runCreateRules,
    companyIdRule,
    runIdRule,
    runStatusUpdateRules,
    runUpdateRules,
    runNameUpdateRules
} from '../validators/runValidator.js';

const router = Router();
router.use(isAuthenticated, requireSubscription);

router.post('/bulk', isAdmin, runCreateRules(), validate, asyncHandler(createBulkRunController));
router.get('/latest-driver', isAdmin, asyncHandler(getLatestDriverNameController));
router.put('/:runId/status', isAdmin, runIdRule(), runStatusUpdateRules(), validate, asyncHandler(updateRunStatusController));
router.put('/:runId/name', isAdmin, runIdRule(), runNameUpdateRules(), validate, asyncHandler(updateRunNameController));
router.get('/reports', isAdmin, asyncHandler(getRunReportsController));
router.put('/:runId/driver', isAdmin, runIdRule(), validate, asyncHandler(updateRunDriverController));
router.put('/:runId/items', isAdmin, runIdRule(), validate, asyncHandler(updateRunItemsDetailsController));

// New ROUTES
router.put('/:runId/items/:quoteId/status', isAdmin, runIdRule(), validate, asyncHandler(updateRunItemStatusController));
router.put('/:runId/items/status-bulk', isAdmin, runIdRule(), validate, asyncHandler(updateRunItemsStatusBulkController));
router.post('/:runId/move-items', isAdmin, runIdRule(), validate, asyncHandler(moveUndeliveredItemsController));

router.get('/company/:companyId', companyIdRule(), validate, asyncHandler(getCompanyRunsController));
router.put('/:runId', isAdmin, runUpdateRules(), validate, asyncHandler(updateRunQuotesController));
router.delete('/:runId',isAdmin, runIdRule(), validate, asyncHandler(deleteRunController));


export default router;
