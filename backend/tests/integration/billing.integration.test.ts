import request from 'supertest';
import app from '../../src/app';
import { auth, destroyUser, registerUser, TestUser } from './helpers';

describe('billing', () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await registerUser('billing');
  });

  afterAll(async () => {
    await destroyUser(user);
  });

  it('GET /api/billing/subscription returns free entitlements for a new user', async () => {
    const res = await request(app)
      .get('/api/billing/subscription')
      .set(auth(user));
    expect(res.status).toBe(200);
    expect(res.body.tier).toBe('free');
    expect(res.body.aiCreditsRemaining).toBe(0);
    expect(res.body.features['ai.breakdown']).toBe(true);
    expect(res.body.features['api.public.write']).toBe(false);
  });

  it('POST /api/billing/checkout rejects a missing plan', async () => {
    const res = await request(app)
      .post('/api/billing/checkout')
      .set(auth(user))
      .send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/billing/checkout rejects an unknown plan', async () => {
    const res = await request(app)
      .post('/api/billing/checkout')
      .set(auth(user))
      .send({ plan: 'not-a-plan' });
    expect(res.status).toBe(404);
  });

  it('GET /api/billing/history returns an empty array for a new user', async () => {
    const res = await request(app)
      .get('/api/billing/history')
      .set(auth(user));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/billing/cancel returns 404 when no active subscription', async () => {
    const res = await request(app)
      .post('/api/billing/cancel')
      .set(auth(user));
    expect(res.status).toBe(404);
  });
});
