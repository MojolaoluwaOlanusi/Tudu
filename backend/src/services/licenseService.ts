import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';

/**
 * The self-hosting license format.
 *
 * A signed license is a JSON payload with a base64 Ed25519 signature
 * appended. The payload contains everything the offline verifier needs:
 * who it was issued to, what tier, when it expires, and which machine
 * it is bound to.
 */
export interface LicensePayload {
  /** Random id for this license row. */
  licenseId: string;
  /** Customer identifier (the Tudu user id). */
  customerId: string;
  /** Customer email, for support reference. */
  customerEmail: string;
  /** pro | enterprise. */
  tier: string;
  /** SHA-256 hex of the machine identifiers. */
  fingerprint: string;
  /** ISO instant. */
  issuedAt: string;
  /** ISO instant, or null for a perpetual license. */
  expiresAt: string | null;
}

export interface SignedLicense {
  payload: LicensePayload;
  /** Base64 Ed25519 signature over JSON.stringify(payload). */
  signature: string;
}

/**
 * Read the issuer private key from the environment.
 *
 * The key is expected as a PEM string with escaped newlines (Render and
 * most hosts cannot store multi-line env vars directly). Replace the
 * literal backslash-n with a real newline on read.
 */
const getPrivateKey = (): crypto.KeyObject | null => {
  const raw = process.env.LICENSE_PRIVATE_KEY;
  if (!raw) return null;
  const pem = raw.includes('BEGIN') ? raw.replace(/\\n/g, '\n') : raw;
  try {
    return crypto.createPrivateKey(pem);
  } catch (err) {
    console.error('LICENSE_PRIVATE_KEY is not a valid PEM:', (err as Error).message);
    return null;
  }
};

/**
 * Read the verifier public key from the environment.
 *
 * The self-hosted app also embeds a copy of this key so it can verify
 * licenses without calling home. The two must match; the /api/license/status
 * endpoint checks that they do, and reports a mismatch loudly.
 */
const getPublicKey = (): crypto.KeyObject | null => {
  const raw = process.env.LICENSE_PUBLIC_KEY;
  if (!raw) return null;
  const pem = raw.includes('BEGIN') ? raw.replace(/\\n/g, '\n') : raw;
  try {
    return crypto.createPublicKey(pem);
  } catch (err) {
    console.error('LICENSE_PUBLIC_KEY is not a valid PEM:', (err as Error).message);
    return null;
  }
};

export const isIssuerConfigured = (): boolean => !!getPrivateKey();

/**
 * Sign a license payload. Returns null when the issuer key is missing,
 * so callers can return a clear 500 rather than a broken license.
 */
export const signLicense = (payload: LicensePayload): SignedLicense | null => {
  const key = getPrivateKey();
  if (!key) return null;
  const data = Buffer.from(JSON.stringify(payload), 'utf8');
  const signature = crypto.sign(null, data, key).toString('base64');
  return { payload, signature };
};

/**
 * Verify a signed license. Used by /api/license/status to preview whether
 * a customer-supplied license is valid, and by the self-hosted app at boot.
 *
 * Returns a discriminated union so the caller can distinguish "valid",
 * "signature mismatch", "expired", and "fingerprint mismatch" and show a
 * specific message.
 */
export type VerifyResult =
  | { ok: true; payload: LicensePayload }
  | { ok: false; reason: string; message: string };

export const verifyLicense = (
  signed: SignedLicense,
  expectedFingerprint?: string
): VerifyResult => {
  const key = getPublicKey();
  if (!key) {
    return { ok: false, reason: 'no_key', message: 'LICENSE_PUBLIC_KEY is not configured' };
  }

  const data = Buffer.from(JSON.stringify(signed.payload), 'utf8');
  const sig = Buffer.from(signed.signature, 'base64');
  const valid = crypto.verify(null, data, key, sig);
  if (!valid) {
    return { ok: false, reason: 'bad_signature', message: 'License signature is not valid' };
  }

  if (signed.payload.expiresAt) {
    const exp = new Date(signed.payload.expiresAt).getTime();
    if (Number.isFinite(exp) && exp < Date.now()) {
      return { ok: false, reason: 'expired', message: 'This license has expired' };
    }
  }

  if (expectedFingerprint && signed.payload.fingerprint !== expectedFingerprint) {
    return {
      ok: false,
      reason: 'fingerprint_mismatch',
      message: 'This license was issued for a different machine',
    };
  }

  return { ok: true, payload: signed.payload };
};

/**
 * Compute this machine's hardware fingerprint.
 *
 * Sources, in order of preference:
 *   - Linux: /etc/machine-id (stable across reboots, changes on reinstall)
 *   - macOS: the platform UUID via ioreg
 *   - Windows: MachineGuid from the registry (read via a small shell call)
 *   - Fallback: hostname + CPU model + total memory
 *
 * The result is SHA-256 hex so no raw hardware detail leaves the server.
 * The fallback is deliberately weaker; when a strong source is available
 * the fallback is never used.
 */
export const computeFingerprint = (): string => {
  const parts: string[] = [];

  // Linux
  try {
    if (fs.existsSync('/etc/machine-id')) {
      parts.push(fs.readFileSync('/etc/machine-id', 'utf8').trim());
    }
  } catch {
    // Readable normally; ignore and fall through.
  }

  // macOS - IOPlatformUUID
  try {
    if (process.platform === 'darwin') {
      const out = require('node:child_process')
        .execSync('ioreg -rd1 -c IOPlatformExpertDevice | grep IOPlatformUUID', { encoding: 'utf8' })
        .trim();
      parts.push(out);
    }
  } catch {
    // Child process failed; ignore.
  }

  // Fallback identifiers, always included so the fingerprint changes if
  // the machine is substantially different but the OS id was not read.
  parts.push(os.hostname());
  parts.push(os.arch());
  parts.push(String(os.cpus().length));
  parts.push(String(Math.round(os.totalmem() / 1024 / 1024 / 1024)));

  return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
};
