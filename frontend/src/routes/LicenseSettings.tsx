import React, { useRef, useState } from 'react';
import {
  useLicenseStatus,
  useIssueLicense,
  useRevokeLicense,
  useActivateLicense,
  useDeactivateLicense,
} from '../hooks/useLicense';
import { useUiStore } from '../store/uiStore';
import FeatureGate from '../components/common/FeatureGate';

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Never';
  return d.toLocaleDateString();
};

interface StatusInfo {
  present: boolean;
  valid: boolean;
  reason: string | null;
  fingerprint: string;
  payload: { tier?: string; expiresAt?: string | null; customerEmail?: string } | null;
}

/**
 * The self-hosting settings page.
 *
 * Two shapes. On the hosted instance (cloud) this is the issuer portal
 * where a Pro customer signs licenses for their own servers. On a
 * self-hosted instance this is where the operator installs the license
 * they downloaded from the portal.
 *
 * Which one renders is decided by the `mode` field the API returns, so
 * the same codebase serves both deployments.
 */
const LicenseSettings: React.FC = () => {
  const { data, isLoading } = useLicenseStatus();

  if (isLoading) return <p className="text-sm text-ink-muted">Loading...</p>;
  const mode = data?.mode ?? 'cloud';

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 font-handwritten text-3xl text-ink">Self-hosting</h1>
      <p className="mb-6 text-sm text-ink-muted">
        {mode === 'self_hosted'
          ? 'Install a signed license to unlock Pro features on this server.'
          : 'Generate a signed license for a server you run yourself.'}
      </p>

      {mode === 'self_hosted' ? (
        <ConsumerView status={data?.current ?? null} />
      ) : (
        <IssuerView
          issuerConfigured={data?.issuerConfigured ?? false}
          licenses={data?.licenses ?? []}
        />
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Shared: a fingerprint with a copy button                            */
/* ------------------------------------------------------------------ */

const Fingerprint: React.FC<{ value: string }> = ({ value }) => {
  const pushToast = useUiStore((s) => s.pushToast);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      pushToast('Fingerprint copied', 'success');
    } catch {
      pushToast('Could not copy - select and copy it manually', 'error');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-hairline bg-surface-2 p-2.5">
      <code className="min-w-0 flex-1 overflow-x-auto font-mono text-[11px] text-ink">
        {value}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 rounded-full border border-hairline bg-surface px-2.5 py-1 text-xs font-semibold text-ink-muted hover:border-accent hover:text-ink"
      >
        Copy
      </button>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Issuer view (cloud): sign licenses for customer servers             */
/* ------------------------------------------------------------------ */

interface IssuerViewProps {
  issuerConfigured: boolean;
  licenses: { id: string; fingerprint: string; tier: string; issuedAt: string; expiresAt: string | null; notes: string | null; license: unknown }[];
}

const IssuerView: React.FC<IssuerViewProps> = ({ issuerConfigured, licenses }) => {
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

  return (
    <FeatureGate
      feature="selfHost.license"
      title="Self-hosting is a Pro feature"
      description="Upgrade to issue a license for your own server."
    >
      <section className="card mb-5 p-5">
        <h2 className="mb-3 font-handwritten text-xl text-ink">Issue a license</h2>
        {!issuerConfigured && (
          <p className="mb-3 rounded-lg border border-amber-400/40 bg-amber-400/5 p-3 text-xs text-amber-400">
            The license issuer is not configured on this server. The
            operator needs to set LICENSE_PRIVATE_KEY before licenses can
            be signed.
          </p>
        )}
        <form onSubmit={handleIssue} className="space-y-3">
          <div>
            <label
              htmlFor="lic-fp"
              className="mb-1 block text-xs font-medium text-ink-muted"
            >
              Server fingerprint
            </label>
            <input
              id="lic-fp"
              type="text"
              value={fingerprint}
              onChange={(e) => setFingerprint(e.target.value)}
              placeholder="Paste the 64-character fingerprint from your server"
              className="input w-full font-mono text-xs"
              maxLength={128}
            />
            <p className="mt-1 text-[11px] text-ink-muted">
              On the self-hosted instance open Settings &rarr; Self-hosting to see the
              fingerprint.
            </p>
          </div>
          <div>
            <label
              htmlFor="lic-note"
              className="mb-1 block text-xs font-medium text-ink-muted"
            >
              Note (optional)
            </label>
            <input
              id="lic-note"
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
        {licenses.length === 0 ? (
          <p className="text-sm text-ink-muted">No licenses issued yet.</p>
        ) : (
          <ul className="space-y-2">
            {licenses.map((lic) => (
              <li
                key={lic.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-hairline bg-surface-2 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs text-ink">
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
                  className="rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-xs font-semibold text-red-400 hover:border-red-400/60 disabled:opacity-60"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </FeatureGate>
  );
};

/* ------------------------------------------------------------------ */
/* Consumer view (self-hosted): install a license on this server       */
/* ------------------------------------------------------------------ */

const REASON_LABEL: Record<string, string> = {
  none: 'No license installed',
  bad_signature: 'License signature is not valid',
  expired: 'This license has expired',
  fingerprint_mismatch: 'This license was issued for a different machine',
  no_key: 'This server is missing the verifier key',
};

const ConsumerView: React.FC<{ status: StatusInfo | null }> = ({ status }) => {
  const activate = useActivateLicense();
  const deactivate = useDeactivateLicense();
  const pushToast = useUiStore((s) => s.pushToast);
  const [text, setText] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const content = await file.text();
    setText(content);
  };

  const handleInstall = (e: React.FormEvent) => {
    e.preventDefault();
    let parsed: { payload?: unknown; signature?: string };
    try {
      parsed = JSON.parse(text);
    } catch {
      pushToast('That is not a valid license file', 'error');
      return;
    }
    if (!parsed.payload || !parsed.signature) {
      pushToast('The license file is missing its payload or signature', 'error');
      return;
    }
    activate.mutate(
      { payload: parsed.payload, signature: parsed.signature },
      {
        onSuccess: () => {
          setText('');
          if (fileInput.current) fileInput.current.value = '';
          pushToast('License installed', 'success');
        },
        onError: (err) => {
          const detail = (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data;
          pushToast(detail?.message || detail?.error || 'Could not install the license', 'error');
        },
      }
    );
  };

  const handleRemove = () => {
    if (!window.confirm('Remove the license? Pro features will be locked until you install another one.')) return;
    deactivate.mutate(undefined, {
      onSuccess: () => pushToast('License removed', 'success'),
      onError: () => pushToast('Could not remove the license', 'error'),
    });
  };

  if (!status) {
    return <p className="text-sm text-ink-muted">Loading status...</p>;
  }

  const valid = status.valid;
  const reasonText = status.reason ? REASON_LABEL[status.reason] ?? status.reason : null;

  return (
    <>
      <section className="card mb-5 p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-handwritten text-xl text-ink">Current license</h2>
            <p
              className={
                'mt-1 text-sm font-medium ' + (valid ? 'text-accent-strong' : 'text-amber-400')
              }
            >
              {valid
                ? (status.payload?.tier ?? 'Pro') +
                  ' active' +
                  (status.payload?.expiresAt ? ' until ' + formatDate(status.payload.expiresAt) : '')
                : reasonText}
            </p>
          </div>
          {status.present && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={deactivate.isPending}
              className="shrink-0 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-red-400 hover:border-red-400/60 disabled:opacity-60"
            >
              {deactivate.isPending ? 'Removing...' : 'Remove license'}
            </button>
          )}
        </div>
        <div className="mt-4">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-muted">
            Machine fingerprint
          </p>
          <Fingerprint value={status.fingerprint} />
          <p className="mt-2 text-[11px] text-ink-muted">
            Paste this into the hosted portal at
            tudu-kanban.vercel.app/settings/license to generate a license.
          </p>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-handwritten text-xl text-ink">
          {valid ? 'Replace license' : 'Install a license'}
        </h2>
        <form onSubmit={handleInstall} className="space-y-3">
          <div>
            <input
              ref={fileInput}
              type="file"
              accept=".lic,application/json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
              className="block w-full text-xs text-ink-muted file:mr-3 file:rounded-full file:border file:border-hairline file:bg-surface-2 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ink hover:file:border-accent"
            />
          </div>
          <div>
            <label
              htmlFor="lic-text"
              className="mb-1 block text-xs font-medium text-ink-muted"
            >
              Or paste the license contents
            </label>
            <textarea
              id="lic-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder='{"payload":{...},"signature":"..."}'
              className="input w-full font-mono text-[11px]"
              spellCheck={false}
            />
          </div>
          <button
            type="submit"
            disabled={activate.isPending || !text.trim()}
            className="btn-accent brush-stroke rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {activate.isPending ? 'Verifying...' : 'Install license'}
          </button>
          <p className="text-[11px] text-ink-muted">
            The license is verified against this machine's fingerprint
            before it is saved. A license for a different machine will be
            refused.
          </p>
        </form>
      </section>
    </>
  );
};

export default LicenseSettings;
