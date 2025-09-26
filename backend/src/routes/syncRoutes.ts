import express from 'express';
import { syncProducts, getSyncSettings, saveSyncSettings } from '../controllers/syncController.js';
import { isAuthenticated } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All sync endpoints require authentication
router.use(isAuthenticated);

// Product sync endpoints
router.post('/products', syncProducts);

// Sync settings endpoints
router.get('/settings', getSyncSettings);
router.post('/settings', saveSyncSettings);

export default router;
