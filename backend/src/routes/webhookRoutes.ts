import express from 'express';
import { handleQBOWebhook, verifyQBOWebhook, testWebhook, syncProducts, syncAllCompanies } from '../controllers/webhookController.js';
import { isAuthenticated } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Webhook endpoints
router.post('/qbo', verifyQBOWebhook, handleQBOWebhook);
router.get('/test', testWebhook);

// Sync endpoints (require authentication)
router.post('/sync', isAuthenticated, syncProducts);
router.post('/sync-all', isAuthenticated, syncAllCompanies);

export default router;