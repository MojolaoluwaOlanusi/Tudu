import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const auth = (token: string) => ({ Authorization: 'Bearer ' + token });

export type TuduMode = 'cloud' | 'self_hosted';

export interface LicenseRecord {
  id: string;
  fingerprint: string;
  tier: string;
  issuedAt: string;
  expiresAt: string | null;
  notes: string | null;
  license: { payload: unknown; signature: string } | null;
}

/** The current license installed on a self-hosted instance. */
export interface CurrentLicense {
  present: boolean;
  valid: boolean;
  reason: string | null;
  fingerprint: string;
  payload: {
    customerEmail?: string;
    tier?: string;
    expiresAt?: string | null;
    issuedAt?: string;
  } | null;
}

export interface LicenseStatusResponse {
  mode: TuduMode;
  issuerConfigured: boolean;
  current: CurrentLicense | null;
  licenses: LicenseRecord[];
}

export const licenseService = {
  getFingerprint: async (): Promise<{ fingerprint: string }> =>
    (await axios.get(API_URL + '/api/license/fingerprint')).data,

  getStatus: async (token: string): Promise<LicenseStatusResponse> =>
    (await axios.get(API_URL + '/api/license/status', { headers: auth(token) })).data,

  issue: async (
    token: string,
    fingerprint: string,
    note?: string
  ): Promise<LicenseRecord> =>
    (
      await axios.post(
        API_URL + '/api/license/issue',
        { fingerprint, note },
        { headers: auth(token) }
      )
    ).data,


  /** Self-hosted only: install a signed license on this instance. */
  activate: async (
    token: string,
    license: { payload: unknown; signature: string }
  ): Promise<{ ok: boolean; payload: unknown }> =>
    (
      await axios.post(
        API_URL + '/api/license/activate',
        { license },
        { headers: auth(token) }
      )
    ).data,

  /** Self-hosted only: remove the installed license. */
  deactivate: async (token: string): Promise<void> => {
    await axios.delete(API_URL + '/api/license/activate', { headers: auth(token) });
  },

  revoke: async (token: string, id: string): Promise<void> => {
    await axios.delete(API_URL + '/api/license/' + id, { headers: auth(token) });
  },
};
