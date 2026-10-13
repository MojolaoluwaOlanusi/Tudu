import request from 'supertest';
import app from '../../src/app';
import pool from '../../src/config/database';
import { auth, destroyUser, registerUser, TestUser } from './helpers';

/** Feature 4.10 - personal access tokens and the read-only v1 API. */
describe('public API', () => {
  let user: TestUser;
  let createdTokenId: string;
  let createdTokenPlain: string;

  beforeAll(async () => {
    user = await registerUser('apikey');
    // Ensure the user has a board and a task to read.
    await request(app).get('/api/boards').set(auth(user));
    await request(app)
      .post('/api/tasks')
      .set(auth(user))
      .send({ title: 'API-visible task', naturalLanguage: false });
  });

  afterAll(async () => {
    await destroyUser(user);
  });

  it('creates a token and returns the plaintext exactly once', async () => {
    const res = await request(app)
      .post('/api/tokens')
      .set(auth(user))
      .send({ label: 'Test token' });
    expect(res.status).toBe(201);
    expect(res.body.label).toBe('Test token');
    expect(res.body.plaintext).toMatch(/^tudu_pat_/);
    expect(res.body.token_prefix).toBe(res.body.plaintext.slice(0, 17));
    // The response must not leak the hash.
    expect(res.body.token_hash).toBeUndefined();

    createdTokenId = res.body.id;
    createdTokenPlain = res.body.plaintext;
  });

  it('never returns the plaintext again in list', async () => {
    const res = await request(app).get('/api/tokens').set(auth(user));
    expect(res.status).toBe(200);
    const found = (res.body as { id: string; plaintext?: string }[]).find(
      (t) => t.id === createdTokenId
    );
    expect(found).toBeDefined();
    expect(found?.plaintext).toBeUndefined();
  });

  it('authenticates a request to /api/v1/me with the bearer token', async () => {
    const res = await request(app)
      .get('/api/v1/me')
      .set('Authorization', 'Bearer ' + createdTokenPlain);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(user.email);
  });

  it('rejects a malformed bearer token', async () => {
    const res = await request(app)
      .get('/api/v1/me')
      .set('Authorization', 'Bearer not-a-tudu-token');
    expect(res.status).toBe(401);
  });

  it('rejects a well-formed but unknown token', async () => {
    const res = await request(app)
      .get('/api/v1/me')
      .set('Authorization', 'Bearer tudu_pat_' + 'a'.repeat(48));
    expect(res.status).toBe(401);
  });

  it('lists boards over v1', async () => {
    const res = await request(app)
      .get('/api/v1/boards')
      .set('Authorization', 'Bearer ' + createdTokenPlain);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('lists tasks over v1 with pagination', async () => {
    const res = await request(app)
      .get('/api/v1/tasks')
      .query({ limit: 5, offset: 0 })
      .set('Authorization', 'Bearer ' + createdTokenPlain);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.limit).toBe(5);
    expect(res.body.offset).toBe(0);
  });

  it('updates last_used_at on successful auth', async () => {
    const row = await pool.query(
      'SELECT last_used_at FROM api_tokens WHERE id = $1',
      [createdTokenId]
    );
    expect(row.rows[0].last_used_at).not.toBeNull();
  });

  it('revokes a token and immediately rejects subsequent calls', async () => {
    const del = await request(app)
      .delete('/api/tokens/' + createdTokenId)
      .set(auth(user));
    expect(del.status).toBe(200);

    const after = await request(app)
      .get('/api/v1/me')
      .set('Authorization', 'Bearer ' + createdTokenPlain);
    expect(after.status).toBe(401);
  });

  it('does not let one user revoke another user\'s token', async () => {
    const other = await registerUser('apikey-other');
    try {
      const theirs = await request(app)
        .post('/api/tokens')
        .set(auth(other))
        .send({ label: 'Theirs' });

      const attempt = await request(app)
        .delete('/api/tokens/' + theirs.body.id)
        .set(auth(user));
      expect(attempt.status).toBe(404);
    } finally {
      await destroyUser(other);
    }
  });
});
