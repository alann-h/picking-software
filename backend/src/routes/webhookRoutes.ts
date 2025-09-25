import express from 'express';
import { handleQBOWebhook, verifyQBOWebhook, testWebhook } from '../controllers/webhookController.js';

const router = express.Router();

// Webhook endpoints
router.post('/qbo', verifyQBOWebhook, handleQBOWebhook);
router.get('/test', testWebhook);

export default router;