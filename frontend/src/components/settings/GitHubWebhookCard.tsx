import React, { useEffect, useState } from 'react';
import {
  getGithubWebhookSecret,
  rotateGithubWebhookSecret,
} from '../../services/integrationService';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Settings card for the caller's GitHub webhook secret.
 *
 * Shows the payload URL and the secret with copy buttons. The Rotate
 * action invalidates the current secret immediately, so any GitHub
 * webhook still configured with the old value stops delivering
 * until it is updated.
 */
const GitHubWebhookCard: React.FC = () => {
  const { token } = useAuthStore();
  const pushToast = useUiStore((s) => s.pushToast);
  const [secret, setSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const payloadUrl = API_URL + '/api/integrations/github/webhook';

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void (async () => {
      try {
        const s = await getGithubWebhookSecret(token);
        if (!cancelled) setSecret(s.secret);
      } catch {
        if (!cancelled) setSecret(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      pushToast(label + ' copied', 'success');
    } catch {
      pushToast('Could not copy — select and copy it manually', 'error');
    }
  };

  const handleRotate = async () => {
    if (!token) return;
    if (
      !window.confirm(
        'Rotate the secret? Every GitHub webhook using the current value stops delivering until you update the secret in GitHub.',
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const s = await rotateGithubWebhookSecret(token);
      setSecret(s.secret);
      pushToast('Secret rotated. Update the GitHub webhook config.', 'success');
    } catch {
      pushToast('Could not rotate the secret', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <section className="card p-5">
        <p className="text-sm text-ink-muted">Loading webhook config…</p>
      </section>
    );
  }

  if (!secret) {
    return (
      <section className="card p-5">
        <h2 className="mb-2 font-handwritten text-xl text-ink">GitHub webhook</h2>
        <p className="text-sm text-ink-muted">
          Connect GitHub first to receive PR events.
        </p>
      </section>
    );
  }

  return (
    <section className="card p-5">
      <h2 className="mb-2 font-handwritten text-xl text-ink">GitHub webhook</h2>
      <p className="mb-4 text-xs text-ink-muted">
        Add this to your repository's webhook settings. GitHub signs each
        event with the secret below, so only events from GitHub can move a card.
      </p>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            Payload URL
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-hairline bg-surface px-3 py-2 font-mono text-[11px] text-ink">
              {payloadUrl}
            </code>
            <button
              type="button"
              onClick={() => copy(payloadUrl, 'Payload URL')}
              className="rounded-lg border border-hairline bg-surface-2 px-3 py-1.5 text-xs font-semibold text-ink-muted hover:border-accent hover:text-ink"
            >
              Copy
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            Secret
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-hairline bg-surface px-3 py-2 font-mono text-[11px] text-ink">
              {secret}
            </code>
            <button
              type="button"
              onClick={() => copy(secret, 'Secret')}
              className="rounded-lg border border-hairline bg-surface-2 px-3 py-1.5 text-xs font-semibold text-ink-muted hover:border-accent hover:text-ink"
            >
              Copy
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-hairline bg-surface-2 p-3">
          <p className="mb-1 text-xs font-semibold text-ink">In GitHub</p>
          <ul className="ml-4 list-disc space-y-0.5 text-[11px] text-ink-muted">
            <li>Settings → Webhooks → Add webhook</li>
            <li>Payload URL: <code className="font-mono">{payloadUrl}</code></li>
            <li>Content type: <code className="font-mono">application/json</code></li>
            <li>Secret: paste the value above</li>
            <li>Events: <strong>Pull requests</strong> only</li>
          </ul>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleRotate}
            disabled={busy}
            className="rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-red-500 hover:border-red-300 disabled:opacity-50"
          >
            {busy ? 'Rotating…' : 'Rotate secret'}
          </button>
        </div>
      </div>
    </section>
  );
};

export default GitHubWebhookCard;
