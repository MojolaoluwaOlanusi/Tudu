import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import request from 'supertest';
import app from '../../src/app';
import { auth, destroyUser, registerUser, TestUser } from './helpers';

/**
 * Feature 5.4b - the self-hosted verifier.
 *
 * These tests switch TUDU_MODE for their whole file and restore it
 * afterwards. Jest runs test files sequentially (maxWorkers: 1), so
 * this is safe: no other file sees self_hosted mode.
 */
describe('self-hosted licensing', () => {
  let user: TestUser;
  let privatePem: string;
  let publicPem: string;
  let licensePath: string;

  beforeAll(async () => {
    process.env.TUDU_MODE = 'self_hosted';
    // Write to a temp file so we never touch a real install.
    licensePath = path.join(os.tmpdir(), 'tudu-test-license-' + Date.now() + '.lic');
    process.env.LICENSE_PATH = licensePath;

    const pair = crypto.generateKeyPairSync('ed25519');
    privatePem = pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    publicPem = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
    process.env.LICENSE_PRIVATE_KEY = privatePem;
    process.env.LICENSE_PUBLIC_KEY = publicPem;

    user = await registerUser('selfhost');
  });

  afterAll(async () => {
    await destroyUser(user);
    delete process.env.TUDU_MODE;
    delete process.env.LICENSE_PATH;
    delete process.env.LICENSE_PRIVATE_KEY;
    delete process.env.LICENSE_PUBLIC_KEY;
    try {
      if (fs.existsSync(licensePath)) fs.unlinkSync(licensePath);
    } catch {
      // best effort
    }
  });

  it('GET /api/license/status reports self_hosted mode', async () => {
    const res = await request(app).get('/api/license/status').set(auth(user));
    expect(res.status).toBe(200);
    expect(res.body.mode).toBe('self_hosted');
    expect(res.body.current.present).toBe(false);
    expect(res.body.current.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it('getEntitlements reports free until a license is installed', async () => {
    const res = await request(app)
      .get('/api/billing/subscription')
      .set(auth(user));
    expect(res.status).toBe(200);
    expect(res.body.tier).toBe('free');
    expect(res.body.features['selfHost.license']).toBe(false);
  });

  it('POST /api/license/activate rejects a malformed payload', async () => {
    const res = await request(app)
      .post('/api/license/activate')
      .set(auth(user))
      .send({ license: { payload: {}, signature: 'x' } });
    expect(res.status).toBe(400);
  });

  it('POST /api/license/activate rejects a valid signature for the wrong machine', async () => {
    // Build a license with a fingerprint that will not match this test host.
    const fakeFp = 'f'.repeat(64);
    const payload = {
      licenseId: 'test-' + Date.now(),
      customerId: user.id,
      customerEmail: user.email,
      tier: 'pro',
      fingerprint: fakeFp,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
    };
    const data = Buffer.from(JSON.stringify(payload), 'utf8');
    const signature = crypto.sign(null, data, privatePem).toString('base64');

    const res = await request(app)
      .post('/api/license/activate')
      .set(auth(user))
      .send({ license: { payload, signature } });
    expect(res.status).toBe(400);
    expect(res.body.reason).toBe('fingerprint_mismatch');
  });

  it('POST /api/license/activate installs a valid license and unlocks Pro', async () => {
    // First read this machine's fingerprint from the API.
    const fpRes = await request(app).get('/api/license/fingerprint');
    const fp: string = fpRes.body.fingerprint;

    const payload = {
      licenseId: 'test-' + Date.now(),
      customerId: user.id,
      customerEmail: user.email,
      tier: 'pro',
      fingerprint: fp,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
    };
    const data = Buffer.from(JSON.stringify(payload), 'utf8');
    const signature = crypto.sign(null, data, privatePem).toString('base64');

    const res = await request(app)
      .post('/api/license/activate')
      .set(auth(user))
      .send({ license: { payload, signature } });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(fs.existsSync(licensePath)).toBe(true);

    // Entitlements now reflect the license.
    const ent = await request(app)
      .get('/api/billing/subscription')
      .set(auth(user));
    expect(ent.body.tier).toBe('pro');
    expect(ent.body.features['selfHost.license']).toBe(true);
  });

  it('DELETE /api/license/activate removes the license', async () => {
    const res = await request(app)
      .delete('/api/license/activate')
      .set(auth(user));
    expect(res.status).toBe(200);
    expect(fs.existsSync(licensePath)).toBe(false);

    const ent = await request(app)
      .get('/api/billing/subscription')
      .set(auth(user));
    expect(ent.body.tier).toBe('free');
  });
});
