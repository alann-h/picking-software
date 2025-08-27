import crypto from 'crypto';
import { fetchSingleCustomer, saveCustomers } from '../services/customerService.js';

// Middleware to verify the webhook signature from QuickBooks
const verifyQBOWebhook = (req, res, next) => {
  const signature = req.get('intuit-signature');
  const webhookToken = process.env.QBO_WEBHOOK_VERIFIER_TOKEN; // Store this in your .env

  if (!signature) {
    return res.status(401).send('Webhook signature missing.');
  }

  const hash = crypto.createHmac('sha256', webhookToken).update(req.rawBody).digest('base64');

  if (signature !== hash) {
    return res.status(403).send('Webhook signature invalid.');
  }
  next();
};


const handleQBOWebhook = async (req, res, next) => {
  try {
    const { eventNotifications } = req.body;
    const companyId = eventNotifications[0].realmId; // The company this event is for

    for (const notification of eventNotifications) {
      for (const event of notification.dataChangeEvent.entities) {
        if (event.name === 'Customer') {
          console.log(`[Webhook] Received ${event.operation} event for Customer ${event.id}`);

          // Fetch the single updated/created customer
          const customer = await fetchSingleCustomer(companyId, event.id, 'qbo');

          if (customer) {
            // Use your existing save function to upsert this single customer
            await saveCustomers([customer], companyId);
          }
          // Note: You would add logic here to handle 'Delete' operations
        }
      }
    }
    res.status(200).send('OK');
  } catch (err) {
    next(err);
  }
};

export { verifyQBOWebhook, handleQBOWebhook };