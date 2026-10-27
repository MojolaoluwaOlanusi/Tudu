import React, { useState } from 'react';
import {
  useWebhookEndpoints,
  useCreateWebhookEndpoint,
  useUpdateWebhookEndpoint,
  useDeleteWebhookEndpoint,
  useWebhookDeliveries,
  useRetryWebhookDelivery,
} from '../../../hooks/useWebhooks';
import { useUiStore } from '../../../store/uiStore';
import { useConfirmStore } from '../../../store/confirmStore';
import { WEBHOOK_EVENTS, type WebhookDelivery, type WebhookEndpoint, type WebhookEvent } from '../../../services/webhookService';
import { PageHeader, Section } from './primitives';

const statusTone = (status: WebhookDelivery['status']): string => {
  switch (status) {
    case 'success': return 'text-brand';
    case 'dead': return 'text-red-400';
    case 'failed': return 'text-amber-400';
    default: return 'text-ink-muted';
  }
};

const DeliveriesList: React.FC<{ endpointId: string }> = ({ endpointId }) => {
  const { data: deliveries = [], isLoading } = useWebhookDeliveries(endpointId);
  const retry = useRetryWebhookDelivery();
  const pushToast = useUiStore((s) => s.pushToast);
  const [limit, setLimit] = useState(10);

  if (isLoading) return <p className="p-3 text-xs text-ink-muted">Loading deliveries…</p>;
  if (deliveries.length === 0) return <p className="p-3 text-xs text-ink-muted">No deliveries yet.</p>;

  const shown = deliveries.slice(0, limit);
  const remaining = deliveries.length - limit;

  return (
    <div className="space-y-1.5 p-3">
      <ul className="space-y-1.5">
        {shown.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line-subtle bg-surface p-2 text-[11px]">
            <span className="font-mono text-ink-muted">{d.event_type}</span>
            <span className={'font-semibold ' + statusTone(d.status)}>{d.status}</span>
            <span className="text-ink-muted">attempts {d.attempt_count}</span>
            {d.status === 'dead' && (
              <button
                type="button"
                onClick={() =>
                  retry.mutate(
                    { deliveryId: d.id, endpointId },
                    { onSuccess: () => pushToast('Delivery requeued', 'success') },
                  )
                }
                disabled={retry.isPending}
                className="ml-auto rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-semibold text-brand hover:border-brand"
              >
                Retry
              </button>
            )}
          </li>
        ))}
      </ul>
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setLimit((v) => v + 10)}
          className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:border-brand hover:text-ink"
        >
          Show more ({remaining} remaining)
        </button>
      )}
    </div>
  );
};

const SettingsWebhooks: React.FC = () => {
  const confirm = useConfirmStore((s) => s.confirm);
  const { data: endpoints = [], isLoading } = useWebhookEndpoints();
  const create = useCreateWebhookEndpoint();
  const update = useUpdateWebhookEndpoint();
  const remove = useDeleteWebhookEndpoint();
  const pushToast = useUiStore((s) => s.pushToast);

  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [events, setEvents] = useState<WebhookEvent[]>([...WEBHOOK_EVENTS]);
  const [justCreated, setJustCreated] = useState<WebhookEndpoint | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleEvent = (e: WebhookEvent) =>
    setEvents((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed.startsWith('https://')) {
      pushToast('URL must start with https://', 'error');
      return;
    }
    if (events.length === 0) {
      pushToast('Select at least one event', 'error');
      return;
    }
    create.mutate(
      { url: trimmed, description: description.trim() || undefined, events },
      {
        onSuccess: (created) => {
          setUrl('');
          setDescription('');
          setEvents([...WEBHOOK_EVENTS]);
          setJustCreated(created);
          pushToast('Endpoint created', 'success');
        },
        onError: () => pushToast('Could not create the endpoint', 'error'),
      },
    );
  };

  return (
    <div>
      <PageHeader title="Webhooks" description="Receive an HTTPS POST for every task mutation. Payloads are signed." />

      {justCreated?.secret && (
        <Section title="Copy this secret now">
          <p className="mb-3 text-xs text-ink-muted">You will not see it again.</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-line bg-canvas px-3 py-2 font-mono text-xs text-ink">
              {justCreated.secret}
            </code>
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

      <Section title="Add an endpoint">
        <form onSubmit={handleCreate} className="space-y-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/hooks/tudu"
            required
            className="w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-ink focus:border-brand focus:outline-none"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            maxLength={255}
            className="w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-ink focus:border-brand focus:outline-none"
          />
          <div className="flex flex-wrap gap-2 text-[11px] text-ink-muted">
            {WEBHOOK_EVENTS.map((event) => (
              <label key={event} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1">
                <input
                  type="checkbox"
                  checked={events.includes(event)}
                  onChange={() => toggleEvent(event)}
                  className="h-3 w-3 accent-[var(--color-accent)]"
                />
                <span className="font-mono">{event}</span>
              </label>
            ))}
          </div>
          <button
            type="submit"
            disabled={create.isPending || !url.trim()}
            className="btn-accent rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Create endpoint
          </button>
        </form>
      </Section>

      <Section title="Your endpoints">
        {isLoading ? (
          <p className="text-sm text-ink-muted">Loading endpoints…</p>
        ) : endpoints.length === 0 ? (
          <p className="text-sm text-ink-muted">No webhook endpoints yet.</p>
        ) : (
          <ul className="space-y-2">
            {endpoints.map((ep) => (
              <li key={ep.id} className="rounded-lg border border-line-subtle bg-canvas">
                <div className="flex flex-wrap items-center gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{ep.url}</p>
                    <p className="truncate text-[11px] text-ink-muted">
                      {ep.description || 'No description'} · {ep.is_active ? 'Active' : 'Paused'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === ep.id ? null : ep.id)}
                    className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink-muted hover:border-brand hover:text-ink"
                  >
                    {expandedId === ep.id ? 'Hide' : 'Deliveries'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      update.mutate({ id: ep.id, is_active: !ep.is_active })
                    }
                    disabled={update.isPending}
                    className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink-muted hover:border-brand hover:text-ink disabled:opacity-50"
                  >
                    {ep.is_active ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await confirm({
                        title: 'Delete endpoint?',
                        message: `Delete the endpoint at ${ep.url}?`,
                        confirmLabel: 'Delete',
                        destructive: true,
                      });
                      if (ok) remove.mutate(ep.id);
                    }}
                    disabled={remove.isPending}
                    className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-red-400 hover:border-red-400/60 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
                {expandedId === ep.id && (
                  <div className="border-t border-line-subtle">
                    <DeliveriesList endpointId={ep.id} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
};

export default SettingsWebhooks;
