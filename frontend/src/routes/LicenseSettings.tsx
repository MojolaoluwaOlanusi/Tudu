import React, { useState } from 'react';
import { useLicenseStatus, useIssueLicense, useRevokeLicense } from '../hooks/useLicense';
import { useUiStore } from '../store/uiStore';
import FeatureGate from '../components/common/FeatureGate';

const formatDate = (iso: string | null): string => {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Never';
  return d.toLocaleDateString();
};

/**
 * The self-service licensing portal.
 *
 * A Pro customer pastes the fingerprint their self-hosted server shows,
 * clicks Generate, and downloads a signed license file. The whole loop
 * happens here; no support ticket required.
 */
const LicenseSettings: React.FC = () => {
  const { data, isLoading } = useLicenseStatus();
  const issue = useIssueLicense();
  const revoke = useRevokeLicense();
  const pushToast = useUiStore((s) => s.pushToast);
  const [fingerprint, setFingerprint] = useState('');
  const [note, setNote] = useState('');

  const handleIssue = (e: React.FormEvent) => {
    e.preventDefault();
    const fp = fingerprint.trim();
    if (fp.length < 16) {
      pushToast('That fingerprint looks too short', 'error');
      return;
    }
    issue.mutate(
      { fingerprint: fp, note: note.trim() || undefined },
      {
        onSuccess: () => {
          setFingerprint('');
          setNote('');
          pushToast('License issued', 'success');
        },
        onError: () => pushToast('Could not issue the license', 'error'),
      }
    );
  };

  const download = (license: unknown, id: string) => {
    const blob = new Blob([JSON.stringify(license, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tudu-license-' + id.slice(0, 8) + '.lic';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <p className="text-sm text-ink-muted">Loading...</p>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 font-handwritten text-3xl text-ink">Self-hosting</h1>
      <p className="mb-6 text-sm text-ink-muted">
        Run Tudu on your own server. Generate a license below and paste the
        fingerprint from your self-hosted instance.
      </p>

      <FeatureGate
        feature="selfHost.license"
        title="Self-hosting is a Pro feature"
        description="Upgrade to issue a license for your own server."
      >
        <section className="card mb-5 p-5">
          <h2 className="mb-3 font-handwritten text-xl text-ink">Issue a license</h2>
          <form onSubmit={handleIssue} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Server fingerprint
              </label>
              <input
                type="text"
                value={fingerprint}
                onChange={(e) => setFingerprint(e.target.value)}
                placeholder="Paste the 64-character fingerprint from your server"
                className="input w-full font-mono text-xs"
                maxLength={128}
              />
              <p className="mt-1 text-[11px] text-ink-muted">
                Run Tudu on your server and open Settings &rarr; Self-hosting to
                see the fingerprint, or GET /api/license/fingerprint.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Note (optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Production server, eu-west-1"
                className="input w-full text-sm"
                maxLength={500}
              />
            </div>
            <button
              type="submit"
              disabled={issue.isPending || fingerprint.trim().length < 16}
              className="btn-accent brush-stroke rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {issue.isPending ? 'Signing...' : 'Generate license'}
            </button>
          </form>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 font-handwritten text-xl text-ink">Your licenses</h2>
          {!data || data.licenses.length === 0 ? (
            <p className="text-sm text-ink-muted">No licenses issued yet.</p>
          ) : (
            <ul className="space-y-2">
              {data.licenses.map((lic) => (
                <li
                  key={lic.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-hairline bg-surface-2 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-mono text-ink">
                      {lic.fingerprint.slice(0, 16)}...
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-muted">
                      Issued {formatDate(lic.issuedAt)} · expires {formatDate(lic.expiresAt)}
                      {lic.notes ? ' · ' + lic.notes : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => download(lic.license, lic.id)}
                    className="rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink hover:border-accent"
                  >
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm('Revoke this license?')) return;
                      revoke.mutate(lic.id, {
                        onSuccess: () => pushToast('License revoked', 'success'),
                        onError: () => pushToast('Could not revoke', 'error'),
                      });
                    }}
                    disabled={revoke.isPending}
                    className="rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:border-red-300 disabled:opacity-60"
                  >
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </FeatureGate>
    </div>
  );
};

export default LicenseSettings;
