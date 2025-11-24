import express from 'express';
import { handleQBOWebhook, verifyQBOWebhook, testWebhook, handleXeroWebhook, verifyXeroWebhook, handleXeroChallenge } from '../controllers/webhookController.js';

const router = express.Router();

// Webhook endpoints
router.post('/qbo', verifyQBOWebhook, handleQBOWebhook);
router.get('/test', testWebhook);

// Xero webhook endpoints
router.get('/xero', handleXeroChallenge); // Challenge endpoint for "intent to receive"
// Use express.raw() to capture exact raw body for signature verification
router.post('/xero', 
  express.raw({ type: 'application/json', limit: '1mb' }),
  verifyXeroWebhook, 
  handleXeroWebhook
); // Webhook receiver

export default router;