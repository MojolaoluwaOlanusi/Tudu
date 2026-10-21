import request from 'supertest';
import app from '../../src/app';
import pool from '../../src/config/database';
import { auth, destroyUser, registerUser, TestUser } from './helpers';

/**
 * Feature 5.7 rework - github_mappings ownership, save, and webhook dispatch.
 */
describe('github integration', () => {
  let userA: TestUser;
  let userB: TestUser;
  let boardA: string;
  let boardB: string;
  let openedColA: string;
  let mergedColA: string;

  beforeAll(async () => {
    userA = await registerUser('gh-a');
    userB = await registerUser('gh-b');

    const ba = await request(app).get('/api/boards').set(auth(userA));
    boardA = ba.body[0].id;
    const ca = await request(app).get('/api/boards/' + boardA + '/columns').set(auth(userA));
    openedColA = ca.body.find((c: { stage: string }) => c.stage === 'doing').id;
    mergedColA = ca.body.find((c: { stage: string }) => c.stage === 'done').id;

    const bb = await request(app).get('/api/boards').set(auth(userB));
    boardB = bb.body[0].id;

    // Simulate the user having connected GitHub already.
    for (const u of [userA, userB]) {
      await pool.query(
        'INSERT INTO github_integrations (user_id, access_token, github_login) VALUES ($1, $2, $3)',
        [u.id, 'fake-token-' + u.id, 'gh-' + u.id.slice(0, 6)]
      );
    }
  });

  afterAll(async () => {
    await pool.query('DELETE FROM github_integrations WHERE user_id = ANY($1::uuid[])', [
      [userA.id, userB.id],
    ]);
    await destroyUser(userA);
    await destroyUser(userB);
  });

  it('reports disconnected for a user with no integration', async () => {
    const other = await registerUser('gh-none');
    try {
      const res = await request(app)
        .get('/api/integrations/github/status')
        .set(auth(other));
      expect(res.status).toBe(200);
      expect(res.body.connected).toBe(false);
    } finally {
      await destroyUser(other);
    }
  });

  it('reports connected with the stored login', async () => {
    const res = await request(app)
      .get('/api/integrations/github/status')
      .set(auth(userA));
    expect(res.status).toBe(200);
    expect(res.body.connected).toBe(true);
    expect(res.body.login).toBe('gh-' + userA.id.slice(0, 6));
  });

  it('saves a mapping without the ON CONFLICT bug', async () => {
    const res = await request(app)
      .post('/api/integrations/github/mapping')
      .set(auth(userA))
      .send({
        board_id: boardA,
        repo_full_name: 'octocat/hello-world',
        pr_opened_column_id: openedColA,
        pr_merged_column_id: mergedColA,
      });
    expect(res.status).toBe(200);
    expect(res.body.repo_full_name).toBe('octocat/hello-world');
  });

  it('lets a second user save the same repo independently', async () => {
    const cb = await request(app).get('/api/boards/' + boardB + '/columns').set(auth(userB));
    const openedColB = cb.body.find((c: { stage: string }) => c.stage === 'doing').id;
    const mergedColB = cb.body.find((c: { stage: string }) => c.stage === 'done').id;

    const res = await request(app)
      .post('/api/integrations/github/mapping')
      .set(auth(userB))
      .send({
        board_id: boardB,
        repo_full_name: 'octocat/hello-world',
        pr_opened_column_id: openedColB,
        pr_merged_column_id: mergedColB,
      });
    expect(res.status).toBe(200);

    const rows = await pool.query(
      'SELECT COUNT(*)::int AS n FROM github_mappings WHERE repo_full_name = $1',
      ['octocat/hello-world']
    );
    expect(rows.rows[0].n).toBe(2);
  });

  it('listMappings returns only the caller\'s rows', async () => {
    const a = await request(app).get('/api/integrations/github/mappings').set(auth(userA));
    const b = await request(app).get('/api/integrations/github/mappings').set(auth(userB));
    expect(a.body).toHaveLength(1);
    expect(b.body).toHaveLength(1);
    expect(a.body[0].board_id).toBe(boardA);
    expect(b.body[0].board_id).toBe(boardB);
  });

  it('the webhook moves only the mapped user\'s task', async () => {
    const t = await request(app)
      .post('/api/tasks')
      .set(auth(userA))
      .send({ title: 'PR will move me', board_id: boardA });
    const shortId = t.body.short_id;

    await request(app)
      .post('/api/integrations/github/webhook')
      .set('x-github-event', 'pull_request')
      .send({
        action: 'opened',
        pull_request: { title: 'Fix TUDU-' + shortId, body: '', merged: false },
        repository: { full_name: 'octocat/hello-world' },
      });

    const after = await request(app).get('/api/tasks/' + t.body.id).set(auth(userA));
    expect(after.body.column_id).toBe(openedColA);
  });
});
