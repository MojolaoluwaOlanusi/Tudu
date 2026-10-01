import express from 'express';
import { authenticate } from '../middleware/auth';
import * as pomodoroController from '../controllers/pomodoroController';

const router = express.Router();

router.use(authenticate);

router.post('/start', pomodoroController.startSession);
router.post('/complete', pomodoroController.completeSession);
router.get('/active', pomodoroController.getActiveSession);
router.get('/stats', pomodoroController.getStats);

export default router;