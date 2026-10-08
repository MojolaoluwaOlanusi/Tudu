import express from 'express';
import { authenticate } from '../middleware/auth';
import * as workspaceController from '../controllers/workspaceController';

/**
 * Mounted at `/api/workspaces`.
 */
export const workspacesRouter = express.Router();

workspacesRouter.use(authenticate);

/** GET /api/workspaces - List current user's workspaces */
workspacesRouter.get('/', workspaceController.listWorkspaces);

/** POST /api/workspaces - Create a new workspace (owner = admin) */
workspacesRouter.post('/', workspaceController.createWorkspace);

/** POST /api/workspaces/:id/invite - Invite member to workspace */
workspacesRouter.post('/:id/invite', workspaceController.inviteToWorkspace);

/** PATCH /api/workspaces/:id/members/:memberId/role - Update member role */
workspacesRouter.patch('/:id/members/:memberId/role', workspaceController.setMemberRole);

/** DELETE /api/workspaces/:id/members/:memberId - Remove member from workspace */
workspacesRouter.delete('/:id/members/:memberId', workspaceController.removeMember);

