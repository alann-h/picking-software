import express, { Request, Response } from 'express';
import { Buffer } from 'buffer';
import { verifyQBOWebhook, handleQBOWebhook } from '../controllers/webhookController.js';

const router = express.Router();

router.post(
  '/qbo',
  express.json({
    verify: (req: Request, res: Response, buf: Buffer) => {
      req.rawBody = buf.toString();
    },
  }),
  verifyQBOWebhook,
  handleQBOWebhook,
);

export default router;