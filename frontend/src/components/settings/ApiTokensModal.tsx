import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  useApiTokens,
  useCreateApiToken,
  useRevokeApiToken,
} from '../../hooks/useApiTokens';
import { useUiStore } from '../../store/uiStore';
import type { ApiToken } from '../../services/apiTokenService';

interface ApiTokensModalProps {
  onClose: () => void;
}

const formatDate = (iso: string | null): string => {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Never';
  return (
    d.toLocaleDateString() +
    ' ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
};

/**
 * Personal access tokens for the read-only public API (feature 4.10).
 *
 * Rendered via a portal to `document.body` so it can never be trapped
 * behind the sticky Header, or by any ancestor that creates a stacking
 * context (transform, filter, backdrop-filter, etc.). z-[100] sits above
 * the Header, the toast container, and the install prompt.
 */
const ApiTokensModal: React.FC<ApiTokensModalProps> = ({ onClose }) => {
  const { data: tokens = [], isLoading } = useApiTokens();
  const create = useCreateApiToken();
  const revoke = useRevokeApiToken();
  const pushToast = useUiStore((s) => s.pushToast);
  const [label, setLabel] = useState('');
  const [justCreated, setJustCreated] = useState<ApiToken | null>(null);

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;
    create.mutate(trimmed, {
      onSuccess: (created) => {
        setLabel('');
        setJustCreated(created);
        pushToast('Token created. Copy it now - it will not be shown again.', 'success');
      },
      onError: (err) => {
        const detail = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        pushToast(detail || 'Could not create the token', 'error');
      },
    });
  };

  const handleRevoke = (t: ApiToken) => {
    if (
      !window.confirm(
        'Revoke ' + JSON.stringify(t.label) + '? Any service using it will lose access immediately.'
      )
    ) {
      return;
    }
    revoke.mutate(t.id, {
      onSuccess: () => pushToast('Token revoked', 'success'),
      onError: () => pushToast('Could not revoke the token', 'error'),
    });
  };

  const copyPlaintext = async (plaintext: string) => {
    try {
      await navigator.clipboard.writeText(plaintext);
      pushToast('Copied to clipboard', 'success');
    } catch {
      pushToast('Could not copy - select and copy it manually', 'error');
    }
  };

  const busy = create.isPending || revoke.isPending;

  const content = (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/60"
      onClick={onClose}
      role="presentation"
      style={{ paddingTop: 'max(4rem, env(safe-area-inset-top, 0px) + 4rem)' }}
    >
      <div className="flex min-h-full items-start justify-center px-3 pb-8 sm:px-4">
        <div
          className="w-full max-w-xl rounded-2xl border border-hairline bg-surface p-5 shadow-2xl sm:p-6"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="API tokens"
        >
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-handwritten text-2xl text-ink">API tokens</h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                Read-only access to your boards and tasks over HTTPS.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-full border border-hairline bg-surface-2 px-3 py-1.5 text-sm text-ink-muted hover:text-ink"
            >
              Close
            </button>
          </div>

          {justCreated && justCreated.plaintext && (
            <div className="mb-5 rounded-xl border border-accent bg-accent/10 p-4">
              <p className="mb-1 text-sm font-semibold text-ink">Copy this token now</p>
              <p className="mb-3 text-[11px] text-ink-muted">
                You will not be able to see it again. If you lose it, revoke it and create a new one.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-hairline bg-surface px-3 py-2 font-mono text-xs text-ink">
                  {justCreated.plaintext}
                </code>
                <button
                  type="button"
                  onClick={() => copyPlaintext(justCreated.plaintext!)}
                  className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white hover:brightness-110"
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => setJustCreated(null)}
                  className="rounded-lg border border-hairline bg-surface px-3 py-2 text-xs font-semibold text-ink-muted hover:text-ink"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleCreate} className="mb-5 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Label (e.g. Home Assistant)"
              maxLength={255}
              aria-label="Token label"
              className="min-w-0 flex-1 rounded-lg border border-hairline bg-surface px-2.5 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            />
            <button
              type="submit"
              disabled={!label.trim() || busy}
              className="btn-accent rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Create token
            </button>
          </form>

          {isLoading ? (
            <p className="text-sm text-ink-muted">Loading...</p>
          ) : tokens.length === 0 ? (
            <p className="text-sm text-ink-muted">
              No tokens yet. Create one to use the public API.
            </p>
          ) : (
            <ul className="space-y-2">
              {tokens.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-hairline bg-surface-2 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{t.label}</p>
                    <p className="truncate text-[11px] text-ink-muted">
                      <code className="font-mono">{t.token_prefix}...</code>
                      {' · '}
                      Last used: {formatDate(t.last_used_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevoke(t)}
                    disabled={busy}
                    aria-label={'Revoke ' + t.label}
                    className="rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:border-red-300 disabled:opacity-40"
                  >
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 rounded-xl border border-hairline bg-surface-2 p-4">
            <p className="mb-2 text-xs font-semibold text-ink">Example</p>
            <pre className="overflow-x-auto rounded-lg bg-surface p-3 font-mono text-[11px] leading-relaxed text-ink-muted">
              {'curl -H ' +
                JSON.stringify('Authorization: Bearer ' + '<token>') +
                ' '}
              {'https://tudu-backend-iuyu.onrender.com/api/v1/tasks'}
            </pre>
            <p className="mt-2 text-[11px] text-ink-muted">
              Read-only for now. Writes are coming in Pro.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Render into document.body so no ancestor stacking context can trap it.
  return createPortal(content, document.body);
};

export default ApiTokensModal;