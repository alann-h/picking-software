import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

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
    console.log('eventNotifications', eventNotifications);

    if (!eventNotifications || !Array.isArray(eventNotifications)) {
        console.warn('Webhook received without eventNotifications');
        return res.status(200).send('OK'); // Acknowledge webhook even if empty
    }
    
    // Process notifications
    for (const notification of eventNotifications) {
      if (notification.dataChangeEvent && notification.dataChangeEvent.entities) {
        for (const event of notification.dataChangeEvent.entities) {
          console.log(`Processing webhook event for company ${notification.realmId}:`, event);
          // TODO: Implement logic to handle the event (e.g., update local database)
        }
      }
    }
    res.status(200).send('OK');
  } catch (err: any) {
    console.error('Error handling QBO webhook:', err);
    next(err);
  }
};

export const testWebhook = async (req: Request, res: Response, next: NextFunction) => {
  console.log('=== QBO WEBHOOK TEST ENDPOINT ===');
  console.log('Timestamp:', new Date().toISOString());
  
  // QuickBooks specific headers
  console.log('QBO Headers:');
  console.log('  - intuit-signature:', req.get('intuit-signature'));
  console.log('  - intuit-notification-schema-version:', req.get('intuit-notification-schema-version'));
  console.log('  - intuit-t-id:', req.get('intuit-t-id'));
  console.log('  - intuit-created-time:', req.get('intuit-created-time'));
  console.log('  - user-agent:', req.get('user-agent'));
  
  // Test signature verification
  console.log('\n=== SIGNATURE VERIFICATION TEST ===');
  const signature = req.get('intuit-signature');
  const webhookToken = process.env.QBO_WEBHOOK_VERIFIER_TOKEN || '56483a81-1614-4643-babb-55fa292f5379';
  
  if (!signature) {
    console.log('❌ No signature provided');
  } else if (!req.rawBody) {
    console.log('❌ No raw body available for verification');
  } else {
    const hash = crypto.createHmac('sha256', webhookToken).update(req.rawBody).digest('base64');
    const isValid = signature === hash;
    
    console.log(`  - Provided signature: ${signature}`);
    console.log(`  - Calculated signature: ${hash}`);
    console.log(`  - Verification result: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
    
    if (!isValid) {
      console.log('⚠️  Signature verification failed - this would be rejected in production');
    }
  }
  
  console.log('\nFull Headers:', req.headers);
  console.log('\nBody:', JSON.stringify(req.body, null, 2));
  console.log('\nRaw Body:', req.rawBody);
  
  // Parse and display event details
  if (req.body.eventNotifications) {
    console.log('\n=== EVENT DETAILS ===');
    req.body.eventNotifications.forEach((notification: any, index: number) => {
      console.log(`Notification ${index + 1}:`);
      console.log(`  - Realm ID: ${notification.realmId}`);
      if (notification.dataChangeEvent?.entities) {
        notification.dataChangeEvent.entities.forEach((entity: any, entityIndex: number) => {
          console.log(`  - Entity ${entityIndex + 1}:`);
          console.log(`    - Name: ${entity.name}`);
          console.log(`    - ID: ${entity.id}`);
          console.log(`    - Operation: ${entity.operation}`);
          console.log(`    - Last Updated: ${entity.lastUpdated}`);
        });
      }
    });
  }
  
  console.log('================================');
  
  res.status(200).send('OK - Webhook received and logged');
};