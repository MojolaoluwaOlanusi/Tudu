import request from 'supertest';
import app from '../../src/app';
import pool from '../../src/config/database';
import { auth, destroyUser, registerUser, TestUser } from './helpers';

/** Feature 4.6 — bulk delete and bulk assign. */
describe('bulk actions', () => {
  let user: TestUser;
  let boardId: string;

  beforeAll(async () => {
    user = await registerUser('bulk');
    const boards = await request(app).get('/api/boards').set(auth(user));
    boardId = boards.body[0].id;
  });

  afterAll(async () => {
    await destroyUser(user);
  });

  const create = async (title: string) =>
    (
      await request(app)
        .post('/api/tasks')
        .set(auth(user))
        .send({ title, board_id: boardId, naturalLanguage: false })
    ).body;

  const listIds = async () => {
    const res = await request(app).get('/api/tasks').set(auth(user));
    return (res.body as { id: string }[]).map((t) => t.id);
  };

  it('bulk-deletes several tasks at once (soft delete)', async () => {
    const a = await create('Bulk A');
    const b = await create('Bulk B');
    const c = await create('Bulk C');

    const res = await request(app)
      .delete('/api/tasks/batch')
      .set(auth(user))
      .send({ ids: [a.id, b.id] });
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(2);

    const remaining = await listIds();
    expect(remaining).toContain(c.id);
    expect(remaining).not.toContain(a.id);
    expect(remaining).not.toContain(b.id);

    // The rows survived; only deleted_at is set.
    const db = await pool.query(
      'SELECT id, deleted_at FROM tasks WHERE id = ANY($1::uuid[])',
      [[a.id, b.id]]
    );
    expect(db.rows).toHaveLength(2);
    expect(db.rows.every((r) => r.deleted_at !== null)).toBe(true);
  });

  it('reports how many rows actually changed', async () => {
    const a = await create('Half already gone');
    await request(app).delete(`/api/tasks/${a.id}`).set(auth(user));

    const stillVisible = await create('Still here');
    const res = await request(app)
      .delete('/api/tasks/batch')
      .set(auth(user))
      .send({ ids: [a.id, stillVisible.id] });
    expect(res.status).toBe(200);
    // Only the visible one flipped; the deleted one is silently skipped.
    expect(res.body.deleted).toBe(1);
  });

  it('refuses an empty or invalid ids array', async () => {
    const empty = await request(app)
      .delete('/api/tasks/batch')
      .set(auth(user))
      .send({ ids: [] });
    expect(empty.status).toBe(400);

    const bad = await request(app)
      .delete('/api/tasks/batch')
      .set(auth(user))
      .send({ ids: ['not-a-uuid'] });
    expect(bad.status).toBe(400);
  });

  it('bulk-unassigns with assignee_id = null', async () => {
    const a = await create('Assignable A');
    const b = await create('Assignable B');
    // First assign them via the single-task endpoint.
    await request(app)
      .patch(`/api/tasks/${a.id}/assignee`)
      .set(auth(user))
      .send({ assignee_id: user.id })
      .ok(() => true); // ignore: personal boards may not allow assigning

    const res = await request(app)
      .patch('/api/tasks/batch/assign')
      .set(auth(user))
      .send({ ids: [a.id, b.id], assignee_id: null });
    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(2);
    expect(res.body.tasks.every((t: { assignee_id: string | null }) => t.assignee_id === null)).toBe(true);
  });

  it('refuses an assignee who is not a member of the boards', async () => {
    const stranger = await registerUser('bulk-stranger');
    try {
      const task = await create('Belongs to user only');
      const res = await request(app)
        .patch('/api/tasks/batch/assign')
        .set(auth(user))
        .send({ ids: [task.id], assignee_id: stranger.id });
      expect(res.status).toBe(400);
    } finally {
      await destroyUser(stranger);
    }
  });
});
