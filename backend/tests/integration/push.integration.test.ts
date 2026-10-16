import request from 'supertest';
import app from '../../src/app';
import pool from '../../src/config/database';
import { auth, destroyUser, registerUser, TestUser } from './helpers';

/** Feature 5.5 - the push subscribe / unsubscribe endpoints. */
describe('push subscriptions', () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await registerUser('push');
  });

  afterAll(async () => {
    await destroyUser(user);
  });

  it('GET /api/push/public-key is public and reports configured state', async () => {
    const res = await request(app).get('/api/push/public-key');
    expect(res.status).toBe(200);
    expect(typeof res.body.configured).toBe('boolean');
  });

  it('POST /api/push/subscribe rejects an unauthenticated caller', async () => {
    const res = await request(app)
      .post('/api/push/subscribe')
      .send({ endpoint: 'https://example.com/x', keys: { p256dh: 'a', auth: 'b' } });
    expect(res.status).toBe(401);
  });

  it('POST /api/push/subscribe rejects a malformed body', async () => {
    const res = await request(app)
      .post('/api/push/subscribe')
      .set(auth(user))
      .send({ endpoint: 'not-a-url' });
    expect(res.status).toBe(400);
  });

  it('POST /api/push/subscribe stores a subscription', async () => {
    const endpoint = 'https://push.example.com/' + Date.now();
    const res = await request(app)
      .post('/api/push/subscribe')
      .set(auth(user))
      .send({ endpoint, keys: { p256dh: 'abc123', auth: 'def456' } });
    expect(res.status).toBe(201);

    const row = await pool.query(
      'SELECT user_id, p256dh FROM push_subscriptions WHERE endpoint = $1',
      [endpoint]
    );
    expect(row.rows.length).toBe(1);
    expect(row.rows[0].user_id).toBe(user.id);
    expect(row.rows[0].p256dh).toBe('abc123');

    await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
  });

  it('a second subscribe with the same endpoint is an upsert', async () => {
    const endpoint = 'https://push.example.com/upsert-' + Date.now();
    await request(app)
      .post('/api/push/subscribe')
      .set(auth(user))
      .send({ endpoint, keys: { p256dh: 'first', auth: 'firstAuth' } });
    await request(app)
      .post('/api/push/subscribe')
      .set(auth(user))
      .send({ endpoint, keys: { p256dh: 'second', auth: 'secondAuth' } });

    const row = await pool.query(
      'SELECT COUNT(*)::int AS n, MIN(p256dh) AS p FROM push_subscriptions WHERE endpoint = $1',
      [endpoint]
    );
    expect(row.rows[0].n).toBe(1);
    expect(row.rows[0].p).toBe('second');

    await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
  });

  it('DELETE /api/push/subscribe removes the row', async () => {
    const endpoint = 'https://push.example.com/del-' + Date.now();
    await request(app)
      .post('/api/push/subscribe')
      .set(auth(user))
      .send({ endpoint, keys: { p256dh: 'x', auth: 'y' } });

    const res = await request(app)
      .delete('/api/push/subscribe')
      .set(auth(user))
      .send({ endpoint });
    expect(res.status).toBe(200);

    const row = await pool.query(
      'SELECT COUNT(*)::int AS n FROM push_subscriptions WHERE endpoint = $1',
      [endpoint]
    );
    expect(row.rows[0].n).toBe(0);
  });
});
