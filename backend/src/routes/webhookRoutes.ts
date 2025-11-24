import express from 'express';
import { handleQBOWebhook, verifyQBOWebhook, testWebhook, handleXeroWebhook, verifyXeroWebhook, handleXeroChallenge } from '../controllers/webhookController.js';

const router = express.Router();

// Webhook endpoints
router.post('/qbo', verifyQBOWebhook, handleQBOWebhook);
router.get('/test', testWebhook);

// Xero webhook endpoints
router.get('/xero', handleXeroChallenge); // Challenge endpoint for "intent to receive"
router.post('/xero', verifyXeroWebhook, handleXeroWebhook); // Webhook receiver

export default router;