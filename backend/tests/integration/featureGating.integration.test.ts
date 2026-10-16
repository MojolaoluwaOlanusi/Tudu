import request from 'supertest';
import app from '../../src/app';
import { auth, destroyUser, registerUser, TestUser } from './helpers';

describe('feature gating', () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await registerUser('gating');
  });

  afterAll(async () => {
    await destroyUser(user);
  });

  it('refuses the HD endpoint to a free user with 402 and an upgrade hint', async () => {
    const res = await request(app)
      .post('/api/ai/hd/breakdown')
      .set(auth(user))
      .send({ title: 'Plan a launch' });
    expect(res.status).toBe(402);
    expect(res.body.feature).toBe('ai.breakdown.hd');
    expect(res.body.currentTier).toBe('free');
    expect(res.body.upgrade_url).toBe('/pricing');
  });

  it('reports the correct tier via /api/billing/subscription', async () => {
    const res = await request(app)
      .get('/api/billing/subscription')
      .set(auth(user));
    expect(res.status).toBe(200);
    expect(res.body.tier).toBe('free');
    expect(res.body.features['ai.breakdown.hd']).toBe(false);
    expect(res.body.features['ai.breakdown']).toBe(true);
  });

  it('refuses unauthenticated callers with 401 before the feature check', async () => {
    const res = await request(app)
      .post('/api/ai/hd/breakdown')
      .send({ title: 'Plan a launch' });
    expect(res.status).toBe(401);
  });
});
