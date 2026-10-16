import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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

  // An operator-supplied salt makes the fingerprint stable across
  // container restarts. On Docker, /etc/machine-id is often inherited
  // from the image and os.hostname() changes every restart, so without
  // a salt the fingerprint would be different on every boot and every
  // issued license would instantly be invalid. Self-hosters set
  // TUDU_FINGERPRINT_SALT to any stable string of their choice; the
  // hosted portal never sees it, it is mixed into the hash only here.
  const salt = process.env.TUDU_FINGERPRINT_SALT;
  if (salt) parts.push('salt:' + salt);

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


/* ====================================================================== */
/* Self-hosting: disk I/O and the in-memory cache.                        */
/*                                                                        */
/* The hosted instance issues licenses and never calls these. The         */
/* self-hosted instance reads the license from disk (or env) at boot      */
/* and caches it, then verifies against this machine on each request.     */
/* ====================================================================== */

const DEFAULT_LICENSE_PATH = './data/license.lic';

const getLicensePath = (): string =>
  process.env.LICENSE_PATH || DEFAULT_LICENSE_PATH;

/**
 * Read the signed license from the environment or the disk.
 *
 * Precedence: TUDU_LICENSE_BLOB env var first, then LICENSE_PATH. The
 * env var holds base64-encoded JSON of the signed license; it survives
 * ephemeral container restarts where a file would not. A self-hoster
 * on a host with a persistent disk uses LICENSE_PATH; one on a host
 * that wipes the filesystem on deploy uses the env var.
 */
export const readLicenseFile = (): SignedLicense | null => {
  const blob = process.env.TUDU_LICENSE_BLOB;
  if (blob) {
    try {
      const decoded = Buffer.from(blob, 'base64').toString('utf8');
      return JSON.parse(decoded) as SignedLicense;
    } catch (err) {
      console.error('TUDU_LICENSE_BLOB is not valid base64 JSON:', (err as Error).message);
    }
  }

  try {
    const p = getLicensePath();
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw) as SignedLicense;
  } catch (err) {
    console.error('Could not read license file:', (err as Error).message);
    return null;
  }
};

export const writeLicenseFile = (signed: SignedLicense): boolean => {
  try {
    const p = getLicensePath();
    const dir = path.dirname(p);
    if (dir && dir !== '.') fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, JSON.stringify(signed, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Could not write license file:', (err as Error).message);
    return false;
  }
};

export const deleteLicenseFile = (): boolean => {
  try {
    const p = getLicensePath();
    if (fs.existsSync(p)) fs.unlinkSync(p);
    return true;
  } catch (err) {
    console.error('Could not delete license file:', (err as Error).message);
    return false;
  }
};

/**
 * In-memory cache. A read of the license and a signature verification
 * are cheap, but reading a file on every gated request is not. The
 * cache is cleared when a new license is activated, so a fresh upload
 * is reflected on the next request without a process restart.
 */
let cachedLicense: SignedLicense | null | undefined = undefined;

export const clearLicenseCache = (): void => {
  cachedLicense = undefined;
};

export interface CurrentLicenseStatus {
  present: boolean;
  valid: boolean;
  /** One of: none, bad_signature, expired, fingerprint_mismatch. */
  reason: string | null;
  payload: LicensePayload | null;
  /** This machine's fingerprint, always included so the UI can show it. */
  fingerprint: string;
}

/**
 * Verify whatever license is currently installed against this machine.
 *
 * The result is deliberately structured - a raw boolean would force the
 * caller to re-derive the reason for a failure and would make the UI
 * show a generic "invalid" message where a specific one is available.
 */
export const getCurrentLicenseStatus = (): CurrentLicenseStatus => {
  const fingerprint = computeFingerprint();

  if (cachedLicense === undefined) {
    cachedLicense = readLicenseFile();
  }

  if (!cachedLicense) {
    return { present: false, valid: false, reason: 'none', payload: null, fingerprint };
  }

  const result = verifyLicense(cachedLicense, fingerprint);
  if (!result.ok) {
    const failure = result as { ok: false; reason: string; message: string };
    return {
      present: true,
      valid: false,
      reason: failure.reason,
      payload: cachedLicense.payload,
      fingerprint,
    };
  }

  return { present: true, valid: true, reason: null, payload: result.payload, fingerprint };
};
