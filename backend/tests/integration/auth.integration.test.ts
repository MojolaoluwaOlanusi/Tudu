import request from 'supertest';
import app from '../../src/app';
import { registerUser, destroyUser, uniqueEmail, PASSWORD, auth } from './helpers';

/**
 * The authentication flow, exercised end to end against the real database:
 * register -> login -> use the token -> /auth/me.
 */
describe('authentication flow', () => {
  const created: { id: string }[] = [];

  afterAll(async () => {
    for (const user of created) await destroyUser(user);
  });

  it('registers a user and returns a usable token', async () => {
    const email = uniqueEmail('register');
    const res = await request(app).post('/auth/register').send({ email, password: PASSWORD });

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toBe(email);
    // The password must never come back out.
    expect(JSON.stringify(res.body)).not.toContain(PASSWORD);
    created.push({ id: res.body.user.id });
  });

  it('defaults the display name from the email', async () => {
    const email = uniqueEmail('named');
    const res = await request(app).post('/auth/register').send({ email, password: PASSWORD });

    expect(res.body.user.name).toBe(email.split('@')[0]);
    created.push({ id: res.body.user.id });
  });

  it('rejects a duplicate email rather than creating a second account', async () => {
    const user = await registerUser('dupe');
    created.push(user);

    const res = await request(app)
      .post('/auth/register')
      .send({ email: user.email, password: PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it.each([
    ['email', { password: PASSWORD }],
    ['password', { email: 'someone@example.test' }],
    ['both', {}],
  ])('requires %s', async (_label, body) => {
    const res = await request(app).post('/auth/register').send(body);
    expect(res.status).toBe(400);
  });

  it('logs in with the right password and rejects the wrong one', async () => {
    const user = await registerUser('login');
    created.push(user);

    const ok = await request(app)
      .post('/auth/login')
      .send({ email: user.email, password: PASSWORD });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toEqual(expect.any(String));

    const bad = await request(app)
      .post('/auth/login')
      .send({ email: user.email, password: 'wrong-password' });
    expect(bad.status).toBe(401);
  });

  it('does not reveal whether an email exists when logging in', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: uniqueEmail('ghost'), password: PASSWORD });

    expect(res.status).toBe(401);
    expect(JSON.stringify(res.body)).not.toMatch(/not found|no such user/i);
  });

  it('resolves the signed-in user from the token', async () => {
    const user = await registerUser('me');
    created.push(user);

    const res = await request(app).get('/auth/me').set(auth(user));

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(user.email);
  });

  it.each([
    ['no header', undefined],
    ['garbage token', 'Bearer not-a-real-token'],
    ['empty bearer', 'Bearer '],
  ])('refuses /auth/me with %s', async (_label, header) => {
    const req = request(app).get('/auth/me');
    if (header) req.set('Authorization', header);
    expect((await req).status).toBe(401);
  });

  it('refuses protected task routes without a token', async () => {
    await expect(request(app).get('/api/tasks').then((r) => r.status)).resolves.toBe(401);
  });
});