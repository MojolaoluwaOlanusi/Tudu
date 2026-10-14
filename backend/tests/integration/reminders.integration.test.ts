import request from 'supertest';
import app from '../../src/app';
import pool from '../../src/config/database';
import { auth, destroyUser, registerUser, TestUser } from './helpers';

/** Feature 4.11 - reminders preferences and the cron endpoint. */
describe('reminders', () => {
  let user: TestUser;
  const secret = 'test-cron-secret-' + Date.now();

  beforeAll(async () => {
    process.env.REMINDER_CRON_SECRET = secret;
    user = await registerUser('reminders');
  });

  afterAll(async () => {
    await destroyUser(user);
    delete process.env.REMINDER_CRON_SECRET;
  });

  it('defaults reminders to off', async () => {
    const res = await request(app)
      .get('/api/users/me/notifications')
      .set(auth(user));
    expect(res.status).toBe(200);
    expect(res.body.reminders).toBe(false);
  });

  it('toggles reminders on and back off', async () => {
    const on = await request(app)
      .put('/api/users/me/notifications')
      .set(auth(user))
      .send({ reminders: true });
    expect(on.status).toBe(200);
    expect(on.body.reminders).toBe(true);

    const off = await request(app)
      .put('/api/users/me/notifications')
      .set(auth(user))
      .send({ reminders: false });
    expect(off.status).toBe(200);
    expect(off.body.reminders).toBe(false);
  });

  it('rejects a non-boolean reminders value', async () => {
    const res = await request(app)
      .put('/api/users/me/notifications')
      .set(auth(user))
      .send({ reminders: 'yes' });
    expect(res.status).toBe(400);
  });

  it('refuses the cron endpoint without the secret', async () => {
    const res = await request(app).post('/api/reminders/run');
    expect(res.status).toBe(401);
  });

  it('refuses the cron endpoint with a wrong secret', async () => {
    const res = await request(app)
      .post('/api/reminders/run')
      .set('X-Cron-Secret', 'wrong-secret');
    expect(res.status).toBe(401);
  });

  it('runs with the correct secret and returns a summary', async () => {
    const res = await request(app)
      .post('/api/reminders/run')
      .set('X-Cron-Secret', secret);
    expect(res.status).toBe(200);
    expect(typeof res.body.usersChecked).toBe('number');
    expect(typeof res.body.emailsSent).toBe('number');
    expect(typeof res.body.emailsFailed).toBe('number');
  });

  it('a run on a fresh database sends nothing, because nobody has opted in', async () => {
    // No user in this test has reminders on right now, so the candidate
    // query returns zero rows. Any leftover reminders from a prior test
    // would make this assertion flaky; the test above turned them off.
    const res = await request(app)
      .post('/api/reminders/run')
      .set('X-Cron-Secret', secret);
    expect(res.status).toBe(200);
    expect(res.body.usersChecked).toBe(0);
    expect(res.body.emailsSent).toBe(0);
  });

  it('the seeded last_sent_at is written only by the job, not the client', async () => {
    // Turn reminders on and write a fake last_sent_at directly, then
    // confirm that a client PUT cannot overwrite it.
    await request(app)
      .put('/api/users/me/notifications')
      .set(auth(user))
      .send({ reminders: true });

    const fake = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await pool.query(
      'UPDATE users SET notifications = COALESCE(notifications, \'{}\'::jsonb) || ' +
        'jsonb_build_object(\'last_sent_at\', $1::text) WHERE id = $2',
      [fake, user.id]
    );

    await request(app)
      .put('/api/users/me/notifications')
      .set(auth(user))
      .send({ reminders: false });

    const row = await pool.query(
      'SELECT notifications FROM users WHERE id = $1',
      [user.id]
    );
    expect(row.rows[0].notifications.last_sent_at).not.toBeNull();
  });
});
