import { Request, Response } from 'express';
import pool from '../config/database';
import { BUILTIN_TEMPLATES, findTemplate } from '../data/builtinTemplates';

/** GET /api/onboarding/templates — the list the wizard shows. */
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
 * POST /api/onboarding/seed — body: { template: string }.
 *
 * Rewrites the caller's first personal board so it matches the chosen
 * template: name, columns, and example cards. The board is chosen rather
 * than created so a fresh signup does not end up with two boards — the
 * one ensureDefaultBoard made lazily, plus a new one.
 *
 * Safe only against an empty board; the wizard only shows that check when
 * the board's task_count is zero. If the board has cards, the delete-columns
 * step would re-home them via the tasks trigger, which is not what the user
 * asked for. The client is responsible for that gate.
 */
export const seedBoard = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const slug = (req.body ?? {}).template;
  if (typeof slug !== 'string') {
    return res.status(400).json({ error: 'template is required' });
  }
  const template = findTemplate(slug);
  if (!template) return res.status(400).json({ error: 'Unknown template' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find the caller's first personal board. If none exists yet — rare, but
    // the endpoint is safe — create one so this call is never a no-op.
    const existing = await client.query(
      `SELECT id FROM boards
        WHERE user_id = $1 AND workspace_id IS NULL
        ORDER BY position ASC, created_at ASC
        LIMIT 1`,
      [userId]
    );

    let boardId: string;
    if (existing.rows.length === 0) {
      const created = await client.query(
        'INSERT INTO boards (user_id, name, position) VALUES ($1, $2, 0) RETURNING id',
        [userId, template.name]
      );
      boardId = created.rows[0].id;
    } else {
      boardId = existing.rows[0].id;
      await client.query('UPDATE boards SET name = $1, updated_at = NOW() WHERE id = $2', [
        template.name,
        boardId,
      ]);
    }

    // 'blank' keeps the default board as-is; no column rewrite, no seed tasks.
    if (slug !== 'blank') {
      // Refuse to rewrite a board that already has cards. Protects against a
      // caller that skipped the client gate.
      const cardCount = await client.query(
        'SELECT COUNT(*)::int AS n FROM tasks WHERE board_id = $1',
        [boardId]
      );
      if (cardCount.rows[0].n > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Board already has cards' });
      }

      await client.query('DELETE FROM board_columns WHERE board_id = $1', [boardId]);

      const columnIds = new Map<string, { id: string; stage: string }>();
      for (let i = 0; i < template.columns.length; i += 1) {
        const c = template.columns[i];
        const inserted = await client.query(
          `INSERT INTO board_columns (board_id, name, position, color, stage)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [boardId, c.name, i, c.color, c.stage]
        );
        columnIds.set(c.name, { id: inserted.rows[0].id, stage: c.stage });
      }

      for (const t of template.tasks) {
        const col = columnIds.get(t.column);
        if (!col) continue;
        await client.query(
          `INSERT INTO tasks (user_id, title, priority, status, board_id, column_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [userId, t.title, t.priority, col.stage, boardId, col.id]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ board_id: boardId, template: slug });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error seeding onboarding template:', err);
    res.status(500).json({ error: 'Could not set up the board' });
  } finally {
    client.release();
  }
};
