import express from 'express';
import { handleQBOWebhook } from '../controllers/webhookController.js';

const router = express.Router();

router.post('/qbo', handleQBOWebhook);

export default router;