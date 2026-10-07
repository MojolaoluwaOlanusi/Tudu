import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from '../services/taskService';
import { useAuthStore } from '../store/authStore';
import { queryKeys } from '../lib/queryClient';
import {
  applyStatusChanges,
  restoreTaskCaches,
  snapshotTaskCaches,
  type TaskCacheSnapshot,
  type TaskMovePatch,
} from '../lib/taskCache';
import { Task, StatusChange } from '../types/task';

/** All tasks for the board (no filters) in one cache entry. */
export const useKanbanTasks = () => {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.tasks.kanban,
    queryFn: () => taskService.getTasks(token!, {}),
    enabled: !!token,
    staleTime: 15_000,
  });
};

/**
 * Move one or more cards to another column.
 * A single card uses the dedicated status endpoint, several cards use the
 * atomic batch endpoint. The cache is updated optimistically and reconciled
 * (or rolled back) from the server response.
 */
export const useMoveTasks = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation<
    Task[],
    unknown,
    StatusChange[],
    { snapshot: TaskCacheSnapshot }
  >({
    mutationFn: async (changes) => {
      if (changes.length === 1) {
        const [change] = changes;
        const updated = await taskService.updateTaskStatus(
          token!,
          change.id,
          change.status,
          change.column_id
        );
        return [updated];
      }
      const result = await taskService.batchUpdateTaskStatus(token!, changes);
      return result.tasks;
    },

    onMutate: async (changes) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all });
      const snapshot = snapshotTaskCaches(queryClient);

      const changesById = changes.reduce<Record<string, TaskMovePatch>>(
        (acc, change) => {
          acc[change.id] =
            change.column_id != null
              ? { status: change.status, column_id: change.column_id }
              : change.status;
          return acc;
        },
        {}
      );
      applyStatusChanges(queryClient, changesById);

      return { snapshot };
    },

    onError: (_error, _changes, context) => {
      if (context?.snapshot) restoreTaskCaches(queryClient, context.snapshot);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
};
