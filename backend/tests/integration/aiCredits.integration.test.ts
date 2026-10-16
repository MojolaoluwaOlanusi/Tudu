import request from 'supertest';
import app from '../../src/app';
import pool from '../../src/config/database';
import { auth, destroyUser, registerUser, TestUser } from './helpers';
import { grantCredits, getBalance } from '../../src/services/aiCreditService';

describe('ai credits', () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await registerUser('ai-credits');
  });

  afterAll(async () => {
    await destroyUser(user);
  });

  it('a free user is not metered on the free AI route', async () => {
    // We do not call the provider in tests; the request will fail at the
    // provider layer with a 502/400, which is fine. What matters is that
    // no ledger entry is created for a free user.
    await request(app)
      .post('/api/ai/breakdown')
      .set(auth(user))
      .send({ title: 'Plan a launch' });

    const ledger = await pool.query(
      'SELECT COUNT(*)::int AS n FROM ai_credit_ledger WHERE user_id = $1',
      [user.id]
    );
    expect(ledger.rows[0].n).toBe(0);
  });

  it('the entitlement endpoint reports a zero balance for a free user', async () => {
    const res = await request(app)
      .get('/api/billing/subscription')
      .set(auth(user));
    expect(res.status).toBe(200);
    expect(res.body.aiCreditsRemaining).toBe(0);
  });

  it('the credit purchase endpoint rejects an unknown bundle', async () => {
    const res = await request(app)
      .post('/api/billing/ai-credits/checkout')
      .set(auth(user))
      .send({ bundle: 'not-a-bundle' });
    expect(res.status).toBe(404);
  });

  it('the credit purchase endpoint rejects a missing bundle', async () => {
    const res = await request(app)
      .post('/api/billing/ai-credits/checkout')
      .set(auth(user))
      .send({});
    expect(res.status).toBe(400);
  });

  it('grantCredits inserts a positive ledger row', async () => {
    await grantCredits(user.id, 100, 'test_grant');
    const balance = await getBalance(user.id);
    expect(balance).toBe(100);
    await pool.query('DELETE FROM ai_credit_ledger WHERE user_id = $1', [user.id]);
  });
});