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
// Note: This expects express.raw() middleware to be used before this, so req.body is a Buffer
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

  // With express.raw(), req.body is the raw Buffer
  const rawBodyBuffer = req.body;
  
  if (!rawBodyBuffer || !Buffer.isBuffer(rawBodyBuffer)) {
    console.error('Request body is missing or not a Buffer. Ensure express.raw() is used.');
    return res.status(400).send('Bad Request: Missing raw body.');
  }

  // Xero uses HMAC-SHA256 with the webhook key
  // Use the raw body buffer directly
  const hash = crypto.createHmac('sha256', webhookKey).update(rawBodyBuffer).digest('base64');

  if (signature !== hash) {
    console.warn('=== XERO SIGNATURE MISMATCH ===');
    console.warn('Expected:', hash);
    console.warn('Received:', signature);
    console.warn('Raw body length:', rawBodyBuffer.length);
    console.warn('Raw body (first 200 chars):', rawBodyBuffer.toString('utf8').substring(0, 200));
    console.warn('==============================');
    return res.status(403).send('Webhook signature invalid.');
  }
  
  console.log('✓ Xero webhook signature verified successfully');
  next();
};

// Xero webhook handler - logs the response
// Note: req.body is a Buffer from express.raw(), parse it as JSON for logging
export const handleXeroWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Parse the raw body buffer as JSON for logging
    const bodyBuffer = req.body as Buffer;
    let parsedBody;
    try {
      parsedBody = JSON.parse(bodyBuffer.toString('utf8'));
    } catch (e) {
      parsedBody = { error: 'Failed to parse body as JSON', raw: bodyBuffer.toString('utf8') };
    }
    
    console.log('=== XERO WEBHOOK RECEIVED ===');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body (parsed):', JSON.stringify(parsedBody, null, 2));
    console.log('Raw Body (first 500 chars):', bodyBuffer.toString('utf8').substring(0, 500));
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
