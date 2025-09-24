import express from 'express';
import { handleQBOWebhook, verifyQBOWebhook } from '../controllers/webhookController.js';

const router = express.Router();

router.post('/qbo', verifyQBOWebhook, handleQBOWebhook);

export default router;