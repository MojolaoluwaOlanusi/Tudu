import { Request, Response } from 'express';
import pool from '../config/database';
import { BUILTIN_TEMPLATES, findTemplate } from '../data/builtinTemplates';
import { getWorkspaceRole, roleAtLeast } from '../services/boardAccess';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_RE.test(value);

/** Board names are user input, so trim and cap them like createBoard does. */
const normaliseName = (value: unknown, fallback: string, max: number): string => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : fallback;
};

/** GET /api/templates - every built-in template the client may install. */
export const listTemplates = (_req: Request, res: Response) => {
  res.json(
    BUILTIN_TEMPLATES.map((t) => ({
      slug: t.slug,
      name: t.name,
      column_count: t.columns.length,
      example_count: t.tasks.length,
    }))
  );
};

/**
 * POST /api/templates/:slug/install - body: { name?, workspace_id? }.
 *
 * Creates a NEW board from the template. Unlike the onboarding seed (4.2),
 * this never touches an existing board - the user asked for another one,
 * so they get another one. The default name is the template's name; a
 * name override lets them label it ('Sprint 12' rather than 'Team sprint').
 */
export const installTemplate = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { slug } = req.params;
    const { name, workspace_id } = (req.body ?? {}) as {
      name?: unknown;
      workspace_id?: unknown;
    };

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const template = findTemplate(slug);
    if (!template) return res.status(404).json({ error: 'Template not found' });

    let workspaceId: string | null = null;
    if (workspace_id !== undefined && workspace_id !== null && workspace_id !== '') {
      if (!isValidUuid(workspace_id)) {
        return res.status(400).json({ error: 'Invalid workspace id' });
      }
      if (!roleAtLeast(await getWorkspaceRole(userId, workspace_id), 'member')) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      workspaceId = workspace_id;
    }

    const boardName = normaliseName(name, template.name, 255);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Same position logic as createBoard: after everything else in its space.
      const position = await client.query(
        'SELECT COALESCE(MAX(position), -1) + 1 AS next FROM boards ' +
          'WHERE workspace_id IS NOT DISTINCT FROM $1::uuid ' +
          'AND ($1::uuid IS NOT NULL OR user_id = $2)',
        [workspaceId, userId]
      );

      const created = await client.query(
        'INSERT INTO boards (user_id, name, position, workspace_id) ' +
          'VALUES ($1, $2, $3, $4) ' +
          'RETURNING id, user_id, name, position, workspace_id, created_at, updated_at',
        [userId, boardName, position.rows[0].next, workspaceId]
      );
      const boardId: string = created.rows[0].id;

      const columnIds = new Map<string, { id: string; stage: string }>();
      for (let i = 0; i < template.columns.length; i += 1) {
        const c = template.columns[i];
        const inserted = await client.query(
          'INSERT INTO board_columns (board_id, name, position, color, stage) ' +
            'VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [boardId, c.name, i, c.color, c.stage]
        );
        columnIds.set(c.name, { id: inserted.rows[0].id, stage: c.stage });
      }

      for (const t of template.tasks) {
        const col = columnIds.get(t.column);
        if (!col) continue;
        await client.query(
          'INSERT INTO tasks (user_id, title, priority, status, board_id, column_id) ' +
            'VALUES ($1, $2, $3, $4, $5, $6)',
          [userId, t.title, t.priority, col.stage, boardId, col.id]
        );
      }

      await client.query('COMMIT');

      res.status(201).json({
        ...created.rows[0],
        role: 'admin',
        column_count: template.columns.length,
        task_count: template.tasks.length,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error installing template:', error);
    res.status(500).json({ error: 'Could not create the board' });
  }
};
