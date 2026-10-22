import express from 'express';
import { authenticate } from '../middleware/auth';
import { requireFeature } from '../middleware/requireFeature';
import * as timeController from '../controllers/timeController';

/** Mounted at /api/time. All endpoints are Pro-gated. */
const router = express.Router();
router.use(authenticate);
router.use(requireFeature('time.tracking'));

router.get('/active', timeController.getActive);
router.post('/start', timeController.start);
router.post('/stop', timeController.stop);
router.get('/entries', timeController.listEntries);
router.post('/entries', timeController.createManual);
router.delete('/entries/:id', timeController.deleteEntry);
router.get('/report', timeController.report);

export default router;
