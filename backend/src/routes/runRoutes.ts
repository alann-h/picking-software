import { Router } from 'express';
import asyncHandler from '../middlewares/asyncHandler.js';
import { isAuthenticated, isAdmin } from '../middlewares/authMiddleware.js';
import {
    createBulkRunController,
    getCompanyRunsController,
    updateRunStatusController,
    updateRunQuotesController,
    deleteRunController,
    updateRunNameController,
    updateRunDriverController,
    updateRunItemsDetailsController,
    getLatestDriverNameController
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
router.use(isAuthenticated);

router.post('/bulk', isAdmin, runCreateRules(), validate, asyncHandler(createBulkRunController));
router.get('/latest-driver', isAdmin, asyncHandler(getLatestDriverNameController));
router.put('/:runId/status', isAdmin, runIdRule(), runStatusUpdateRules(), validate, asyncHandler(updateRunStatusController));
router.put('/:runId/name', isAdmin, runIdRule(), runNameUpdateRules(), validate, asyncHandler(updateRunNameController));
router.put('/:runId/driver', isAdmin, runIdRule(), validate, asyncHandler(updateRunDriverController));
router.put('/:runId/items', isAdmin, runIdRule(), validate, asyncHandler(updateRunItemsDetailsController));

router.get('/company/:companyId', companyIdRule(), validate, asyncHandler(getCompanyRunsController));
router.put('/:runId', isAdmin, runUpdateRules(), validate, asyncHandler(updateRunQuotesController));
router.delete('/:runId',isAdmin, runIdRule(), validate, asyncHandler(deleteRunController));


export default router;
