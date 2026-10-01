import { Request, Response } from 'express';
import {
  generateSubtasks,
  getProviderName,
  AiError,
  MAX_SUBTASKS,
  MIN_SUBTASKS,
} from '../services/aiService';

const MAX_TITLE_LENGTH = 200;

/** GET /api/ai/status - which provider is configured, and is it usable? */
export const getAiStatus = async (_req: Request, res: Response) => {
  const provider = getProviderName();
  const envVar =
    provider === 'gemini'
      ? 'GEMINI_API_KEY'
      : provider === 'groq'
        ? 'GROQ_API_KEY'
        : 'OLLAMA_URL (optional)';

  const configured =
    provider === 'ollama' ||
    Boolean(
      provider === 'gemini'
        ? process.env.GEMINI_API_KEY
        : process.env.GROQ_API_KEY
    );

  res.json({ provider, configured, envVar });
};

/**
 * POST /api/ai/breakdown
 * Suggest sub-tasks for a task title.
 */
export const breakdownTask = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { title, count } = req.body as { title?: unknown; count?: unknown };

  if (typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'A task title is required' });
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return res
      .status(400)
      .json({ error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer` });
  }

  const requested = typeof count === 'number' && Number.isFinite(count) ? count : 6;

  try {
    const subtasks = await generateSubtasks(title, requested);

    res.json({
      title: title.trim(),
      subtasks,
      provider: getProviderName(),
      count: subtasks.length,
    });
  } catch (error) {
    if (error instanceof AiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Error breaking down task:', error);
    res.status(500).json({ error: 'Failed to generate a breakdown' });
  }
};

export { MIN_SUBTASKS, MAX_SUBTASKS };