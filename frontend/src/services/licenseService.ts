import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const auth = (token: string) => ({ Authorization: 'Bearer ' + token });

export interface LicenseRecord {
  id: string;
  fingerprint: string;
  tier: string;
  issuedAt: string;
  expiresAt: string | null;
  notes: string | null;
  license: { payload: unknown; signature: string } | null;
}

export const licenseService = {
  getFingerprint: async (): Promise<{ fingerprint: string }> =>
    (await axios.get(API_URL + '/api/license/fingerprint')).data,

  getStatus: async (token: string): Promise<{ issuerConfigured: boolean; licenses: LicenseRecord[] }> =>
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

  revoke: async (token: string, id: string): Promise<void> => {
    await axios.delete(API_URL + '/api/license/' + id, { headers: auth(token) });
  },
};
