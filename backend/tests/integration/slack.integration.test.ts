import crypto from 'node:crypto';
import request from 'supertest';
import app from '../../src/app';
import pool from '../../src/config/database';
import { auth, destroyUser, registerUser, TestUser } from './helpers';

/** Feature 5.8 - Slack signature verification and the /tudu command. */
describe('slack integration', () => {
  const secret = 'test-slack-signing-secret';
  let user: TestUser;
  let boardId: string;

  const sign = (raw: string, ts: number): string =>
    'v0=' + crypto.createHmac('sha256', secret).update('v0:' + ts + ':' + raw).digest('hex');

  const post = async (raw: string, opts: { ts?: number; signature?: string } = {}) => {
    const ts = opts.ts ?? Math.floor(Date.now() / 1000);
    const req = request(app)
      .post('/api/integrations/slack/commands')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    req.set('x-slack-request-timestamp', String(ts));
    if (opts.signature !== null) {
      req.set('x-slack-signature', opts.signature ?? sign(raw, ts));
    }
    return req.send(raw);
  };

  beforeAll(async () => {
    process.env.SLACK_SIGNING_SECRET = secret;
    user = await registerUser('slack');

    const boards = await request(app).get('/api/boards').set(auth(user));
    boardId = boards.body[0].id;

    await pool.query(
      'INSERT INTO subscriptions (user_id, plan_code, status) VALUES ($1, \'pro_monthly\', \'active\')',
      [user.id]
    );

    await pool.query(
      'INSERT INTO slack_integrations ' +
        '(user_id, team_id, team_name, access_token, channel_id, channel_name, default_board_id) ' +
        'VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [user.id, 'T_TEST_TEAM', 'Test Workspace', 'xoxb-fake-token', 'C_TEST', 'general', boardId]
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM slack_integrations WHERE user_id = $1', [user.id]);
    await destroyUser(user);
    delete process.env.SLACK_SIGNING_SECRET;
  });

  it('rejects a request with no signature', async () => {
    const raw = 'command=%2Ftudu&text=help&team_id=T_TEST_TEAM';
    const res = await post(raw, { signature: null });
    expect(res.status).toBe(401);
  });

  it('rejects a request with a wrong signature', async () => {
    const raw = 'command=%2Ftudu&text=help&team_id=T_TEST_TEAM';
    const res = await post(raw, { signature: 'v0=deadbeef' });
    expect(res.status).toBe(401);
  });

  it('rejects a replayed request (timestamp older than five minutes)', async () => {
    const raw = 'command=%2Ftudu&text=help&team_id=T_TEST_TEAM';
    const stale = Math.floor(Date.now() / 1000) - 600;
    const res = await post(raw, { ts: stale });
    expect(res.status).toBe(401);
  });

  it('answers /tudu help with usage and creates nothing', async () => {
    const before = await request(app).get('/api/tasks').set(auth(user));
    const raw = 'command=%2Ftudu&text=help&team_id=T_TEST_TEAM';
    const res = await post(raw);
    expect(res.status).toBe(200);
    expect(res.body.response_type).toBe('ephemeral');
    expect(res.body.text).toMatch(/tudu create/i);

    const after = await request(app).get('/api/tasks').set(auth(user));
    expect(after.body.length).toBe(before.body.length);
  });

  it('creates a task from /tudu create and parses the sentence', async () => {
    const raw =
      'command=%2Ftudu&text=' +
      encodeURIComponent('create Buy milk tomorrow #personal urgent') +
      '&team_id=T_TEST_TEAM';
    const res = await post(raw);
    expect(res.status).toBe(200);
    expect(res.body.text).toMatch(/Buy milk/);

    const tasks = await request(app).get('/api/tasks').set(auth(user));
    const created = tasks.body.find((t: { title: string }) => t.title === 'Buy milk');
    expect(created).toBeDefined();
    expect(created.category).toBe('personal');
    expect(created.priority).toBe('high');
    expect(created.due_date).not.toBeNull();
  });

  it('tells the user when the workspace is not linked', async () => {
    const raw = 'command=%2Ftudu&text=create+Nope&team_id=T_UNKNOWN';
    const res = await post(raw);
    expect(res.status).toBe(200);
    expect(res.body.text).toMatch(/not linked/i);
  });

  it('refuses when the owner is no longer Pro', async () => {
    await pool.query('UPDATE subscriptions SET status = \'cancelled\' WHERE user_id = $1', [user.id]);
    try {
      const raw = 'command=%2Ftudu&text=create+Nope&team_id=T_TEST_TEAM';
      const res = await post(raw);
      expect(res.body.text).toMatch(/requires a Tudu Pro/i);
    } finally {
      await pool.query('UPDATE subscriptions SET status = \'active\' WHERE user_id = $1', [user.id]);
    }
  });

  it('reports connected status for the linked account', async () => {
    const res = await request(app).get('/api/integrations/slack/status').set(auth(user));
    expect(res.status).toBe(200);
    expect(res.body.connected).toBe(true);
    expect(res.body.teamName).toBe('Test Workspace');
  });

  it('rejects an unknown channel update field', async () => {
    const res = await request(app)
      .put('/api/integrations/slack/settings')
      .set(auth(user))
      .send({ notifyDue: 'yes' });
    expect(res.status).toBe(400);
  });

  it('disconnect removes the row', async () => {
    const res = await request(app).delete('/api/integrations/slack').set(auth(user));
    expect(res.status).toBe(200);

    const row = await pool.query('SELECT 1 FROM slack_integrations WHERE user_id = $1', [user.id]);
    expect(row.rows.length).toBe(0);
  });
});
