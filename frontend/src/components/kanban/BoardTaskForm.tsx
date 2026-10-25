// src/components/kanban/BoardTaskForm.tsx
import React, { useMemo } from 'react';
import TaskForm from '../tasks/TaskForm';
import { useCreateTask, useUpdateTask } from '../../hooks/useTasks';
import { useKanbanTasks } from '../../hooks/useKanban';
import { useActiveBoardId } from '../../hooks/useBoards';
import { useUiStore } from '../../store/uiStore';
import { isNetworkError, shouldShowQueuedToast } from '../../lib/offlineQueue';
import type { CreateTaskInput } from '../../types/task';

const BoardTaskForm: React.FC = () => {
  const isOpen = useUiStore((s) => s.isTaskFormOpen);
  const editingTaskId = useUiStore((s) => s.editingTaskId);
  const composerColumnId = useUiStore((s) => s.composerColumnId);
  const closeTaskForm = useUiStore((s) => s.closeTaskForm);
  const pushToast = useUiStore((s) => s.pushToast);
  const { data: tasks } = useKanbanTasks();
  const activeBoardId = useActiveBoardId();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const editingTask = useMemo(
    () => tasks?.find((task) => task.id === editingTaskId) ?? null,
    [tasks, editingTaskId]
  );

  if (!isOpen) return null;

  const handleSubmit = async (values: CreateTaskInput) => {
    try {
      if (editingTask) {
        await updateTask.mutateAsync({ id: editingTask.id, task: values });
        pushToast('Task updated', 'success');
      } else {
        await createTask.mutateAsync({
          ...values,
          board_id: activeBoardId ?? undefined,
          column_id: composerColumnId ?? undefined,
        });
        pushToast('Task created', 'success');
      }
      closeTaskForm();
    } catch (err) {
      if (isNetworkError(err)) {
        if (shouldShowQueuedToast()) {
          pushToast('Saved offline — will sync when you reconnect', 'info');
        }
        closeTaskForm();
        return;
      }
      const detail = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      pushToast(detail || 'Could not save the task', 'error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={closeTaskForm}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <TaskForm
          initialTask={editingTask}
          onSubmit={handleSubmit}
          onCancel={closeTaskForm}
          isLoading={createTask.isPending || updateTask.isPending}
        />
      </div>
    </div>
  );
};

export default BoardTaskForm;