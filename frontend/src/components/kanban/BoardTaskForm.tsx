import React, { useMemo } from 'react';
import TaskForm from '../tasks/TaskForm';
import { useCreateTask, useUpdateTask } from '../../hooks/useTasks';
import { useKanbanTasks } from '../../hooks/useKanban';
import { useActiveBoardId } from '../../hooks/useBoards';
import { useUiStore } from '../../store/uiStore';
import type { CreateTaskInput } from '../../types/task';

/**
 * The create / edit form for the Board page.
 *
 * "+ New task" and clicking a card only flip `isTaskFormOpen` in the UI store;
 * the form itself is rendered by TaskList, which is not mounted on /board.
 * This mounts it there, and creates new tasks on the board that is open.
 */
const BoardTaskForm: React.FC = () => {
  const isOpen = useUiStore((s) => s.isTaskFormOpen);
  const editingTaskId = useUiStore((s) => s.editingTaskId);
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
        await createTask.mutateAsync({ ...values, board_id: activeBoardId ?? undefined });
        pushToast('Task created', 'success');
      }
      closeTaskForm();
    } catch (err) {
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
