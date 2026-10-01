import { Request, Response } from 'express';
import {
  getOverview,
  getCompletedTasks,
  getTimeSpent,
  parseRange,
  RANGE_SPECS,
} from '../services/analyticsService';

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