import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  getNotifications,
  updateNotifications,
} from '../controllers/notificationController';

/** Mounted at /api/users/me/notifications - JWT auth. */
const router = express.Router();
router.use(authenticate);

router.get('/', getNotifications);
router.put('/', updateNotifications);

export default router;
