import express from 'express';
import { syncProducts, syncAllCompanies, getCategories, syncWithCategories, getSyncSettings, saveSyncSettings, refreshCategories } from '../controllers/syncController.js';
import { isAuthenticated } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All sync endpoints require authentication
router.use(isAuthenticated);

// Product sync endpoints
router.post('/products', syncProducts);
router.post('/products/all-companies', syncAllCompanies);

// Category management endpoints
router.get('/categories', getCategories);
router.post('/categories/refresh', refreshCategories);
router.post('/products/categories', syncWithCategories);

// Sync settings endpoints
router.get('/settings', getSyncSettings);
router.post('/settings', saveSyncSettings);

export default router;
