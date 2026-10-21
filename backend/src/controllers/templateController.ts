import { Request, Response } from 'express';
import pool from '../config/database';
import { BUILTIN_TEMPLATES, findTemplate } from '../data/builtinTemplates';
import {
  initializeTransaction,
  refundTransaction,
  verifyTransaction,
  PaystackError,
} from '../services/paystackService';

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
        '       m.price_kobo::int AS price_kobo, ' +
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
    const { board_id, name, description, category, price_kobo, rental_days } = (req.body ?? {}) as Record<
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

    const priceKobo =
      typeof price_kobo === 'number' && Number.isFinite(price_kobo)
        ? Math.floor(price_kobo)
        : 0;
    const rentalDays =
      typeof rental_days === 'number' && Number.isFinite(rental_days)
        ? Math.floor(rental_days)
        : 0;
    if (priceKobo !== 0 && priceKobo < 10000) {
      return res.status(400).json({ error: 'Minimum price is ₦100' });
    }
    if (priceKobo > 0) {
      const publisher = await pool.query(
        'SELECT payout_status FROM publisher_profiles WHERE user_id = $1',
        [userId]
      );
      if (publisher.rows.length === 0 || publisher.rows[0].payout_status !== 'active') {
        return res.status(400).json({
          error: 'Set up your publisher account before publishing paid templates',
        });
      }
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
        '(author_id, name, description, category, definition, price_kobo, rental_days) ' +
        'VALUES ($1, $2, $3, $4, $5, $6, $7) ' +
        'RETURNING id, name, status, created_at, price_kobo, rental_days',
      [userId, tplName, tplDesc, tplCat, JSON.stringify(definition), priceKobo, rentalDays]
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
    const { name, workspace_id, reference } = (req.body ?? {}) as {
      name?: unknown;
      workspace_id?: unknown;
      reference?: unknown;
    };

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid template id' });

    const tplRow = await pool.query(
      'SELECT id, author_id, name, definition, status, install_count, ' +
        '       price_kobo::int AS price_kobo, rental_days ' +
        'FROM marketplace_templates WHERE id = $1 AND status = \'approved\'',
      [id]
    );
    if (tplRow.rows.length === 0) return res.status(404).json({ error: 'Template not found' });
    const tpl = tplRow.rows[0];

    // Paid template: verify purchase (or exempt the author).
    if (tpl.price_kobo > 0 && tpl.author_id !== userId) {
      const existing = await pool.query(
        `SELECT expires_at FROM template_purchases
         WHERE template_id = $1 AND buyer_id = $2 AND status = 'success'`,
        [id, userId]
      );

      if (existing.rows.length > 0 && tpl.rental_days > 0) {
         // If it's a rental, check if it has expired.
         const expiresAt = new Date(existing.rows[0].expires_at).getTime();
         if (expiresAt < Date.now()) {
            return res.status(402).json({ error: 'Your rental has expired', price_kobo: tpl.price_kobo });
         }
      } else if (existing.rows.length === 0) {
        if (typeof reference === 'string' && reference.length > 0 && reference.length < 128) {
          try {
            const verified = await verifyTransaction(reference);
            if (verified.status !== 'success') {
              return res
                .status(402)
                .json({ error: 'Payment not confirmed yet', price_kobo: tpl.price_kobo });
            }
            const updated = await pool.query(
              `UPDATE template_purchases
               SET status = 'success', updated_at = NOW()
               WHERE reference = $1 AND template_id = $2 AND buyer_id = $3
                 AND status = 'pending'
               RETURNING id`,
              [reference, id, userId]
            );
            if (updated.rows.length === 0) {
              return res
                .status(402)
                .json({ error: 'Purchase reference is not valid for this template' });
            }
          } catch (err) {
            console.error('Error verifying purchase reference:', err);
            return res.status(402).json({ error: 'Could not verify payment' });
          }
        } else {
          return res.status(402).json({
            error: 'This template requires payment',
            price_kobo: tpl.price_kobo,
          });
        }
      }
    }
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
      await client.query(
        'UPDATE template_purchases SET board_id = $1 ' +
          'WHERE template_id = $2 AND buyer_id = $3 AND status = \'success\'',
        [boardId, id, userId]
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


/* ====================================================================== */
/* Feature 5.6b - paid templates                                          */
/* ====================================================================== */

/**
 * POST /api/templates/marketplace/:id/checkout.
 *
 * Starts a one-off transaction to buy a paid template. Requires the
 * author to have an active publisher subaccount; otherwise there is no
 * bank to route the 70% to. Free users can call this - purchase is not
 * gated on templates.publish, only on payment.
 */
export const checkoutMarketplaceTemplate = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const email = req.user?.email;
    const { id } = req.params;

    if (!userId || !email) return res.status(401).json({ error: 'Unauthorized' });
    if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid template id' });

    const tplRow = await pool.query(
      'SELECT id, author_id, price_kobo::int AS price_kobo, status ' +
        'FROM marketplace_templates WHERE id = $1',
      [id]
    );
    if (tplRow.rows.length === 0) return res.status(404).json({ error: 'Template not found' });
    const tpl = tplRow.rows[0];

    if (tpl.status !== 'approved') {
      return res.status(404).json({ error: 'Template not available' });
    }
    if (tpl.price_kobo === 0) {
      return res.status(400).json({ error: 'This template is free - use install directly' });
    }
    if (tpl.author_id === userId) {
      return res.status(400).json({ error: 'You cannot buy your own template' });
    }

    // Block if the buyer already owns it.
    const existing = await pool.query(
      'SELECT status FROM template_purchases WHERE template_id = $1 AND buyer_id = $2',
      [id, userId]
    );
    if (existing.rows.length > 0) {
      const status = existing.rows[0].status as string;
      if (status === 'success') {
        return res.status(409).json({ error: 'You already own this template' });
      }
      if (status === 'refunded') {
        return res.status(409).json({ error: 'This purchase was already refunded' });
      }
    }

    // Look up the publisher subaccount.
    const profile = await pool.query(
      'SELECT subaccount_code, payout_status FROM publisher_profiles WHERE user_id = $1',
      [tpl.author_id]
    );
    if (profile.rows.length === 0 || profile.rows[0].payout_status !== 'active') {
      return res
        .status(503)
        .json({ error: 'This publisher is not currently accepting payments' });
    }

    const appUrl = process.env.APP_URL ?? 'http://localhost:5173';

    const init = await initializeTransaction({
      email,
      amount: tpl.price_kobo,
      callback_url: appUrl + '/templates/callback',
      subaccount: profile.rows[0].subaccount_code,
      bearer: 'subaccount', // Publisher pays Paystack fees and VAT
      metadata: {
        userId,
        purpose: 'template_purchase',
        template_id: id,
      },
    });

    // Either insert a new pending row or refresh an existing pending row.
    if (existing.rows.length > 0) {
      await pool.query(
        'UPDATE template_purchases SET reference = $1, amount_kobo = $2, updated_at = NOW() WHERE template_id = $3 AND buyer_id = $4',
        [init.reference, tpl.price_kobo, id, userId]
      );
    } else {
      await pool.query(
        'INSERT INTO template_purchases (template_id, buyer_id, reference, amount_kobo, status) ' +
          'VALUES ($1, $2, $3, $4, \'pending\')',
        [id, userId, init.reference, tpl.price_kobo]
      );
    }

    res.json({
      access_code: init.access_code,
      authorization_url: init.authorization_url,
      reference: init.reference,
      amount_kobo: tpl.price_kobo,
    });
  } catch (error) {
    if (error instanceof PaystackError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Error starting template purchase:', error);
    res.status(500).json({ error: 'Failed to start the purchase' });
  }
};

/**
 * GET /api/templates/purchases/mine.
 *
 * The buyer's purchase history, for the refund UI and for the picker
 * to know which paid templates are already owned.
 */
export const listMyPurchases = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      `SELECT p.id, p.reference, p.amount_kobo, p.status, p.created_at, p.refunded_at,
              m.id as template_id, m.name as template_name
       FROM template_purchases p
       JOIN marketplace_templates m ON m.id = p.template_id
       WHERE p.buyer_id = $1
       ORDER BY p.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error listing purchases:', error);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
};

/**
 * POST /api/templates/purchases/:reference/refund.
 *
 * Buyer asks for their money back. Only successful purchases can be
 * refunded, and only by the buyer. Paystack processes the refund (which
 * also reverses the 30/70 split); our row flips to refunded once Paystack
 * accepts the request.
 */
export const refundPurchase = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { reference } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (typeof reference !== 'string' || reference.length === 0 || reference.length > 128) {
      return res.status(400).json({ error: 'Invalid reference' });
    }

    const row = await pool.query(
      'SELECT id, status FROM template_purchases WHERE reference = $1 AND buyer_id = $2',
      [reference, userId]
    );
    if (row.rows.length === 0) return res.status(404).json({ error: 'Purchase not found' });

    const purchase = row.rows[0];
    if (purchase.status === 'refunded') {
      return res.status(409).json({ error: 'Already refunded' });
    }
    if (Date.now() - new Date(purchase.created_at).getTime() > 14 * 24 * 3600 * 1000) {
      return res.status(400).json({ error: 'Refunds are only available within 14 days of purchase' });
    }
    if (purchase.status !== 'success') {
      return res.status(400).json({ error: 'Only completed purchases can be refunded' });
    }

    try {
      const refund = await refundTransaction(reference);
      if (refund.status === 'processed' || refund.status === 'pending' || refund.status === 'processing') {
        await pool.query(
          'UPDATE template_purchases SET status = \'refunded\', refunded_at = NOW(), updated_at = NOW() ' +
            'WHERE id = $1',
          [purchase.id]
        );
        // Delete the board created by this purchase.
        if (purchase.board_id) {
          await pool.query('DELETE FROM boards WHERE id = $1 AND user_id = $2', [purchase.board_id, userId]);
        }
        return res.json({ ok: true, status: 'refunded' });
      }
      return res.status(500).json({ error: 'Refund could not be processed' });
    } catch (err) {
      if (err instanceof PaystackError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      throw err;
    }
  } catch (error) {
    console.error('Error refunding purchase:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
};
