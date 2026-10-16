import express from 'express';
import { handleWebhook } from '../controllers/paystackWebhookController';

const router = express.Router();

router.post('/', handleWebhook);

export default router;
