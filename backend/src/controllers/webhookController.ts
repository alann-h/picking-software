import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { WebhookService } from '../services/webhookService.js';

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

// Xero webhook verification middleware
// Uses req.rawBody which is captured by express.json() verify callback
export const verifyXeroWebhook = (req: Request, res: Response, next: NextFunction) => {
  const signature = req.get('x-xero-signature');
  const webhookKey = process.env.XERO_WEBHOOK_KEY;

  if (!signature) {
    return res.status(401).send('Webhook signature missing.');
  }

  if (!webhookKey) {
    console.error('XERO_WEBHOOK_KEY is not configured.');
    return res.status(500).send('Server configuration error.');
  }

  // Use req.rawBody which is captured by express.json() verify callback before parsing
  const rawBodyBuffer = (req as any).rawBody;
  
  if (!rawBodyBuffer) {
    console.error('Request rawBody is missing. Ensure express.json({ verify: ... }) is used.');
    return res.status(400).send('Bad Request: Missing raw body.');
  }

  // Ensure it's a Buffer
  const buffer = Buffer.isBuffer(rawBodyBuffer) ? rawBodyBuffer : Buffer.from(rawBodyBuffer);

  // Xero uses HMAC-SHA256 with the webhook key
  // Use the raw body buffer directly
  const hash = crypto.createHmac('sha256', webhookKey).update(buffer).digest('base64');

  if (signature !== hash) {
    console.warn('=== XERO SIGNATURE MISMATCH ===');
    console.warn('Expected:', hash);
    console.warn('Received:', signature);
    console.warn('Raw body length:', buffer.length);
    console.warn('Raw body (first 200 chars):', buffer.toString('utf8').substring(0, 200));
    console.warn('==============================');
    return res.status(403).send('Webhook signature invalid.');
  }
  
  console.log('✓ Xero webhook signature verified successfully');
  next();
};

// Xero webhook handler - logs the response
export const handleXeroWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // req.body is already parsed JSON from express.json()
    const rawBodyBuffer = (req as any).rawBody;
    
    console.log('=== XERO WEBHOOK RECEIVED ===');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body (parsed):', JSON.stringify(req.body, null, 2));
    if (rawBodyBuffer) {
      console.log('Raw Body (first 500 chars):', Buffer.isBuffer(rawBodyBuffer) 
        ? rawBodyBuffer.toString('utf8').substring(0, 500)
        : String(rawBodyBuffer).substring(0, 500));
    }
    console.log('============================');
    
    res.status(200).send('OK');
  } catch (err: unknown) {
    console.error('Error handling Xero webhook:', err);
    next(err);
  }
};

// Xero challenge endpoint for "intent to receive" validation
export const handleXeroChallenge = async (req: Request, res: Response) => {
  try {
    const challenge = req.query.challenge as string;
    
    console.log('=== XERO CHALLENGE RECEIVED ===');
    console.log('Challenge:', challenge);
    console.log('Query params:', JSON.stringify(req.query, null, 2));
    console.log('==============================');
    
    if (challenge) {
      // Xero expects the challenge parameter to be echoed back
      res.status(200).send(challenge);
    } else {
      res.status(400).send('Challenge parameter missing');
    }
  } catch (err: unknown) {
    console.error('Error handling Xero challenge:', err);
    res.status(500).send('Internal server error');
  }
};
