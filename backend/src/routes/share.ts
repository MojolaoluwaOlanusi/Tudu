import express from 'express';
import { authenticate } from '../middleware/auth';
import * as shareController from '../controllers/shareController';

/** Mounted at /api/share */
const router = express.Router();
router.use(authenticate);

router.post('/', shareController.createShare);
router.get('/', shareController.getMyShares);
router.post('/accept', shareController.acceptShare);
router.post('/decline', shareController.declineShare);

export default router;

/** Mounted at /api/shared-lists */
export const sharedListsRouter = express.Router();
sharedListsRouter.use(authenticate);

sharedListsRouter.get('/', shareController.getSharedWithMe);
sharedListsRouter.get('/:id', shareController.getSharedList);
sharedListsRouter.delete('/:id', shareController.removeSharedList);
sharedListsRouter.patch('/:id/tasks/:taskId', shareController.updateSharedTask);