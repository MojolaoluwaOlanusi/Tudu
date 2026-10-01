import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSharedList, useUpdateSharedTask, useRemoveShare } from '../../hooks/useSharing';
import Header from '../layout/Header';
import { format } from 'date-fns';

/** Read (and optionally edit) a list somebody shared with me. */
const SharedListView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: share, isLoading, isError } = useSharedList(id ?? null);
  const updateSharedTask = useUpdateSharedTask();
  const removeShare = useRemoveShare();

  const canEdit = share?.permissions === 'read_write';

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-accent" />
      </div>
    );
  }

  if (isError || !share) {
    return (
      <div className="min-h-screen bg-page">
        <Header />
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="card p-8 text-center">
            <p className="text-red-500">This shared list is not available.</p>
            <Link to="/" className="btn-ghost mt-4">
              Back to my tasks
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page">
      <Header />
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-handwritten text-3xl text-ink sm:text-4xl">
              {share.owner?.name || share.owner?.email || 'Shared list'}
            </h2>
            <p className="text-xs text-ink-muted">
              Shared by {share.owner?.email} ·{' '}
              <span className="uppercase">
                {canEdit ? 'you can edit' : 'view only'}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => removeShare.mutate(share.id)}
            className="btn-ghost"
          >
            Remove from my lists
          </button>
        </div>

        {share.tasks.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="font-handwritten text-2xl text-ink-muted">
              This shared list is empty.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {share.tasks.map((task) => (
              <div
                key={task.id}
                className="rounded-2xl border border-hairline border-l-4 border-l-accent bg-surface p-4 shadow-surface"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-ink">{task.title}</h3>
                    {task.description && (
                      <p className="mt-1 text-sm text-ink-muted">{task.description}</p>
                    )}
                  </div>

                  {canEdit ? (
                    <select
                      value={task.status}
                      onChange={(e) =>
                        updateSharedTask.mutate({
                          shareId: share.id,
                          taskId: task.id,
                          status: e.target.value,
                        })
                      }
                      className="rounded-lg border border-hairline bg-surface px-2.5 py-1 text-sm text-ink"
                    >
                      <option value="todo">To-do</option>
                      <option value="doing">Doing</option>
                      <option value="done">Done</option>
                    </select>
                  ) : (
                    <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium uppercase text-ink-muted">
                      {task.status}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {task.category && (
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium capitalize text-ink-muted">
                      {task.category}
                    </span>
                  )}
                  {task.priority && (
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium capitalize text-ink-muted">
                      {task.priority}
                    </span>
                  )}
                  {task.due_date && (
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                      {format(new Date(task.due_date), 'MMM d, yyyy')}
                    </span>
                  )}
                  {(task.subtask_count ?? 0) > 0 && (
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                      {task.subtasks_completed}/{task.subtask_count} sub-tasks
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <Link to="/" className="mt-6 inline-block text-sm font-medium text-accent-strong hover:text-accent">
          ← Back to my tasks
        </Link>
      </div>
    </div>
  );
};

export default SharedListView;