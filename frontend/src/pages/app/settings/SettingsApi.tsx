import React, { useState } from 'react';
import { Copy } from 'lucide-react';
import { useApiTokens, useCreateApiToken, useRevokeApiToken } from '../../../hooks/useApiTokens';
import { useUiStore } from '../../../store/uiStore';
import type { ApiToken } from '../../../services/apiTokenService';
import { PageHeader, Section } from './primitives';

const formatDate = (iso: string | null): string => {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Never';
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const SettingsApi: React.FC = () => {
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
        pushToast('Token created. Copy it now.', 'success');
      },
      onError: (err) => {
        const detail = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        pushToast(detail || 'Could not create the token', 'error');
      },
    });
  };

  const handleRevoke = (t: ApiToken) => {
    if (!window.confirm('Revoke ' + t.label + '? Any service using it will lose access immediately.')) return;
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
      pushToast('Could not copy', 'error');
    }
  };

  const busy = create.isPending || revoke.isPending;

  return (
    <div>
      <PageHeader title="API tokens" description="Read-only access to your boards and tasks over HTTPS." />

      {justCreated && justCreated.plaintext && (
        <Section title="Copy this token now">
          <p className="mb-3 text-xs text-ink-muted">
            You will not be able to see it again. If you lose it, revoke it and create a new one.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-line bg-canvas px-3 py-2 font-mono text-xs text-ink">
              {justCreated.plaintext}
            </code>
            <button
              type="button"
              onClick={() => copyPlaintext(justCreated.plaintext!)}
              className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-ink-inverse hover:bg-brand-hover"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={() => setJustCreated(null)}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink-muted hover:text-ink"
            >
              Done
            </button>
          </div>
        </Section>
      )}

      <Section title="Create token">
        <form onSubmit={handleCreate} className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (e.g. Home Assistant)"
            maxLength={255}
            aria-label="Token label"
            className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-ink focus:border-brand focus:outline-none"
          />
          <button
            type="submit"
            disabled={!label.trim() || busy}
            className="btn-accent rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Create token
          </button>
        </form>
      </Section>

      <Section title="Your tokens">
        {isLoading ? (
          <p className="text-sm text-ink-muted">Loading...</p>
        ) : tokens.length === 0 ? (
          <p className="text-sm text-ink-muted">No tokens yet. Create one to use the public API.</p>
        ) : (
          <ul className="space-y-2">
            {tokens.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line-subtle bg-canvas p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{t.label}</p>
                  <p className="truncate text-[11px] text-ink-muted">
                    <code className="font-mono">{t.token_prefix}...</code> · Last used: {formatDate(t.last_used_at)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevoke(t)}
                  disabled={busy}
                  aria-label={'Revoke ' + t.label}
                  className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-red-400 hover:border-red-400/60 disabled:opacity-40"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Example">
        <div className="group relative">
          <pre className="overflow-x-auto rounded-lg bg-canvas p-3 pr-12 font-mono text-[11px] leading-relaxed text-ink-muted">
            {'curl -H "Authorization: Bearer <token>" https://tudu-backend-iuyu.onrender.com/api/v1/tasks'}
          </pre>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  'curl -H "Authorization: Bearer <token>" https://tudu-backend-iuyu.onrender.com/api/v1/tasks'
                );
                pushToast('Copied', 'success');
              } catch {
                pushToast('Could not copy', 'error');
              }
            }}
            aria-label="Copy example"
            className="absolute right-2 top-2 rounded-md border border-line bg-surface p-1.5 text-ink-muted opacity-100 transition-opacity hover:text-ink md:opacity-0 md:group-hover:opacity-100"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-2 text-[11px] text-ink-muted">
          Reads are available on every account. Writes (POST, PUT, DELETE) are a Pro feature.
        </p>
      </Section>
    </div>
  );
};

export default SettingsApi;
