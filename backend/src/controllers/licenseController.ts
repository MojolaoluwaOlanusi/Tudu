import { Request, Response } from 'express';
import crypto from 'node:crypto';
import pool from '../config/database';
import {
  computeFingerprint,
  isIssuerConfigured,
  signLicense,
  verifyLicense,
  type LicensePayload,
} from '../services/licenseService';

/**
 * GET /api/license/fingerprint
 *
 * Returns this server's own hardware fingerprint. A self-hosting
 * customer runs the app, opens the self-service portal, and copies the
 * value they see here into the hosted portal to generate a license.
 */
export const getFingerprint = (_req: Request, res: Response) => {
  res.json({ fingerprint: computeFingerprint() });
};

/**
 * POST /api/license/issue - body: { fingerprint, note? }.
 *
 * Signs a license for the given fingerprint and stores it. Caller must
 * be Pro; the portal is gated on selfHost.license server-side.
 */
export const issueLicense = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const email = req.user?.email;
    if (!userId || !email) return res.status(401).json({ error: 'Unauthorized' });

    if (!isIssuerConfigured()) {
      return res.status(500).json({
        error: 'The license issuer is not configured on this server',
      });
    }

    const rawFp = (req.body ?? {}).fingerprint;
    if (typeof rawFp !== 'string' || rawFp.length < 16 || rawFp.length > 128) {
      return res.status(400).json({ error: 'fingerprint is required' });
    }
    const fingerprint = rawFp.trim();

    const note = typeof (req.body ?? {}).note === 'string'
      ? String((req.body ?? {}).note).slice(0, 500)
      : null;

    // Expire in 1 year by default; a yearly subscription renews the
    // license. Set expiry to null for a perpetual enterprise license.
    const expiresAt = new Date(Date.now() + 365 * 24 * 3600 * 1000);

    const licenseId = crypto.randomUUID();
    const payload: LicensePayload = {
      licenseId,
      customerId: userId,
      customerEmail: email,
      tier: 'pro',
      fingerprint,
      issuedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    const signed = signLicense(payload);
    if (!signed) {
      return res.status(500).json({ error: 'Could not sign the license' });
    }

    await pool.query(
      'INSERT INTO licenses ' +
        '(id, user_id, fingerprint, tier, signed_blob, expires_at, notes) ' +
        'VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [
        licenseId,
        userId,
        fingerprint,
        'pro',
        JSON.stringify(signed),
        expiresAt,
        note,
      ]
    );

    res.status(201).json({
      licenseId,
      fingerprint,
      tier: 'pro',
      issuedAt: payload.issuedAt,
      expiresAt: payload.expiresAt,
      license: signed,
    });
  } catch (error) {
    console.error('Error issuing license:', error);
    res.status(500).json({ error: 'Failed to issue the license' });
  }
};

/**
 * GET /api/license/status - list the caller's licenses.
 *
 * Used by the portal to show a customer what they have already issued
 * for which machine, and to let them re-download a lost license.
 */
export const getLicenseStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      'SELECT id, fingerprint, tier, signed_blob, issued_at, expires_at, revoked_at, notes ' +
        'FROM licenses WHERE user_id = $1 AND revoked_at IS NULL ' +
        'ORDER BY issued_at DESC',
      [userId]
    );

    res.json({
      issuerConfigured: isIssuerConfigured(),
      licenses: result.rows.map((r) => ({
        id: r.id,
        fingerprint: r.fingerprint,
        tier: r.tier,
        issuedAt: r.issued_at,
        expiresAt: r.expires_at,
        notes: r.notes,
        license: r.signed_blob ? JSON.parse(r.signed_blob) : null,
      })),
    });
  } catch (error) {
    console.error('Error fetching licenses:', error);
    res.status(500).json({ error: 'Failed to fetch licenses' });
  }
};

/**
 * POST /api/license/verify - body: { license }.
 *
 * Previews whether a signed license would be accepted by a self-hosted
 * app. Does not require the fingerprint to match; the caller might be
 * checking before copying the license to the target machine.
 */
export const verifyLicenseEndpoint = async (req: Request, res: Response) => {
  try {
    const raw = (req.body ?? {}).license;
    if (!raw || typeof raw !== 'object') {
      return res.status(400).json({ error: 'license is required' });
    }
    const signed = raw as { payload: LicensePayload; signature: string };
    const result = verifyLicense(signed);

    // A local annotation instead of relying on discriminated-union
    // narrowing: under `strict: false` the compiler does not reliably
    // narrow `result` inside the guard below.
    if (!result.ok) {
      const failure = result as { ok: false; reason: string; message: string };
      return res
        .status(400)
        .json({ ok: false, reason: failure.reason, message: failure.message });
    }
    res.json({ ok: true, payload: result.payload });
  } catch (error) {
    console.error('Error verifying license:', error);
    res.status(500).json({ error: 'Failed to verify the license' });
  }
};

/**
 * DELETE /api/license/:id - revoke a license.
 *
 * Offline verification means a revoked license keeps working until the
 * customer's app checks again. That is the trade-off of offline: there
 * is no way to force a remote kill. A short expiry window plus a renewal
 * flow is the standard mitigation.
 */
export const revokeLicense = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      'UPDATE licenses SET revoked_at = NOW() ' +
        'WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL RETURNING id',
      [id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'License not found' });
    }
    res.json({ message: 'License revoked' });
  } catch (error) {
    console.error('Error revoking license:', error);
    res.status(500).json({ error: 'Failed to revoke the license' });
  }
};
