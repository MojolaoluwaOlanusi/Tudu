import crypto from 'node:crypto';
import request from 'supertest';
import app from '../../src/app';
import pool from '../../src/config/database';
import { auth, destroyUser, registerUser, TestUser } from './helpers';

/** Feature 5.4 - the license issuing and verification flow. */
describe('licensing', () => {
  let proUser: TestUser;
  let freeUser: TestUser;

  beforeAll(async () => {
    // Generate a throwaway keypair so the tests are self-contained.
    const pair = crypto.generateKeyPairSync('ed25519');
    const privatePem = pair.privateKey
      .export({ type: 'pkcs8', format: 'pem' })
      .toString();
    const publicPem = pair.publicKey
      .export({ type: 'spki', format: 'pem' })
      .toString();
    process.env.LICENSE_PRIVATE_KEY = privatePem;
    process.env.LICENSE_PUBLIC_KEY = publicPem;

    proUser = await registerUser('license-pro');
    freeUser = await registerUser('license-free');

    // Grant the Pro user an active subscription so requireFeature lets it
    // through. This is the same shape the Paystack webhook writes: a plan
    // reference and an active status.
    await pool.query(
      "INSERT INTO subscriptions (user_id, plan_code, status) VALUES ($1, 'pro_monthly', 'active')",
      [proUser.id]
    );
  });

  afterAll(async () => {
    await destroyUser(proUser);
    await destroyUser(freeUser);
    delete process.env.LICENSE_PRIVATE_KEY;
    delete process.env.LICENSE_PUBLIC_KEY;
  });

  it('GET /api/license/fingerprint returns a hex hash without auth', async () => {
    const res = await request(app).get('/api/license/fingerprint');
    expect(res.status).toBe(200);
    expect(typeof res.body.fingerprint).toBe('string');
    expect(res.body.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it('GET /api/license/status returns an empty list for a new user', async () => {
    const res = await request(app).get('/api/license/status').set(auth(freeUser));
    expect(res.status).toBe(200);
    expect(res.body.licenses).toEqual([]);
    expect(res.body.issuerConfigured).toBe(true);
  });

  it('POST /api/license/issue refuses a free user with 402', async () => {
    const res = await request(app)
      .post('/api/license/issue')
      .set(auth(freeUser))
      .send({ fingerprint: 'a'.repeat(64) });
    expect(res.status).toBe(402);
    expect(res.body.feature).toBe('selfHost.license');
  });

  it('POST /api/license/issue rejects a missing fingerprint for a Pro user', async () => {
    const res = await request(app)
      .post('/api/license/issue')
      .set(auth(proUser))
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/fingerprint/i);
  });

  it('POST /api/license/issue rejects a too-short fingerprint', async () => {
    const res = await request(app)
      .post('/api/license/issue')
      .set(auth(proUser))
      .send({ fingerprint: 'short' });
    expect(res.status).toBe(400);
  });

  it('POST /api/license/issue signs a license for a Pro user', async () => {
    const fingerprint = 'a'.repeat(64);
    const res = await request(app)
      .post('/api/license/issue')
      .set(auth(proUser))
      .send({ fingerprint });
    expect(res.status).toBe(201);
    expect(res.body.fingerprint).toBe(fingerprint);
    expect(res.body.tier).toBe('pro');
    expect(typeof res.body.license.signature).toBe('string');
    expect(res.body.license.payload.fingerprint).toBe(fingerprint);
  });

  it('POST /api/license/verify accepts a freshly issued license', async () => {
    const fingerprint = 'b'.repeat(64);
    const issued = await request(app)
      .post('/api/license/issue')
      .set(auth(proUser))
      .send({ fingerprint });

    const res = await request(app)
      .post('/api/license/verify')
      .send({ license: issued.body.license });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.payload.fingerprint).toBe(fingerprint);
  });

  it('POST /api/license/verify rejects a tampered signature', async () => {
    const res = await request(app)
      .post('/api/license/verify')
      .send({
        license: {
          payload: {
            licenseId: 'x',
            customerId: 'y',
            customerEmail: 'z@example.com',
            tier: 'pro',
            fingerprint: 'a'.repeat(64),
            issuedAt: new Date().toISOString(),
            expiresAt: null,
          },
          signature: 'AAAA',
        },
      });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.reason).toBe('bad_signature');
  });
});