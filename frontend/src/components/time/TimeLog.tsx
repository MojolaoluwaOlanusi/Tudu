import React, { useState } from 'react';
import {
  useCreateManualEntry,
  useDeleteTimeEntry,
  useTimeEntries,
  formatDuration,
} from '../../hooks/useTime';
import { useUiStore } from '../../store/uiStore';

const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const nowLocal = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    d.getFullYear() +
    '-' + pad(d.getMonth() + 1) +
    '-' + pad(d.getDate()) +
    'T' + pad(d.getHours()) +
    ':' + pad(d.getMinutes())
  );
};

const TimeLog: React.FC = () => {
  const { data, isLoading } = useTimeEntries(30);
  const create = useCreateManualEntry();
  const remove = useDeleteTimeEntry();
  const pushToast = useUiStore((s) => s.pushToast);

  const [startedAt, setStartedAt] = useState('');
  const [endedAt, setEndedAt] = useState('');
  const [description, setDescription] = useState('');
  const [billable, setBillable] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const entries = data?.items ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startedAt || !endedAt) {
      pushToast('Both start and end times are required', 'error');
      return;
    }
    create.mutate(
      {
        startedAt: new Date(startedAt).toISOString(),
        endedAt: new Date(endedAt).toISOString(),
        description: description.trim() || null,
        billable,
      },
      {
        onSuccess: () => {
          pushToast('Entry added', 'success');
          setStartedAt('');
          setEndedAt('');
          setDescription('');
          setBillable(false);
          setShowForm(false);
        },
        onError: (err) => {
          const detail = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
          pushToast(detail || 'Could not add the entry', 'error');
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Delete this time entry?')) return;
    remove.mutate(id, {
      onSuccess: () => pushToast('Entry deleted', 'success'),
      onError: () => pushToast('Could not delete the entry', 'error'),
    });
  };

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-handwritten text-xl text-ink">Time log</h3>
          <p className="text-xs text-ink-muted">Your recent tracked intervals.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!showForm && !startedAt) {
              const end = nowLocal();
              setEndedAt(end);
              const start = new Date();
              start.setHours(start.getHours() - 1);
              const pad = (n: number) => String(n).padStart(2, '0');
              setStartedAt(
                start.getFullYear() +
                  '-' + pad(start.getMonth() + 1) +
                  '-' + pad(start.getDate()) +
                  'T' + pad(start.getHours()) +
                  ':' + pad(start.getMinutes())
              );
            }
            setShowForm((v) => !v);
          }}
          className="btn-ghost !py-1.5 !text-xs"
        >
          {showForm ? 'Cancel' : '+ Add entry'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 space-y-2 rounded-xl border border-hairline bg-surface-2 p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="text-xs text-ink-muted">
              Start
              <input
                type="datetime-local"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
                required
                className="input mt-1 w-full"
              />
            </label>
            <label className="text-xs text-ink-muted">
              End
              <input
                type="datetime-local"
                value={endedAt}
                onChange={(e) => setEndedAt(e.target.value)}
                required
                className="input mt-1 w-full"
              />
            </label>
          </div>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What did you work on? (optional)"
            maxLength={500}
            className="input w-full"
          />
          <label className="flex items-center gap-2 text-xs text-ink">
            <input
              type="checkbox"
              checked={billable}
              onChange={(e) => setBillable(e.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--color-accent)]"
            />
            Billable
          </label>
          <button
            type="submit"
            disabled={create.isPending || !startedAt || !endedAt}
            className="btn-accent rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            {create.isPending ? 'Saving…' : 'Save entry'}
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-ink-muted">
          No time logged yet. Start a timer on a task, or add an entry above.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-hairline bg-surface-2 px-3 py-2 text-xs"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">
                  {entry.task_title ?? entry.description ?? 'Untagged time'}
                </p>
                <p className="text-[11px] text-ink-muted">
                  {formatDateTime(entry.started_at)}
                  {entry.billable && (
                    <span className="ml-1.5 rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent-strong">
                      Billable
                    </span>
                  )}
                </p>
              </div>
              <span className="shrink-0 font-mono text-ink">
                {formatDuration(entry.duration_seconds ?? 0)}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(entry.id)}
                disabled={remove.isPending}
                aria-label="Delete entry"
                className="shrink-0 rounded p-1 text-ink-muted transition-colors hover:text-red-500 disabled:opacity-40"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default TimeLog;
