import express from 'express';
import { verifyQBOWebhook, handleQBOWebhook } from '../controllers/webhookController.js';

const router = express.Router();

router.post(
  '/qbo',
  express.json({ verify: (req, res, buf) => { req.rawBody = buf.toString(); } }),
  verifyQBOWebhook,
  handleQBOWebhook
);

export default router;