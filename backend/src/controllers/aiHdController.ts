import { Request, Response } from 'express';
import { generateSubtasks, AiError, MAX_SUBTASKS } from '../services/aiService';

/**
 * The Pro-only HD breakdown.
 *
 * Same shape as the free breakdown - a list of sub-task titles - but
 * the count ceiling is raised. MAX_SUBTASKS (12) is what the prompt
 * already supports; the free endpoint caps at 6.
 */
const HD_COUNT = Math.min(12, MAX_SUBTASKS);

export const breakdownHd = async (req: Request, res: Response) => {
  try {
    const rawTitle = (req.body ?? {}).title;
    if (typeof rawTitle !== 'string' || !rawTitle.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }
    const title = rawTitle.trim().slice(0, 500);

    const subtasks = await generateSubtasks(title, HD_COUNT);
    res.json({ subtasks, count: subtasks.length, hd: true });
  } catch (error) {
    if (error instanceof AiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Error generating HD subtasks:', error);
    res.status(500).json({ error: 'Failed to generate sub-tasks' });
  }
};
