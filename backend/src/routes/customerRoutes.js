// src/routes/customerRoutes.js
import { Router } from 'express';
import asyncHandler from '../middlewares/asyncHandler.js';
import { isAuthenticated } from '../middlewares/authMiddleware.js';
import { getCustomers, saveCustomerList } from '../controllers/customerController.js';

const router = Router();

// Retrieve customers from QuickBooks
router.get('/', isAuthenticated, asyncHandler(getCustomers));

// Save customers to local database
router.post('/', isAuthenticated, asyncHandler(saveCustomerList));

export default router;
