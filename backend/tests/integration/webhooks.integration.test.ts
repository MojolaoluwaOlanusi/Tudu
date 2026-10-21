import http from 'node:http';
import crypto from 'node:crypto';
import type { AddressInfo } from 'net';
import request from 'supertest';
import app from '../../src/app';
import pool from '../../src/config/database';
import { processPendingDeliveries } from '../../src/services/webhookService';
import { auth, destroyUser, registerUser, TestUser } from './helpers';

/**
 * Feature 5.9 - outbound webhooks.
 *
 * A throwaway HTTP server stands in for the subscriber, so the tests
 * exercise the real fetch path (signature, headers, status handling) rather
 * than a mock of it.
 */
describe('outbound webhooks', () => {
  let user: TestUser;
  let apiToken: string;
  let receiver: http.Server;
  let receiverUrl: string;
  let received: Array<{ headers: http.IncomingHttpHeaders; body: string }> = [];
  let responseStatus = 200;

  /** /api/v1 is authenticated with an API token, not the login JWT. */
  const apiAuth = () => ({ Authorization: 'Bearer ' + apiToken });

  /**
   * Run the delivery worker until this endpoint's delivery has been attempted
   * `attempts` times. The worker claims due rows from the WHOLE table (10 at a
   * time), so on a shared database a leftover row from another run could take
   * a slot; looping makes the test independent of that. Forcing next_attempt_at
   * skips the real backoff schedule.
   */
  const tickUntilAttempts = async (endpointId: string, attempts: number) => {
    for (let i = 0; i < 20; i += 1) {
      await pool.query(
        "UPDATE webhook_deliveries SET next_attempt_at = NOW() " +
          "WHERE endpoint_id = $1 AND status IN ('pending', 'failed')",
        [endpointId]
      );
      await processPendingDeliveries();
      const row = await pool.query(
        'SELECT attempt_count FROM webhook_deliveries WHERE endpoint_id = $1',
        [endpointId]
      );
      if (row.rows[0] && row.rows[0].attempt_count >= attempts) return;
    }
  };

  beforeAll(async () => {
    user = await registerUser('webhooks');
    await pool.query(
      "INSERT INTO subscriptions (user_id, plan_code, status) VALUES ($1, 'pro_monthly', 'active')",
      [user.id]
    );

    // Create an API token through the real endpoint (login JWT), then use it
    // for the /api/v1 calls below.
    const tokenRes = await request(app)
      .post('/api/tokens')
      .set(auth(user))
      .send({ label: 'webhook tests' });
    // createToken returns the plaintext token exactly once, in `plaintext`.
    const issued = tokenRes.body?.plaintext;
    if (tokenRes.status >= 300 || typeof issued !== 'string') {
      throw new Error(
        'Could not create an API token for the test. Status ' +
          tokenRes.status +
          ', response: ' +
          JSON.stringify(tokenRes.body)
      );
    }
    apiToken = issued;

    receiver = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        received.push({ headers: req.headers, body });
        res.statusCode = responseStatus;
        res.end('ok');
      });
    });
    await new Promise<void>((resolve) => receiver.listen(0, resolve));
    const { port } = receiver.address() as AddressInfo;
    // The controller requires https://. In tests we bypass the check by
    // inserting the row directly with an http URL.
    receiverUrl = 'http://127.0.0.1:' + port + '/hook';
  });

  afterAll(async () => {
    await pool.query('DELETE FROM webhook_endpoints WHERE user_id = $1', [user.id]);
    await destroyUser(user);
    await new Promise<void>((resolve) => receiver.close(() => resolve()));
  });

  it('creates an endpoint and returns its secret once', async () => {
    const res = await request(app)
      .post('/api/webhooks')
      .set(auth(user))
      .send({ url: 'https://example.com/hook', description: 'My first endpoint' });

    expect(res.status).toBe(201);
    expect(res.body.secret).toMatch(/^[0-9a-f]{64}$/);
    expect(res.body.events).toEqual(
      expect.arrayContaining(['task.created', 'task.updated', 'task.moved', 'task.deleted'])
    );
  });

  it('rejects a non-https URL', async () => {
    const res = await request(app)
      .post('/api/webhooks')
      .set(auth(user))
      .send({ url: 'http://insecure.local/hook' });
    expect(res.status).toBe(400);
  });

  it('rejects an unknown event', async () => {
    const res = await request(app)
      .post('/api/webhooks')
      .set(auth(user))
      .send({ url: 'https://example.com/hook', events: ['task.created', 'project.exploded'] });
    expect(res.status).toBe(400);
  });

  it('delivers a signed request and records success', async () => {
    // Earlier tests leave endpoints behind (one points at example.com). Remove
    // them so this task only queues a delivery to our local receiver and the
    // test never makes a real network call.
    await pool.query('DELETE FROM webhook_endpoints WHERE user_id = $1', [user.id]);

    const created = await request(app)
      .post('/api/webhooks')
      .set(auth(user))
      .send({ url: 'https://placeholder.example.com/hook', events: ['task.created'] });
    const endpointId = created.body.id;
    const secret = created.body.secret;

    // Swap the stored URL to the local receiver (the controller enforces
    // https, but the worker does not care which scheme it is given).
    await pool.query('UPDATE webhook_endpoints SET url = $1 WHERE id = $2', [
      receiverUrl,
      endpointId,
    ]);

    received = [];
    responseStatus = 200;

    const task = await request(app)
      .post('/api/v1/tasks')
      .set(apiAuth())
      .send({ title: 'Webhook delivery target', naturalLanguage: false });
    expect(task.status).toBe(201);

    await tickUntilAttempts(endpointId, 1);

    expect(received.length).toBe(1);
    const got = received[0];
    expect(got.headers['webhook-id']).toBeDefined();
    expect(got.headers['webhook-timestamp']).toBeDefined();

    // Verify the signature exactly as a customer would.
    const timestamp = Number(got.headers['webhook-timestamp']);
    const toSign = got.headers['webhook-id'] + '.' + timestamp + '.' + got.body;
    const expected = 'v1,' + crypto.createHmac('sha256', secret).update(toSign).digest('base64');
    expect(got.headers['webhook-signature']).toBe(expected);

    const deliveryRow = await pool.query(
      'SELECT status, attempt_count FROM webhook_deliveries WHERE endpoint_id = $1',
      [endpointId]
    );
    expect(deliveryRow.rows[0].status).toBe('success');
  });

  it('marks the delivery dead after 6 failed attempts', async () => {
    await pool.query('DELETE FROM webhook_endpoints WHERE user_id = $1', [user.id]);

    const created = await request(app)
      .post('/api/webhooks')
      .set(auth(user))
      .send({ url: 'https://placeholder.example.com/hook', events: ['task.created'] });
    const endpointId = created.body.id;

    await pool.query('UPDATE webhook_endpoints SET url = $1 WHERE id = $2', [
      receiverUrl,
      endpointId,
    ]);

    received = [];
    responseStatus = 500;

    const task = await request(app)
      .post('/api/v1/tasks')
      .set(apiAuth())
      .send({ title: 'Will keep failing', naturalLanguage: false });
    expect(task.status).toBe(201);

    await tickUntilAttempts(endpointId, 6);

    const row = await pool.query(
      'SELECT status, attempt_count FROM webhook_deliveries WHERE endpoint_id = $1',
      [endpointId]
    );
    expect(row.rows[0].status).toBe('dead');
    expect(row.rows[0].attempt_count).toBe(6);
  });
});
