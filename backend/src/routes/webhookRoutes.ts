import express from 'express';
import { verifyQBOWebhook, handleQBOWebhook, handleStripeWebhook, handleXeroChallenge, handleXeroWebhook, verifyXeroWebhook } from '../controllers/webhookController.js';

const router = express.Router();

router.post('/qbo', express.json({
  verify: (req: any, res, buf) => {
    (req as any).rawBody = buf;
  }
}), verifyQBOWebhook, handleQBOWebhook);

router.get('/xero', handleXeroChallenge);
router.post('/xero', express.json({
  verify: (req: any, res, buf) => {
    (req as any).rawBody = buf;
  }
}), verifyXeroWebhook, handleXeroWebhook);

router.post('/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

export default router;