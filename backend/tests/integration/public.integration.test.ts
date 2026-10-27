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

/**
 * The frontend uses this endpoint to decide which OAuth buttons to show.
 * The flags mirror passport.ts: a provider is available only when BOTH its
 * client ID and secret are set. Setting them here does not re-register the
 * Passport strategy (already evaluated at import time), but the endpoint
 * reads env vars at request time so the response still flips.
 */
describe('GET /api/public/auth-methods', () => {
  const saved = {
    gi: process.env.GOOGLE_CLIENT_ID,
    gs: process.env.GOOGLE_CLIENT_SECRET,
    hi: process.env.GITHUB_CLIENT_ID,
    hs: process.env.GITHUB_CLIENT_SECRET,
  };

  const restore = (key: string, value: string | undefined) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  };

  afterEach(() => {
    restore('GOOGLE_CLIENT_ID', saved.gi);
    restore('GOOGLE_CLIENT_SECRET', saved.gs);
    restore('GITHUB_CLIENT_ID', saved.hi);
    restore('GITHUB_CLIENT_SECRET', saved.hs);
  });

  it('reports email=true and both OAuth flags false when no credentials are set', async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;

    const res = await request(app).get('/api/public/auth-methods');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ email: true, google: false, github: false });
  });

  it('reports both OAuth flags true when credentials are set', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
    process.env.GITHUB_CLIENT_ID = 'test-id';
    process.env.GITHUB_CLIENT_SECRET = 'test-secret';

    const res = await request(app).get('/api/public/auth-methods');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ email: true, google: true, github: true });
  });

  it('reports each provider independently', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;

    const res = await request(app).get('/api/public/auth-methods');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ email: true, google: true, github: false });
  });

  it('requires BOTH client id and secret for a provider to count as enabled', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-id';
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;

    const res = await request(app).get('/api/public/auth-methods');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ email: true, google: false, github: false });
  });
});
