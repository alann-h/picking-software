import { Router } from 'express';
import asyncHandler from '../middlewares/asyncHandler.js';
import { isAuthenticated, isAdmin } from '../middlewares/authMiddleware.js';
import {
    createBulkRunController,
    getCompanyRunsController,
    updateRunStatusController,
    updateRunQuotesController,
    deleteRunController
} from '../controllers/runController.js';
import {
    validate,
    runCreateRules,
    companyIdRule,
    runIdRule,
    runStatusUpdateRules,
    runUpdateRules
} from '../validators/runValidator.js';

const router = Router();
router.use(isAuthenticated);

router.post('/bulk', isAdmin, runCreateRules(), validate, asyncHandler(createBulkRunController));
router.put('/:runId/status', isAdmin, runIdRule(), runStatusUpdateRules(), validate, asyncHandler(updateRunStatusController));

router.get('/company/:companyId', companyIdRule(), validate, asyncHandler(getCompanyRunsController));
router.put('/:runId', isAdmin, runUpdateRules(), validate, updateRunQuotesController);
router.delete('/:runId',isAdmin, runIdRule(), validate, deleteRunController);


export default router;