import crypto from 'crypto';

// Middleware to verify the webhook signature from QuickBooks
const verifyQBOWebhook = (req, res, next) => {
  const signature = req.get('intuit-signature');
  const webhookToken = process.env.QBO_WEBHOOK_VERIFIER_TOKEN;

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
    const companyId = eventNotifications[0].realmId;

    for (const notification of eventNotifications) {
      for (const event of notification.dataChangeEvent.entities) {
        console.log(event);
      }
    }
    res.status(200).send('OK');
  } catch (err) {
    next(err);
  }
};

export { verifyQBOWebhook, handleQBOWebhook };