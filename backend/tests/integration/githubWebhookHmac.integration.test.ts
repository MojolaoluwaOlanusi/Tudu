import crypto from 'node:crypto';
import request from 'supertest';
import app from '../../src/app';
import pool from '../../src/config/database';
import { auth, destroyUser, registerUser, TestUser } from './helpers';

describe('github webhook HMAC', () => {
  let userA: TestUser;
  let boardA: string;
  let openedColA: string;
  let mergedColA: string;
  let secretA = '';
  let repo = '';

  beforeAll(async () => {
    userA = await registerUser('hmac-a');

    const ba = await request(app).get('/api/boards').set(auth(userA));
    boardA = ba.body[0].id;
    const ca = await request(app)
      .get('/api/boards/' + boardA + '/columns')
      .set(auth(userA));
    openedColA = ca.body.find((c: { stage: string }) => c.stage === 'doing').id;
    mergedColA = ca.body.find((c: { stage: string }) => c.stage === 'done').id;

    secretA = crypto.randomBytes(32).toString('hex');
    repo = 'hmac-test/repo-' + Date.now();

    await pool.query(
      'INSERT INTO github_integrations (user_id, access_token, github_login, webhook_secret) VALUES ($1, $2, $3, $4)',
      [userA.id, 'fake-' + userA.id, 'gh-' + userA.id.slice(0, 6), secretA]
    );

    await request(app)
      .post('/api/integrations/github/mapping')
      .set(auth(userA))
      .send({
        board_id: boardA,
        repo_full_name: repo,
        pr_opened_column_id: openedColA,
        pr_merged_column_id: mergedColA,
      });
  }, 180_000);

  afterAll(async () => {
    await pool.query('DELETE FROM github_mappings WHERE repo_full_name = $1', [repo]);
    await pool.query(
      'DELETE FROM github_integrations WHERE user_id = ANY($1::uuid[])',
      [[userA.id]]
    );
    await destroyUser(userA);
  }, 60_000);

  const baseBody = () => ({
    action: 'opened',
    pull_request: { title: 'x', body: '', merged: false },
    repository: { full_name: repo },
  });

  it('rejects a request with no signature header', async () => {
    const res = await request(app)
      .post('/api/integrations/github/webhook')
      .set('x-github-event', 'pull_request')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(baseBody()));
    expect(res.status).toBe(401);
  });

  it('rejects a malformed signature header', async () => {
    const res = await request(app)
      .post('/api/integrations/github/webhook')
      .set('x-github-event', 'pull_request')
      .set('x-hub-signature-256', 'sha256=not-hex-here')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(baseBody()));
    expect(res.status).toBe(401);
  });

 it('rejects a signature that does not start with sha256=', async () => {
   const body = JSON.stringify(baseBody());
   const sig = crypto.createHmac('sha256', secretA).update(body).digest('hex');
   const res = await request(app)
 .post('/api/integrations/github/webhook')
 .set('x-github-event', 'pull_request')
 .set('x-hub-signature-256', sig)
 .set('Content-Type', 'application/json')
 .send(body);
   expect(res.status).toBe(401);
 });

 it('rejects a signed body that was tampered with after signing', async () => {
   const signedBody = JSON.stringify(baseBody());
   const sig = crypto.createHmac('sha256', secretA).update(signedBody).digest('hex');
   const tampered = JSON.stringify({
 ...baseBody(),
 action: 'closed',
 pull_request: { title: 'x', body: '', merged: true },
   });
   const res = await request(app)
 .post('/api/integrations/github/webhook')
 .set('x-github-event', 'pull_request')
 .set('x-hub-signature-256', 'sha256=' + sig)
 .set('Content-Type', 'application/json')
 .send(tampered);
   expect(res.status).toBe(401);
 });

 it('rejects a signature computed with the wrong secret', async () => {
   const body = JSON.stringify(baseBody());
   const wrongSig = crypto
 .createHmac('sha256', 'wrong-secret-that-nobody-uses')
 .update(body)
 .digest('hex');
   const res = await request(app)
 .post('/api/integrations/github/webhook')
 .set('x-github-event', 'pull_request')
 .set('x-hub-signature-256', 'sha256=' + wrongSig)
 .set('Content-Type', 'application/json')
 .send(body);
   expect(res.status).toBe(401);
 });

 it('rejects a signed event for a repo the caller does not own', async () => {
   const body = JSON.stringify({
 ...baseBody(),
 repository: { full_name: 'other-user/not-mine' },
   });
   const sig = crypto.createHmac('sha256', secretA).update(body).digest('hex');
   const res = await request(app)
 .post('/api/integrations/github/webhook')
 .set('x-github-event', 'pull_request')
 .set('x-hub-signature-256', 'sha256=' + sig)
 .set('Content-Type', 'application/json')
 .send(body);
   expect(res.status).toBe(200);
   expect(res.body.ignored).toBe(true);
 });

 it('accepts a correctly signed payload for the mapped repo', async () => {
   const t = await request(app)
 .post('/api/tasks')
 .set(auth(userA))
 .send({ title: 'HMAC happy path', board_id: boardA });
   const shortId = t.body.short_id;
   const body = JSON.stringify({
 ...baseBody(),
 pull_request: { title: 'TUDU-' + shortId, body: '', merged: false },
   });
   const sig = crypto.createHmac('sha256', secretA).update(body).digest('hex');
   const res = await request(app)
 .post('/api/integrations/github/webhook')
 .set('x-github-event', 'pull_request')
 .set('x-hub-signature-256', 'sha256=' + sig)
 .set('Content-Type', 'application/json')
 .send(body);
   expect(res.status).toBe(200);
   expect(res.body.ok).toBe(true);
   const after = await request(app)
 .get('/api/tasks/' + t.body.id)
 .set(auth(userA));
   expect(after.body.column_id).toBe(openedColA);
  });
});
