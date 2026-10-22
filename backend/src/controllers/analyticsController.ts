import { Request, Response } from 'express';
import {
  getOverview,
  getCompletedTasks,
  getTimeSpent,
  getTeamAnalytics,
  parseRange,
  RANGE_SPECS,
} from '../services/analyticsService';
import { getWorkspaceRole } from '../services/boardAccess';
import pool from '../config/database';

/** Shared query parsing: every analytics route needs the timezone offset. */
const parseOffset = (req: Request): number => {
  const raw = (req.query as { timezoneOffset?: unknown }).timezoneOffset;
  const offset = Number(raw);
  if (!Number.isFinite(offset)) return 0;
  return Math.min(Math.max(Math.trunc(offset), -840), 840);
};

const requireUser = (req: Request, res: Response): string | null => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return userId;
};

/** GET /api/analytics/overview - the headline numbers. */
export const overview = async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  try {
    res.json(await getOverview(userId, parseOffset(req)));
  } catch (error) {
    console.error('Error loading analytics overview:', error);
    res.status(500).json({ error: 'Failed to load analytics overview' });
  }
};

/** GET /api/analytics/completed-tasks?range=week|month|quarter */
export const completedTasks = async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  try {
    const spec = RANGE_SPECS[parseRange((req.query as { range?: unknown }).range)];
    res.json(await getCompletedTasks(userId, parseOffset(req), spec));
  } catch (error) {
    console.error('Error loading completed-task analytics:', error);
    res.status(500).json({ error: 'Failed to load completed-task analytics' });
  }
};

/** GET /api/analytics/time-spent?range=week|month|quarter */
export const timeSpent = async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  try {
    const spec = RANGE_SPECS[parseRange((req.query as { range?: unknown }).range)];
    res.json(await getTimeSpent(userId, parseOffset(req), spec));
  } catch (error) {
    console.error('Error loading time analytics:', error);
    res.status(500).json({ error: 'Failed to load time analytics' });
  }
};


/** GET /api/analytics/team/:workspaceId - workspace-scoped analytics. */
export const teamOverview = async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const { workspaceId } = req.params;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(workspaceId)) {
    return res.status(400).json({ error: 'Invalid workspace id' });
  }

  try {
    const role = await getWorkspaceRole(userId, workspaceId);
    if (!role) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const wsRow = await pool.query(
      'SELECT id, name FROM workspaces WHERE id = $1',
      [workspaceId],
    );
    if (wsRow.rows.length === 0) return res.status(404).json({ error: 'Workspace not found' });

    const spec = RANGE_SPECS[parseRange((req.query as { range?: unknown }).range)];
    const data = await getTeamAnalytics(workspaceId, parseOffset(req), spec);

    res.json({
      workspace: {
        id: wsRow.rows[0].id,
        name: wsRow.rows[0].name,
        role,
      },
      range: spec.range,
      overview: data.overview,
      byMember: data.byMember,
      burndown: data.burndown,
    });
  } catch (error) {
    console.error('Error loading team analytics:', error);
    res.status(500).json({ error: 'Failed to load team analytics' });
  }
};
