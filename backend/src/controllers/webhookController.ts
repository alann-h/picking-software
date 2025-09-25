import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { WebhookService } from '../services/webhookService.js';
import { ProductSyncService } from '../services/productSyncService.js';

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

    if (!eventNotifications || !Array.isArray(eventNotifications)) {
        console.warn('Webhook received without eventNotifications');
        return res.status(200).send('OK');
    }
    
    // Process webhook notifications using the webhook service
    await WebhookService.processQBOWebhook(eventNotifications);
    
    res.status(200).send('OK');
  } catch (err: unknown) {
    console.error('Error handling QBO webhook:', err);
    next(err);
  }
};

export const testWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await WebhookService.testWebhook();
    res.json(result);
  } catch (err: unknown) {
    console.error('Error in test webhook:', err);
    next(err);
  }
};

export const syncProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.session.companyId;
    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log(`Manual product sync requested for company: ${companyId}`);
    const result = await ProductSyncService.syncAllProductsFromQBO(companyId);
    
    res.json({
      message: 'Product sync completed',
      result
    });
  } catch (err: unknown) {
    console.error('Manual sync error:', err);
    next(err);
  }
};

export const syncAllCompanies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // This endpoint should be protected and only accessible by admins
    console.log('Manual sync for all companies requested');
    const results = await ProductSyncService.syncAllCompanies();
    
    res.json({
      message: 'All companies sync completed',
      results
    });
  } catch (err: unknown) {
    console.error('All companies sync error:', err);
    next(err);
  }
};
