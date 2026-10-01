import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSharedList, useUpdateSharedTask, useRemoveShare } from '../../hooks/useSharing';
import { useUiStore } from '../../store/uiStore';
import { CreateTaskInput, Task } from '../../types/task';
import Header from '../layout/Header';
import TaskCard from '../tasks/TaskCard';
import TaskForm from '../tasks/TaskForm';
import Avatar from './Avatar';

/** Read (and optionally edit) a list somebody shared with me. */
const SharedListView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: share, isLoading, isError } = useSharedList(id ?? null);
  const updateSharedTask = useUpdateSharedTask();
  const removeShare = useRemoveShare();
  const pushToast = useUiStore((s) => s.pushToast);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canEdit = share?.permissions === 'read_write';

  const handleStatusChange = (taskId: string, status: Task['status']) => {
    if (!share) return;
    updateSharedTask.mutate(
      { shareId: share.id, taskId, updates: { status } },
      { onError: () => pushToast('Could not update the task', 'error') }
    );
  };

  const handleEditSubmit = async (values: CreateTaskInput) => {
    if (!share || !editingTask) return;
    setIsSubmitting(true);
    try {
      await updateSharedTask.mutateAsync({
        shareId: share.id,
        taskId: editingTask.id,
        updates: {
          title: values.title,
          description: values.description,
          category: values.category,
          priority: values.priority,
          due_date: values.due_date,
        },
      });
      pushToast('Task updated', 'success');
      setEditingTask(null);
    } catch {
      pushToast('Could not update the task', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <div className="flex items-center gap-3">
            <Avatar user={share.owner} size="h-12 w-12" />
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h2 className="font-handwritten text-3xl text-ink sm:text-4xl">
                  {share.owner?.name || share.owner?.email || 'Shared list'}
                </h2>
                <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-accent-strong">
                  Shared
                </span>
              </div>
              <p className="text-xs text-ink-muted">
                Shared with you by {share.owner?.email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => removeShare.mutate(share.id)}
            className="btn-ghost"
          >
            Remove from my lists
          </button>
        </div>

        {/* Spell out exactly what this permission allows. */}
        <div
          className={`mb-6 rounded-xl border px-4 py-3 text-xs ${
            canEdit
              ? 'border-accent bg-accent-soft text-ink'
              : 'border-hairline bg-surface-2 text-ink-muted'
          }`}
        >
          {canEdit
            ? 'You have edit access — change a task status and it saves instantly.'
            : 'You have view-only access, so task statuses are read-only.'}
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
              <TaskCard
                key={task.id}
                task={task}
                isShared
                // Viewers get the same friendly card, just without the
                // controls they are not allowed to use.
                onEdit={canEdit ? (t) => setEditingTask(t) : undefined}
                onStatusChange={
                  canEdit ? (id, status) => handleStatusChange(id, status) : undefined
                }
                readOnlySubtasks
              />
            ))}
          </div>
        )}

        {editingTask && (
          <TaskForm
            initialTask={editingTask}
            onSubmit={handleEditSubmit}
            onCancel={() => setEditingTask(null)}
            isLoading={isSubmitting}
          />
        )}

        <Link to="/" className="mt-6 inline-block text-sm font-medium text-accent-strong hover:text-accent">
          ← Back to my tasks
        </Link>
      </div>
    </div>
  );
};

export default SharedListView;