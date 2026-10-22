import request from 'supertest';
import app from '../../src/app';
import pool from '../../src/config/database';
import { auth, destroyUser, registerUser, TestUser } from './helpers';

/** Feature 5.12 - time tracking lifecycle. */
describe('time tracking', () => {
  let proUser: TestUser;
  let freeUser: TestUser;
  let boardId: string;
  let taskId: string;

  beforeAll(async () => {
    proUser = await registerUser('time-pro');
    freeUser = await registerUser('time-free');

    await pool.query(
      "INSERT INTO subscriptions (user_id, plan_code, status) VALUES ($1, 'pro_monthly', 'active')",
      [proUser.id]
    );

    const boards = await request(app).get('/api/boards').set(auth(proUser));
    boardId = boards.body[0].id;

    const task = await request(app)
      .post('/api/tasks')
      .set(auth(proUser))
      .send({ title: 'Time test task', board_id: boardId, naturalLanguage: false });
    taskId = task.body.id;
  }, 180_000);

  afterAll(async () => {
    await pool.query('DELETE FROM time_entries WHERE user_id = ANY($1::uuid[])', [
      [proUser.id, freeUser.id],
    ]);
    await destroyUser(proUser);
    await destroyUser(freeUser);
  }, 60_000);

  it('returns 402 for a Free user on every endpoint', async () => {
    const res = await request(app).get('/api/time/active').set(auth(freeUser));
    expect(res.status).toBe(402);
    expect(res.body.feature).toBe('time.tracking');
  });

  it('starts a timer, then refuses a second one', async () => {
    const first = await request(app)
      .post('/api/time/start')
      .set(auth(proUser))
      .send({ taskId });
    expect(first.status).toBe(201);
    expect(first.body.task_id).toBe(taskId);
    expect(first.body.ended_at).toBeNull();

    const second = await request(app)
      .post('/api/time/start')
      .set(auth(proUser))
      .send({ taskId });
    expect(second.status).toBe(409);

    const active = await request(app).get('/api/time/active').set(auth(proUser));
    expect(active.body.id).toBe(first.body.id);
  });

  it('stops the timer and computes duration', async () => {
    const stopped = await request(app).post('/api/time/stop').set(auth(proUser));
    expect(stopped.status).toBe(200);
    expect(stopped.body.ended_at).not.toBeNull();
    expect(typeof stopped.body.duration_seconds).toBe('number');
    expect(stopped.body.duration_seconds).toBeGreaterThanOrEqual(1);

    const active = await request(app).get('/api/time/active').set(auth(proUser));
    expect(active.body).toBeNull();
  });

  it('returns 404 when stopping with nothing running', async () => {
    const res = await request(app).post('/api/time/stop').set(auth(proUser));
    expect(res.status).toBe(404);
  });

  it('accepts a manual entry and shows it in the report', async () => {
    const start = new Date(Date.now() - 3600_000).toISOString();
    const end = new Date(Date.now() - 1800_000).toISOString();

    const res = await request(app)
      .post('/api/time/entries')
      .set(auth(proUser))
      .send({ startedAt: start, endedAt: end, billable: true, description: 'Manual work' });
    expect(res.status).toBe(201);
    expect(res.body.duration_seconds).toBe(1800);
    expect(res.body.billable).toBe(true);

    const report = await request(app)
      .get('/api/time/report?range=week')
      .set(auth(proUser));
    expect(report.status).toBe(200);
    expect(report.body.totalSeconds).toBeGreaterThan(0);
    expect(report.body.byDay.length).toBe(7);
    expect(report.body.billableSeconds).toBe(1800);
  });

  it('rejects a manual entry that ends before it starts', async () => {
    const start = new Date().toISOString();
    const end = new Date(Date.now() - 60_000).toISOString();

    const res = await request(app)
      .post('/api/time/entries')
      .set(auth(proUser))
      .send({ startedAt: start, endedAt: end });
    expect(res.status).toBe(400);
  });

  it('never lets a user delete another user\'s entry', async () => {
    const entries = await request(app).get('/api/time/entries').set(auth(proUser));
    const one = entries.body.items[0];
    expect(one).toBeDefined();

    const asFree = await request(app)
      .delete('/api/time/entries/' + one.id)
      .set(auth(freeUser));
    expect(asFree.status).toBe(402);
  });
});
