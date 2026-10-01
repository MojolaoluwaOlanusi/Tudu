import express from 'express';
import { authenticate } from '../middleware/auth';
import * as analyticsController from '../controllers/analyticsController';

const router = express.Router();

// Every analytics route is scoped to the signed-in user.
router.use(authenticate);

router.get('/overview', analyticsController.overview);
router.get('/completed-tasks', analyticsController.completedTasks);
router.get('/time-spent', analyticsController.timeSpent);

export default router;