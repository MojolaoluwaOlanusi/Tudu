import { Request, Response } from 'express';
import pool from '../config/database';
import {
  Board,
  BoardColumn,
  CreateBoardInput,
  CreateColumnInput,
  UpdateBoardInput,
  UpdateColumnInput,
  COLUMN_COLORS,
  STAGES,
  Stage,
} from '../types/board';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isValidUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_RE.test(value);

const isStage = (value: unknown): value is Stage =>
  typeof value === 'string' && (STAGES as string[]).includes(value);

const isColor = (value: unknown): value is string =>
  typeof value === 'string' && (COLUMN_COLORS as readonly string[]).includes(value);

const BOARD_COLUMNS = 'id, user_id, name, position, created_at, updated_at';
const COLUMN_FIELDS =
  'id, board_id, name, position, color, stage, wip_limit, created_at, updated_at';

/** Board names are user input: trim and cap them rather than trusting them. */
const normaliseName = (value: unknown, fallback: string, max: number): string | null => {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'string' || !value.trim()) return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
};

/**
 * A `wip_limit` of `null` means "no limit"; anything else must be a whole
 * number of at least 1. Returns a sentinel so the caller can tell "absent"
 * (leave as-is) from "present but invalid" (400).
 */
const parseWipLimit = (
  value: unknown
): { ok: true; value: number | null | undefined } | { ok: false } => {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null || value === '') return { ok: true, value: null };
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return { ok: false };
  return { ok: true, value: n };
};

const boardBelongsToUser = async (boardId: string, userId: string): Promise<boolean> => {
  const result = await pool.query('SELECT 1 FROM boards WHERE id = $1 AND user_id = $2', [
    boardId,
    userId,
  ]);
  return result.rows.length > 0;
};

/** Resolves a column through its board, so ownership is checked in one hop. */
const columnBelongsToUser = async (columnId: string, userId: string): Promise<boolean> => {
  const result = await pool.query(
    `SELECT 1 FROM board_columns bc
     JOIN boards b ON b.id = bc.board_id
     WHERE bc.id = $1 AND b.user_id = $2`,
    [columnId, userId]
  );
  return result.rows.length > 0;
};

/** The columns of a board, with a live card count and WIP flag on each. */
const listColumns = async (boardId: string): Promise<BoardColumn[]> => {
  const result = await pool.query(
    `SELECT ${COLUMN_FIELDS},
            COALESCE(t.cnt, 0)::int AS task_count,
            CASE WHEN bc.wip_limit IS NOT NULL AND COALESCE(t.cnt, 0) >= bc.wip_limit
                 THEN TRUE ELSE FALSE END AS over_wip_limit
     FROM board_columns bc
     LEFT JOIN (
       SELECT column_id, COUNT(*) AS cnt
       FROM tasks
       WHERE column_id IS NOT NULL
       GROUP BY column_id
     ) t ON t.column_id = bc.id
     WHERE bc.board_id = $1
     ORDER BY bc.position ASC, bc.created_at ASC`,
    [boardId]
  );
  return result.rows;
};

const DEFAULT_COLUMNS: { name: string; stage: Stage; color: string }[] = [
  { name: 'To-do', stage: 'todo', color: 'gray' },
  { name: 'Doing', stage: 'doing', color: 'blue' },
  { name: 'Done', stage: 'done', color: 'green' },
];


/**
 * Gives a user a board to work with.
 *
 * Called lazily rather than from a migration, so existing accounts pick one up
 * on their first visit to `GET /api/boards` and nothing has to be backfilled.
 * Idempotent: once a board exists, nothing further is created.
 */
export const ensureDefaultBoard = async (userId: string): Promise<Board> => {
  const existing = await pool.query(
    `SELECT ${BOARD_COLUMNS} FROM boards
     WHERE user_id = $1
     ORDER BY position ASC, created_at ASC
     LIMIT 1`,
    [userId]
  );
  if (existing.rows.length > 0) return existing.rows[0];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const board = await client.query(
      `INSERT INTO boards (user_id, name, position)
       VALUES ($1, 'My board', 0)
       RETURNING ${BOARD_COLUMNS}`,
      [userId]
    );

    for (let i = 0; i < DEFAULT_COLUMNS.length; i += 1) {
      const d = DEFAULT_COLUMNS[i];
      await client.query(
        `INSERT INTO board_columns (board_id, name, position, color, stage)
         VALUES ($1, $2, $3, $4, $5)`,
        [board.rows[0].id, d.name, i, d.color, d.stage]
      );
    }

    await client.query('COMMIT');
    return board.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/** GET /api/boards */
export const getBoards = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await ensureDefaultBoard(userId);

    const result = await pool.query(
      `SELECT ${BOARD_COLUMNS}, COALESCE(c.cnt, 0)::int AS column_count
       FROM boards b
       LEFT JOIN (
         SELECT board_id, COUNT(*) AS cnt FROM board_columns GROUP BY board_id
       ) c ON c.board_id = b.id
       WHERE b.user_id = $1
       ORDER BY b.position ASC, b.created_at ASC`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching boards:', error);
    res.status(500).json({ error: 'Failed to fetch boards' });
  }
};

/** POST /api/boards */
export const createBoard = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name }: CreateBoardInput = req.body ?? {};
    const boardName = normaliseName(name, 'My board', 255);
    if (!boardName) return res.status(400).json({ error: 'Board name is required' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const position = await client.query(
        'SELECT COALESCE(MAX(position), -1) + 1 AS next FROM boards WHERE user_id = $1',
        [userId]
      );
      const created = await client.query(
        `INSERT INTO boards (user_id, name, position)
         VALUES ($1, $2, $3)
         RETURNING ${BOARD_COLUMNS}`,
        [userId, boardName, position.rows[0].next]
      );

      // A new board starts with the same three columns as the original board,
      // so it is immediately usable with no setup step.
      for (let i = 0; i < DEFAULT_COLUMNS.length; i += 1) {
        const d = DEFAULT_COLUMNS[i];
        await client.query(
          `INSERT INTO board_columns (board_id, name, position, color, stage)
           VALUES ($1, $2, $3, $4, $5)`,
          [created.rows[0].id, d.name, i, d.color, d.stage]
        );
      }

      await client.query('COMMIT');
      res.status(201).json(created.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating board:', error);
    res.status(500).json({ error: 'Failed to create board' });
  }
};

/** GET /api/boards/:id */
export const getBoardById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid board id' });
    if (!(await boardBelongsToUser(id, userId))) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const board = await pool.query(`SELECT ${BOARD_COLUMNS} FROM boards WHERE id = $1`, [id]);
    res.json({ ...board.rows[0], columns: await listColumns(id) });
  } catch (error) {
    console.error('Error fetching board:', error);
    res.status(500).json({ error: 'Failed to fetch board' });
  }
};

/** PUT /api/boards/:id */
export const updateBoard = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid board id' });

    const body: UpdateBoardInput = req.body ?? {};
    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.name !== undefined) {
      const name = normaliseName(body.name, '', 255);
      if (!name) return res.status(400).json({ error: 'Board name cannot be empty' });
      values.push(name);
      // `push` already advanced `values`, so the new slot is `values.length`.
      updates.push(`name = $${values.length}`);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    values.push(id, userId);
    const result = await pool.query(
      `UPDATE boards SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length - 1} AND user_id = $${values.length}
       RETURNING ${BOARD_COLUMNS}`,
      values
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Board not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating board:', error);
    res.status(500).json({ error: 'Failed to update board' });
  }
};

/**
 * DELETE /api/boards/:id
 *
 * Refuses to delete a user's last board, so there is always somewhere for new
 * tasks to land. Columns and their cards cascade away with it.
 */
export const deleteBoard = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid board id' });

    const count = await pool.query(
      'SELECT COUNT(*)::int AS n FROM boards WHERE user_id = $1',
      [userId]
    );
    if (count.rows[0].n <= 1) {
      return res.status(400).json({ error: 'You need at least one board' });
    }

    const result = await pool.query(
      'DELETE FROM boards WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Board not found' });

    res.json({ message: 'Board deleted successfully' });
  } catch (error) {
    console.error('Error deleting board:', error);
    res.status(500).json({ error: 'Failed to delete board' });
  }
};

/** GET /api/boards/:boardId/columns */
export const getColumns = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { boardId } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // A brand new account has no board yet; make one rather than 404.
    if (boardId === 'default') {
      const board = await ensureDefaultBoard(userId);
      return res.json(await listColumns(board.id));
    }

    if (!isValidUuid(boardId)) return res.status(400).json({ error: 'Invalid board id' });

    if (!(await boardBelongsToUser(boardId, userId))) {
      return res.status(404).json({ error: 'Board not found' });
    }
    res.json(await listColumns(boardId));
  } catch (error) {
    console.error('Error fetching columns:', error);
    res.status(500).json({ error: 'Failed to fetch columns' });
  }
};

/** POST /api/boards/:boardId/columns */
export const createColumn = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { boardId } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!isValidUuid(boardId)) return res.status(400).json({ error: 'Invalid board id' });
    if (!(await boardBelongsToUser(boardId, userId))) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const body: CreateColumnInput = req.body ?? {};
    const name = normaliseName(body.name, 'New column', 100);
    if (!name) return res.status(400).json({ error: 'Column name is required' });
    if (body.stage !== undefined && !isStage(body.stage)) {
      return res.status(400).json({ error: 'Stage must be todo, doing or done' });
    }
    if (body.color !== undefined && !isColor(body.color)) {
      return res.status(400).json({ error: 'Unknown colour' });
    }
    const wip = parseWipLimit(body.wip_limit);
    if (!wip.ok) return res.status(400).json({ error: 'WIP limit must be a whole number of 1 or more' });

    const position = await pool.query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next FROM board_columns WHERE board_id = $1',
      [boardId]
    );

    const result = await pool.query(
      `INSERT INTO board_columns (board_id, name, position, color, stage, wip_limit)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${COLUMN_FIELDS}`,
      [
        boardId,
        name,
        position.rows[0].next,
        body.color ?? 'gray',
        body.stage ?? 'todo',
        wip.value ?? null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating column:', error);
    res.status(500).json({ error: 'Failed to create column' });
  }
};

/** PUT /api/columns/:id */
export const updateColumn = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid column id' });
    if (!(await columnBelongsToUser(id, userId))) {
      return res.status(404).json({ error: 'Column not found' });
    }

    const body: UpdateColumnInput = req.body ?? {};
    const updates: string[] = [];
    const values: unknown[] = [];

    // Each `push` already advanced `values`, so the new slot is `values.length`
    // - not `length + 1`, which would point at a slot holding the id/owner.
    if (body.name !== undefined) {
      const name = normaliseName(body.name, '', 100);
      if (!name) return res.status(400).json({ error: 'Column name cannot be empty' });
      values.push(name);
      updates.push(`name = $${values.length}`);
    }
    if (body.stage !== undefined) {
      if (!isStage(body.stage)) {
        return res.status(400).json({ error: 'Stage must be todo, doing or done' });
      }
      values.push(body.stage);
      updates.push(`stage = $${values.length}`);
    }
    if (body.color !== undefined) {
      if (!isColor(body.color)) return res.status(400).json({ error: 'Unknown colour' });
      values.push(body.color);
      updates.push(`color = $${values.length}`);
    }
    if (body.wip_limit !== undefined) {
      const wip = parseWipLimit(body.wip_limit);
      if (!wip.ok) {
        return res.status(400).json({ error: 'WIP limit must be a whole number of 1 or more' });
      }
      values.push(wip.value ?? null);
      updates.push(`wip_limit = $${values.length}`);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      values.push(id);
      const result = await client.query(
        `UPDATE board_columns SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${values.length}
         RETURNING ${COLUMN_FIELDS}`,
        values
      );
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Column not found' });
      }

      // Changing the stage moves every card in it, so `tasks.status` keeps
      // mirroring where the card actually is. Ownership is already proven by
      // `columnBelongsToUser` above, which resolved the column via its board.
      if (body.stage !== undefined) {
        await client.query(
          'UPDATE tasks SET status = $1, updated_at = NOW() WHERE column_id = $2',
          [body.stage, id]
        );
      }

      await client.query('COMMIT');
      res.json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating column:', error);
    res.status(500).json({ error: 'Failed to update column' });
  }
};

/**
 * DELETE /api/columns/:id
 *
 * Cards are never destroyed by removing a column. They are moved to the first
 * remaining column of the same stage - so a "Done" card stays done and the
 * analytics totals do not shift - and only if no such column exists do they
 * fall back to whatever column is left.
 */
export const deleteColumn = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid column id' });

    const existing = await pool.query(
      `SELECT bc.id, bc.board_id, bc.stage
       FROM board_columns bc
       JOIN boards b ON b.id = bc.board_id
       WHERE bc.id = $1 AND b.user_id = $2`,
      [id, userId]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Column not found' });

    const column = existing.rows[0];

    const remaining = await pool.query(
      `SELECT id, stage FROM board_columns
       WHERE board_id = $1 AND id <> $2
       ORDER BY position ASC, created_at ASC`,
      [column.board_id, id]
    );
    if (remaining.rows.length === 0) {
      return res.status(400).json({ error: 'A board needs at least one column' });
    }

    const sameStage = remaining.rows.find((r: { stage: string }) => r.stage === column.stage);
    const fallback = sameStage ?? remaining.rows[0];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const moved = await client.query(
        `UPDATE tasks
         SET column_id = $1, status = $2, updated_at = NOW()
         WHERE column_id = $3
         RETURNING id`,
        [fallback.id, fallback.stage, id]
      );

      await client.query('DELETE FROM board_columns WHERE id = $1', [id]);

      // Close the gap so positions stay a clean 0..n-1.
      await client.query(
        `UPDATE board_columns SET position = v.pos, updated_at = NOW()
         FROM (
           SELECT id, ROW_NUMBER() OVER (ORDER BY position ASC, created_at ASC) - 1 AS pos
           FROM board_columns
           WHERE board_id = $1
         ) v
         WHERE board_columns.id = v.id`,
        [column.board_id]
      );

      await client.query('COMMIT');
      res.json({
        message: 'Column deleted successfully',
        moved_tasks: moved.rows.length,
        fallback_column_id: fallback.id,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting column:', error);
    res.status(500).json({ error: 'Failed to delete column' });
  }
};

/**
 * PUT /api/columns/reorder
 *
 * The body is the board's complete column list in its new order. Anything
 * missing or foreign is rejected rather than silently ignored, so a stale
 * client cannot quietly reorder the wrong board.
 */
export const reorderColumns = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { column_ids }: { column_ids?: unknown } = req.body ?? {};
    if (!Array.isArray(column_ids) || column_ids.length === 0) {
      return res.status(400).json({ error: 'column_ids must be a non-empty array' });
    }
    if (column_ids.some((c) => !isValidUuid(c))) {
      return res.status(400).json({ error: 'Each column id must be a UUID' });
    }
    if (new Set(column_ids).size !== column_ids.length) {
      return res.status(400).json({ error: 'column_ids must not contain duplicates' });
    }

    const owned = await pool.query(
      `SELECT bc.id, bc.board_id
       FROM board_columns bc
       JOIN boards b ON b.id = bc.board_id
       WHERE bc.id = ANY($1::uuid[]) AND b.user_id = $2`,
      [column_ids, userId]
    );
    if (owned.rows.length !== column_ids.length) {
      return res.status(404).json({ error: 'One or more columns were not found' });
    }

    const boardId = owned.rows[0].board_id;
    if (owned.rows.some((r: { board_id: string }) => r.board_id !== boardId)) {
      return res.status(400).json({ error: 'All columns must belong to the same board' });
    }

    const all = await pool.query(
      'SELECT id FROM board_columns WHERE board_id = $1',
      [boardId]
    );
    const expected = new Set(all.rows.map((r: { id: string }) => r.id));
    if (expected.size !== column_ids.length || column_ids.some((c) => !expected.has(c))) {
      return res.status(400).json({ error: 'column_ids must list every column on the board' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < column_ids.length; i += 1) {
        await client.query(
          'UPDATE board_columns SET position = $1, updated_at = NOW() WHERE id = $2',
          [i, column_ids[i]]
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    res.json(await listColumns(boardId));
  } catch (error) {
    console.error('Error reordering columns:', error);
    res.status(500).json({ error: 'Failed to reorder columns' });
  }
};


