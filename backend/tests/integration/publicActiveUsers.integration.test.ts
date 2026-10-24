import request from 'supertest';
import app from '../../src/app';

/**
 * The public stats endpoint now exposes `active_users` (the count of
 * distinct users with at least one open Socket.io connection right now).
 * This test is NEW in Step 5; it lives in its own file so the existing
 * `public.integration.test.ts` assertions remain untouched.
 */
describe('public stats — active_users extension', () => {
  it('GET /api/public/stats includes active_users as a non-negative integer', async () => {
    const res = await request(app).get('/api/public/stats');

    expect(res.status).toBe(200);
    expect(typeof res.body.active_users).toBe('number');
    expect(Number.isInteger(res.body.active_users)).toBe(true);
    expect(res.body.active_users).toBeGreaterThanOrEqual(0);
  });

  it('still returns the pre-existing fields', async () => {
    const res = await request(app).get('/api/public/stats');

    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime_seconds).toBe('number');
    expect(typeof res.body.version).toBe('string');
  });
});