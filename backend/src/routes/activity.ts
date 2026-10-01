import express from 'express';
import { authenticate } from '../middleware/auth';
import * as activityController from '../controllers/activityController';

/** Mounted at /api/activity */
const router = express.Router();
router.use(authenticate);

router.get('/', activityController.getActivity);
router.get('/:taskId', activityController.getTaskActivity);

export default router;