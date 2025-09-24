import express from 'express';
import { handleQBOWebhook, testWebhook, verifyQBOWebhook } from '../controllers/webhookController.js';

const router = express.Router();

// Add basic logging for all webhook requests
router.use('/qbo', (req, res, next) => {
  console.log('=== WEBHOOK REQUEST RECEIVED ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('Raw Body Length:', req.rawBody?.length);
  console.log('Timestamp:', new Date().toISOString());
  console.log('================================');
  next();
});

router.post('/qbo', verifyQBOWebhook, handleQBOWebhook);

router.post('/qbo/test', testWebhook);

export default router;