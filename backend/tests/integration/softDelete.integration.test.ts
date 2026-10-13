import request from 'supertest';
import app from '../../src/app';
import pool from '../../src/config/database';
import { auth, destroyUser, registerUser, TestUser } from './helpers';

/** Feature 4.5 — delete is reversible; a hard delete is not. */
describe('soft delete and restore', () => {
  let user: TestUser;
  let boardId: string;

  beforeAll(async () => {
    user = await registerUser('soft-delete');
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

  const listTitles = async () => {
    const res = await request(app).get('/api/tasks').set(auth(user));
    return (res.body as { title: string }[]).map((t) => t.title);
  };

  it('a deleted task disappears from the list', async () => {
    const task = await create('Going away');
    await request(app).delete(`/api/tasks/${task.id}`).set(auth(user));
    expect(await listTitles()).not.toContain('Going away');
  });

  it('the row survives in the database with deleted_at set', async () => {
    const task = await create('Still in the db');
    await request(app).delete(`/api/tasks/${task.id}`).set(auth(user));
    const row = await pool.query('SELECT deleted_at FROM tasks WHERE id = $1', [task.id]);
    expect(row.rows.length).toBe(1);
    expect(row.rows[0].deleted_at).not.toBeNull();
  });

  it('restore brings the task back', async () => {
    const task = await create('Comes back');
    await request(app).delete(`/api/tasks/${task.id}`).set(auth(user));
    const restored = await request(app)
      .post(`/api/tasks/${task.id}/restore`)
      .set(auth(user));
    expect(restored.status).toBe(200);
    expect(restored.body.deleted_at).toBeNull();
    expect(await listTitles()).toContain('Comes back');
  });

  it('a task that is not deleted cannot be restored', async () => {
    const task = await create('Never deleted');
    const res = await request(app)
      .post(`/api/tasks/${task.id}/restore`)
      .set(auth(user));
    expect(res.status).toBe(404);
  });

  it('a physically removed task cannot be restored', async () => {
    const task = await create('Gone forever');
    await request(app).delete(`/api/tasks/${task.id}`).set(auth(user));
    // Simulate the retention purge: hard-delete the row directly.
    await pool.query('DELETE FROM tasks WHERE id = $1', [task.id]);
    const res = await request(app)
      .post(`/api/tasks/${task.id}/restore`)
      .set(auth(user));
    expect(res.status).toBe(404);
  });

  it('a stranger cannot restore my task', async () => {
    const stranger = await registerUser('soft-stranger');
    try {
      const task = await create('Mine, not theirs');
      await request(app).delete(`/api/tasks/${task.id}`).set(auth(user));
      const res = await request(app)
        .post(`/api/tasks/${task.id}/restore`)
        .set(auth(stranger));
      expect(res.status).toBe(404);
    } finally {
      await destroyUser(stranger);
    }
  });

  it('a deleted task does not appear in the overdue list either', async () => {
    const past = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString();
    const task = (
      await request(app)
        .post('/api/tasks')
        .set(auth(user))
        .send({ title: 'Overdue soon to die', due_date: past, board_id: boardId, naturalLanguage: false })
    ).body;
    await request(app).delete(`/api/tasks/${task.id}`).set(auth(user));
    const overdue = await request(app).get('/api/tasks/overdue').set(auth(user));
    expect((overdue.body as { title: string }[]).map((t) => t.title)).not.toContain(
      'Overdue soon to die'
    );
  });
});
