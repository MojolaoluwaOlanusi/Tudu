import { Request, Response } from 'express';
import pool from '../config/database';
import { BUILTIN_TEMPLATES, findTemplate } from '../data/builtinTemplates';
import {
  getBoardRole,
  getWorkspaceRole,
  roleAtLeast,
} from '../services/boardAccess';
import type {
  BuiltinTemplateColumn,
  BuiltinTemplateTask,
} from '../data/builtinTemplates';

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


/* ====================================================================== */
/* Feature 5.6 - marketplace                                              */
/* ====================================================================== */

/** GET /api/templates/marketplace - approved templates, most installed first. */
export const listMarketplace = async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT m.id, m.name, m.description, m.category, m.install_count, ' +
        '       m.created_at, u.name AS author_name ' +
        'FROM marketplace_templates m ' +
        'JOIN users u ON u.id = m.author_id ' +
        'WHERE m.status = \'approved\' ' +
        'ORDER BY m.install_count DESC, m.created_at DESC',
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error listing marketplace:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
};

/** GET /api/templates/mine - the caller's published templates, all statuses. */
export const listMyTemplates = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      'SELECT id, name, description, category, status, install_count, created_at ' +
        'FROM marketplace_templates WHERE author_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error listing my templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
};

/**
 * POST /api/templates/publish - body: { board_id, name, description, category }.
 *
 * Snapshots the board's columns (name, stage, colour) and its 15 most
 * recent live tasks as the template definition. Status defaults to
 * approved; admin moderation is a future revision.
 */
export const publishTemplate = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { board_id, name, description, category } = (req.body ?? {}) as Record<
      string,
      unknown
    >;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (typeof board_id !== 'string' || !isValidUuid(board_id)) {
      return res.status(400).json({ error: 'Invalid board id' });
    }

    const role = await getBoardRole(userId, board_id);
    if (!roleAtLeast(role, 'member')) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const columns = await pool.query(
      'SELECT name, stage, color FROM board_columns ' +
        'WHERE board_id = $1 ORDER BY position ASC',
      [board_id]
    );
    const tasks = await pool.query(
      'SELECT t.title, t.priority, c.name AS column ' +
        'FROM tasks t JOIN board_columns c ON t.column_id = c.id ' +
        'WHERE t.board_id = $1 AND t.deleted_at IS NULL LIMIT 15',
      [board_id]
    );

    const definition = {
      columns: columns.rows,
      tasks: tasks.rows,
    };

    const tplName =
      typeof name === 'string' && name.trim()
        ? name.trim().slice(0, 255)
        : 'Untitled template';
    const tplDesc = typeof description === 'string' ? description.slice(0, 500) : null;
    const tplCat =
      typeof category === 'string' && category.trim()
        ? category.trim().slice(0, 50)
        : 'General';

    const result = await pool.query(
      'INSERT INTO marketplace_templates ' +
        '(author_id, name, description, category, definition) ' +
        'VALUES ($1, $2, $3, $4, $5) ' +
        'RETURNING id, name, status, created_at',
      [userId, tplName, tplDesc, tplCat, JSON.stringify(definition)]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error publishing template:', error);
    res.status(500).json({ error: 'Failed to publish template' });
  }
};

/**
 * POST /api/templates/marketplace/:id/install.
 *
 * Creates a new board from the stored definition. Increments the install
 * count and records the install in template_installs, so a repeat install
 * by the same user still counts once in the (template_id, user_id) key.
 */
export const installMarketplaceTemplate = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { name, workspace_id } = (req.body ?? {}) as {
      name?: unknown;
      workspace_id?: unknown;
    };

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid template id' });

    const tplRow = await pool.query(
      'SELECT * FROM marketplace_templates WHERE id = $1 AND status = \'approved\'',
      [id]
    );
    if (tplRow.rows.length === 0) return res.status(404).json({ error: 'Template not found' });
    const tpl = tplRow.rows[0];
    const definition = tpl.definition as {
      columns: BuiltinTemplateColumn[];
      tasks: BuiltinTemplateTask[];
    };

    let workspaceId: string | null = null;
    if (workspace_id !== undefined && workspace_id !== null && workspace_id !== '') {
      if (typeof workspace_id !== 'string' || !isValidUuid(workspace_id)) {
        return res.status(400).json({ error: 'Invalid workspace id' });
      }
      if (!roleAtLeast(await getWorkspaceRole(userId, workspace_id), 'member')) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      workspaceId = workspace_id;
    }

    const boardName = normaliseName(name, tpl.name, 255);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

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
      for (let i = 0; i < definition.columns.length; i += 1) {
        const c = definition.columns[i];
        const inserted = await client.query(
          'INSERT INTO board_columns (board_id, name, position, color, stage) ' +
            'VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [boardId, c.name, i, c.color, c.stage]
        );
        columnIds.set(c.name, { id: inserted.rows[0].id, stage: c.stage });
      }

      for (const t of definition.tasks) {
        const col = columnIds.get(t.column);
        if (!col) continue;
        await client.query(
          'INSERT INTO tasks (user_id, title, priority, status, board_id, column_id) ' +
            'VALUES ($1, $2, $3, $4, $5, $6)',
          [userId, t.title, t.priority, col.stage, boardId, col.id]
        );
      }

      await client.query(
        'UPDATE marketplace_templates SET install_count = install_count + 1 WHERE id = $1',
        [id]
      );
      await client.query(
        'INSERT INTO template_installs (template_id, user_id) ' +
          'VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [id, userId]
      );

      await client.query('COMMIT');

      res.status(201).json({
        ...created.rows[0],
        role: 'admin',
        column_count: definition.columns.length,
        task_count: definition.tasks.length,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error installing marketplace template:', error);
    res.status(500).json({ error: 'Could not create the board' });
  }
};

/** DELETE /api/templates/:id - author unpublishes their own template. */
export const unpublishTemplate = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid template id' });

    const result = await pool.query(
      'DELETE FROM marketplace_templates WHERE id = $1 AND author_id = $2 RETURNING id',
      [id, userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Template not found' });

    res.json({ message: 'Template removed' });
  } catch (error) {
    console.error('Error unpublishing template:', error);
    res.status(500).json({ error: 'Failed to remove template' });
  }
};
