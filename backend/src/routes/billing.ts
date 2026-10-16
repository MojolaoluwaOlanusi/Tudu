import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  checkout,
  getSubscription,
  cancelSubscription,
  getPaymentHistory,
} from '../controllers/billingController';

const router = express.Router();
router.use(authenticate);

router.post('/checkout', checkout);
router.get('/subscription', getSubscription);
router.post('/cancel', cancelSubscription);
router.get('/history', getPaymentHistory);

export default router;
