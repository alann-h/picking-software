import express from 'express';
import { handleQBOWebhook, testWebhook, verifyQBOWebhook } from '../controllers/webhookController.js';

const router = express.Router();

router.post('/qbo', verifyQBOWebhook, handleQBOWebhook);

router.post('/qbo/test', testWebhook);

export default router;