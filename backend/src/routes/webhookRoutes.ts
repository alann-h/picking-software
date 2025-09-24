import express from 'express';
import { handleQBOWebhook, testWebhook } from '../controllers/webhookController.js';

const router = express.Router();

router.post('/qbo', handleQBOWebhook);
router.post('/qbo/test', testWebhook);

export default router;