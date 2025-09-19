import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { handleQBOEventNotifications } from '../services/qboWebhookService.js';

// Middleware to verify the webhook signature from QuickBooks
export const verifyQBOWebhook = (req: Request, res: Response, next: NextFunction) => {
  const signature = req.get('intuit-signature');
  const webhookToken = process.env.QBO_WEBHOOK_VERIFIER_TOKEN;

  if (!signature) {
    return res.status(401).send('Webhook signature missing.');
  }

  if (!webhookToken) {
    console.error('QBO_WEBHOOK_VERIFIER_TOKEN is not configured.');
    return res.status(500).send('Server configuration error.');
  }

  if (!req.rawBody) {
    console.error('Request rawBody is missing. Ensure express.json({ verify: ... }) is used.');
    return res.status(400).send('Bad Request: Missing raw body.');
  }

  const hash = crypto.createHmac('sha256', webhookToken).update(req.rawBody).digest('base64');

  if (signature !== hash) {
    return res.status(403).send('Webhook signature invalid.');
  }
  next();
};


export const handleQBOWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventNotifications } = req.body;
    const companyId = "fbba99e2-c99e-429e-87b2-c510c1f680c7";

    await handleQBOEventNotifications(eventNotifications, companyId); // Call the new service function

    res.status(200).send('OK');
  } catch (err: any) {
    console.error('Error handling QBO webhook:', err);
    next(err);
  }
};