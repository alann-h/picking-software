// src/routes/webhookRoutes.ts
import express, { Request, Response, NextFunction } from 'express';
import { Buffer } from 'buffer';
import { verifyQBOWebhook, handleQBOWebhook } from '../controllers/webhookController.js';

const router = express.Router();

router.post(
  '/qbo',
  // Place express.json() with the 'verify' option directly here.
  // This middleware should run first on this route.
  express.json({
    verify: (req: Request, res: Response, buf: Buffer) => {
      // We attach the raw buffer to the request object
      // so it can be used by subsequent middleware.
      (req as any).rawBody = buf.toString();
    },
  }),
  verifyQBOWebhook,
  handleQBOWebhook,
);

export default router;