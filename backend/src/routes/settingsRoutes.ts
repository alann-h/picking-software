import { Router } from 'express';
import { getDeliveryRates, updateDeliveryRates } from '../controllers/settingsController.js';
import { isAuthenticated } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/rates', isAuthenticated, getDeliveryRates);
router.put('/rates', isAuthenticated, updateDeliveryRates);

export default router;

