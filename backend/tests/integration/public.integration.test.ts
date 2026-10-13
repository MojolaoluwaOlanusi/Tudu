import request from 'supertest';
import app from '../../src/app';
import pool from '../../src/config/database';

/** The public (unauthenticated) endpoints used by the landing page. */
describe('public endpoints', () => {
  it('GET /api/public/stats returns status and uptime', async () => {
    const res = await request(app).get('/api/public/stats');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime_seconds).toBe('number');
  });

  it('POST /api/public/demo creates a demo user with a seeded board', async () => {
    const res = await request(app).post('/api/public/demo');
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toMatch(/^demo-/);
    expect(res.body.board_id).toBeTruthy();

    const boards = await request(app)
      .get('/api/boards')
      .set('Authorization', 'Bearer ' + res.body.token);
    expect(boards.body.length).toBeGreaterThan(0);

    await pool.query('DELETE FROM users WHERE id = $1', [res.body.user.id]);
  });

  it('the demo token can fetch its own tasks', async () => {
    const demo = await request(app).post('/api/public/demo');
    const tasks = await request(app)
      .get('/api/tasks')
      .set('Authorization', 'Bearer ' + demo.body.token);
    expect(tasks.status).toBe(200);
    expect(Array.isArray(tasks.body)).toBe(true);
    expect(tasks.body.length).toBeGreaterThanOrEqual(4);
    await pool.query('DELETE FROM users WHERE id = $1', [demo.body.user.id]);
  });
});
