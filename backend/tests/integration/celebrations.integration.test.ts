import request from 'supertest';
import app from '../../src/app';
import { auth, destroyUser, registerUser, TestUser } from './helpers';

/** Feature 4.12 - the celebrations preference. */
describe('celebrations preference', () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await registerUser('celebrations');
  });

  afterAll(async () => {
    await destroyUser(user);
  });

  it('defaults celebrations to true', async () => {
    const res = await request(app)
      .get('/api/users/me/notifications')
      .set(auth(user));
    expect(res.status).toBe(200);
    expect(res.body.celebrations).toBe(true);
  });

  it('toggles celebrations off and back on', async () => {
    const off = await request(app)
      .put('/api/users/me/notifications')
      .set(auth(user))
      .send({ celebrations: false });
    expect(off.status).toBe(200);
    expect(off.body.celebrations).toBe(false);

    const on = await request(app)
      .put('/api/users/me/notifications')
      .set(auth(user))
      .send({ celebrations: true });
    expect(on.status).toBe(200);
    expect(on.body.celebrations).toBe(true);
  });

  it('updates reminders and celebrations together', async () => {
    const res = await request(app)
      .put('/api/users/me/notifications')
      .set(auth(user))
      .send({ reminders: true, celebrations: false });
    expect(res.status).toBe(200);
    expect(res.body.reminders).toBe(true);
    expect(res.body.celebrations).toBe(false);

    await request(app)
      .put('/api/users/me/notifications')
      .set(auth(user))
      .send({ reminders: false, celebrations: true });
  });

  it('rejects a non-boolean celebrations value', async () => {
    const res = await request(app)
      .put('/api/users/me/notifications')
      .set(auth(user))
      .send({ celebrations: 'yes' });
    expect(res.status).toBe(400);
  });

  it('rejects an empty body', async () => {
    const res = await request(app)
      .put('/api/users/me/notifications')
      .set(auth(user))
      .send({});
    expect(res.status).toBe(400);
  });
});
