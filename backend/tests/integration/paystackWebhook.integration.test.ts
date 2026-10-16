import crypto from 'node:crypto';
import request from 'supertest';
import app from '../../src/app';
import pool from '../../src/config/database';

describe('paystack webhook', () => {
  const secret = 'test_secret_for_webhook_signing';

  beforeAll(() => {
    process.env.PAYSTACK_SECRET_KEY = secret;
  });

  afterAll(() => {
    delete process.env.PAYSTACK_SECRET_KEY;
  });

  const sign = (body: string): string =>
    crypto.createHmac('sha512', secret).update(body).digest('hex');

  it('rejects a request with no signature', async () => {
    const body = JSON.stringify({ event: 'charge.success', data: {} });
    const res = await request(app)
      .post('/api/billing/webhook')
      .set('Content-Type', 'application/json')
      .send(body);
    expect(res.status).toBe(401);
  });

  it('rejects a request with an invalid signature', async () => {
    const body = JSON.stringify({ event: 'charge.success', data: {} });
    const res = await request(app)
      .post('/api/billing/webhook')
      .set('Content-Type', 'application/json')
      .set('x-paystack-signature', 'not-a-real-signature')
      .send(body);
    expect(res.status).toBe(401);
  });

  it('accepts a valid signature and returns 200', async () => {
    const body = JSON.stringify({ event: 'unknown.event', data: {} });
    const res = await request(app)
      .post('/api/billing/webhook')
      .set('Content-Type', 'application/json')
      .set('x-paystack-signature', sign(body))
      .send(body);
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });

  it('a duplicate charge.success does not double-insert the payment row', async () => {
    const user = await pool.query('SELECT id FROM users LIMIT 1');
    if (user.rows.length === 0) return;
    const userId: string = user.rows[0].id;
    const reference = 'test-dup-' + Date.now();

    const event = JSON.stringify({
      event: 'charge.success',
      data: {
        reference,
        amount: 100,
        currency: 'NGN',
        status: 'success',
        channel: 'card',
        metadata: { userId },
      },
    });

    await request(app)
      .post('/api/billing/webhook')
      .set('Content-Type', 'application/json')
      .set('x-paystack-signature', sign(event))
      .send(event);

    await request(app)
      .post('/api/billing/webhook')
      .set('Content-Type', 'application/json')
      .set('x-paystack-signature', sign(event))
      .send(event);

    const rows = await pool.query(
      'SELECT COUNT(*)::int AS n FROM payments WHERE reference = $1',
      [reference]
    );
    expect(rows.rows[0].n).toBe(1);

    await pool.query('DELETE FROM payments WHERE reference = $1', [reference]);
  });
});
