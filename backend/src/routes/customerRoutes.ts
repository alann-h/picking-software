// src/routes/customerRoutes.js
import { Router } from 'express';
import asyncHandler from '../middlewares/asyncHandler.js';
import { isAuthenticated, requireSubscription } from '../middlewares/authMiddleware.js';
import { getCustomers, saveCustomerList } from '../controllers/customerController.js';
import { validate, saveCustomersRules } from '../validators/customerValidator.js';

const router = Router();
router.use(isAuthenticated, requireSubscription);

// Retrieve customers from QuickBooks
router.get('/', asyncHandler(getCustomers));

// Save customers to local database
router.post('/', saveCustomersRules(), validate, asyncHandler(saveCustomerList));

export default router;
