import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  useWebhookEndpoints,
  useCreateWebhookEndpoint,
  useUpdateWebhookEndpoint,
  useDeleteWebhookEndpoint,
  useWebhookDeliveries,
  useRetryWebhookDelivery,
} from '../../hooks/useWebhooks';
import { useUiStore } from '../../store/uiStore';
import {
  WEBHOOK_EVENTS,
  type WebhookDelivery,
  type WebhookEndpoint,
  type WebhookEvent,
} from '../../services/webhookService';

interface WebhooksModalProps {
  onClose: () => void;
}

const formatDate = (iso: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return (
    d.toLocaleDateString() +
    ' ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
};

const statusTone = (status: WebhookDelivery['status']): string => {
  switch (status) {
    case 'success': return 'text-green-600 dark:text-green-400';
    case 'dead':    return 'text-red-600 dark:text-red-400';
    case 'failed':  return 'text-amber-600 dark:text-amber-400';
    default:        return 'text-ink-muted';
  }
};

const DeliveriesList: React.FC<{ endpointId: string }> = ({ endpointId }) => {
  const { data: deliveries = [], isLoading } = useWebhookDeliveries(endpointId);
  const retry = useRetryWebhookDelivery();
  const pushToast = useUiStore((s) => s.pushToast);

  if (isLoading) return <p className="p-3 text-xs text-ink-muted">Loading deliveries…</p>;
  if (deliveries.length === 0) return <p className="p-3 text-xs text-ink-muted">No deliveries yet.</p>;

  const handleRetry = (d: WebhookDelivery) => {
    retry.mutate(
      { deliveryId: d.id, endpointId },
      {
        onSuccess: () => pushToast('Delivery requeued', 'success'),
        onError: () => pushToast('Could not requeue the delivery', 'error'),
      },
    );
  };

  return (
    <ul className="space-y-1.5 p-3">
      {deliveries.map((d) => (
        <li
          key={d.id}
          className="flex flex-wrap items-center gap-2 rounded-lg border border-hairline bg-surface p-2 text-[11px]"
        >
          <span className="font-mono text-ink-muted">{d.event_type}</span>
          <span className={`font-semibold ${statusTone(d.status)}`}>{d.status}</span>
          <span className="text-ink-muted">
            attempts {d.attempt_count}
            {d.last_response_status !== null && (
              <> · HTTP {d.last_response_status}</>
            )}
          </span>
          <span className="ml-auto whitespace-nowrap text-ink-muted">
            {formatDate(d.last_attempt_at ?? d.created_at)}
          </span>
          {d.status === 'dead' && (
            <button
              type="button"
              onClick={() => handleRetry(d)}
              disabled={retry.isPending}
              className="rounded-full border border-hairline bg-surface px-2 py-0.5 text-[10px] font-semibold text-accent-strong hover:border-accent disabled:opacity-50"
            >
              Retry
            </button>
          )}
        </li>
      ))}
    </ul>
  );
};

const WebhooksModal: React.FC<WebhooksModalProps> = ({ onClose }) => {
  const { data: endpoints = [], isLoading } = useWebhookEndpoints();
  const create = useCreateWebhookEndpoint();
  const update = useUpdateWebhookEndpoint();
  const remove = useDeleteWebhookEndpoint();
  const pushToast = useUiStore((s) => s.pushToast);

  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<WebhookEvent[]>([...WEBHOOK_EVENTS]);
  const [justCreated, setJustCreated] = useState<WebhookEndpoint | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleEvent = (event: WebhookEvent) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  };

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || !trimmed.startsWith('https://')) {
      pushToast('URL must start with https://', 'error');
      return;
    }
    if (selectedEvents.length === 0) {
      pushToast('Select at least one event', 'error');
      return;
    }
    create.mutate(
      { url: trimmed, description: description.trim() || undefined, events: selectedEvents },
      {
        onSuccess: (created) => {
          setUrl('');
          setDescription('');
          setSelectedEvents([...WEBHOOK_EVENTS]);
          setJustCreated(created);
          pushToast('Endpoint created. Copy its secret now — it will not be shown again.', 'success');
        },
        onError: (err) => {
          const detail = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
          pushToast(detail || 'Could not create the endpoint', 'error');
        },
      },
    );
  };

  const handleToggleActive = (endpoint: WebhookEndpoint) => {
    update.mutate(
      { id: endpoint.id, is_active: !endpoint.is_active },
      {
        onError: (err) => {
          const detail = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
          pushToast(detail || 'Could not update the endpoint', 'error');
        },
      },
    );
  };

  const handleDelete = (endpoint: WebhookEndpoint) => {
    if (!window.confirm('Delete the endpoint at ' + endpoint.url + '? Its delivery history will also be removed.')) return;
    remove.mutate(endpoint.id, {
      onSuccess: () => pushToast('Endpoint deleted', 'success'),
      onError: () => pushToast('Could not delete the endpoint', 'error'),
    });
  };

  const copySecret = async (secret: string) => {
    try {
      await navigator.clipboard.writeText(secret);
      pushToast('Secret copied to clipboard', 'success');
    } catch {
      pushToast('Could not copy — select and copy it manually', 'error');
    }
  };

  const content = (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/60"
      onClick={onClose}
      role="presentation"
      style={{ paddingTop: 'max(4rem, env(safe-area-inset-top, 0px) + 4rem)' }}
    >
      <div className="flex min-h-full items-start justify-center px-3 pb-8 sm:px-4">
        <div
          className="w-full max-w-2xl rounded-2xl border border-hairline bg-surface p-5 shadow-2xl sm:p-6"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Outbound webhooks"
        >
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-handwritten text-2xl text-ink">Webhooks</h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                Receive an HTTPS POST for every task mutation. Payloads are signed with the endpoint secret.
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

          {justCreated && justCreated.secret && (
            <div className="mb-5 rounded-xl border border-accent bg-accent/10 p-4">
              <p className="mb-1 text-sm font-semibold text-ink">Copy this secret now</p>
              <p className="mb-3 text-[11px] text-ink-muted">
                You will not be able to see it again. If you lose it, delete the endpoint and create a new one.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-hairline bg-surface px-3 py-2 font-mono text-xs text-ink">
                  {justCreated.secret}
                </code>
                <button
                  type="button"
                  onClick={() => copySecret(justCreated.secret!)}
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

          <form onSubmit={handleCreate} className="mb-5 space-y-2 rounded-xl border border-hairline bg-surface-2 p-4">
            <p className="text-xs font-semibold text-ink">Add an endpoint</p>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/hooks/tudu"
              required
              className="w-full rounded-lg border border-hairline bg-surface px-2.5 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              maxLength={255}
              className="w-full rounded-lg border border-hairline bg-surface px-2.5 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            />
            <div className="flex flex-wrap gap-2 text-[11px] text-ink-muted">
              {WEBHOOK_EVENTS.map((event) => (
                <label key={event} className="inline-flex items-center gap-1 rounded-full border border-hairline bg-surface px-2.5 py-1">
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(event)}
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
              {create.isPending ? 'Creating…' : 'Create endpoint'}
            </button>
          </form>

          {isLoading ? (
            <p className="text-sm text-ink-muted">Loading endpoints…</p>
          ) : endpoints.length === 0 ? (
            <p className="text-sm text-ink-muted">
              No webhook endpoints yet. Add one above to receive task events.
            </p>
          ) : (
            <ul className="space-y-2">
              {endpoints.map((endpoint) => (
                <li
                  key={endpoint.id}
                  className="rounded-xl border border-hairline bg-surface-2"
                >
                  <div className="flex flex-wrap items-center gap-2 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{endpoint.url}</p>
                      <p className="truncate text-[11px] text-ink-muted">
                        {endpoint.description || 'No description'}
                        {' · '}
                        {endpoint.is_active ? 'Active' : 'Paused'}
                        {' · '}
                        {endpoint.events.length} event{endpoint.events.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExpandedId(expandedId === endpoint.id ? null : endpoint.id)}
                      className="rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink-muted hover:border-accent hover:text-ink"
                    >
                      {expandedId === endpoint.id ? 'Hide deliveries' : 'Deliveries'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(endpoint)}
                      disabled={update.isPending}
                      className="rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink-muted hover:border-accent hover:text-ink disabled:opacity-50"
                    >
                      {endpoint.is_active ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(endpoint)}
                      disabled={remove.isPending}
                      aria-label={'Delete ' + endpoint.url}
                      className="rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-xs font-semibold text-red-400 hover:border-red-400/60 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 px-3 pb-2">
                    {endpoint.events.map((ev) => (
                      <span
                        key={ev}
                        className="rounded-full bg-surface px-2 py-0.5 font-mono text-[10px] text-ink-muted"
                      >
                        {ev}
                      </span>
                    ))}
                  </div>
                  {expandedId === endpoint.id && (
                    <div className="border-t border-hairline">
                      <DeliveriesList endpointId={endpoint.id} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default WebhooksModal;
