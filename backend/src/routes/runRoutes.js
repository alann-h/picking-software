import { Router } from 'express';
import asyncHandler from '../middlewares/asyncHandler.js';
import { isAuthenticated, isAdmin } from '../middlewares/authMiddleware.js';
import {
    createRunController,
    getCompanyRunsController,
    updateRunStatusController,
} from '../controllers/runController.js';
import {
    validate,
    runCreateRules,
    companyIdRule,
    runIdRule,
    runStatusUpdateRules,
} from '../validators/runValidator.js';

const router = Router();
router.use(isAuthenticated);

router.post('/', isAdmin, runCreateRules(), validate, asyncHandler(createRunController));
router.put('/:runId/status', isAdmin, runIdRule(), runStatusUpdateRules(), validate, asyncHandler(updateRunStatusController));

router.get('/company/:companyId', companyIdRule(), validate, asyncHandler(getCompanyRunsController));


export default router;