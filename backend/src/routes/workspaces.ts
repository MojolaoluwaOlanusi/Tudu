import express from 'express';
import { authenticate } from '../middleware/auth';
import * as workspaceController from '../controllers/workspaceController';

/** Mounted at /api/workspaces */
const router = express.Router();
router.use(authenticate);

router.get('/', workspaceController.getWorkspaces);
router.post('/', workspaceController.createWorkspace);

// Static path first so "invites" is never read as a workspace id.
router.get('/invites', workspaceController.getMyInvites);

router.post('/:id/respond', workspaceController.respondToInvite);
router.get('/:id/members', workspaceController.getMembers);
router.post('/:id/members', workspaceController.inviteMember);
router.put('/:id/members/:userId', workspaceController.updateMemberRole);
router.delete('/:id/members/:userId', workspaceController.removeMember);

export default router;
