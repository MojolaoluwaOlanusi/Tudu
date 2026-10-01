import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subtaskService } from '../services/subtaskService';
import { useAuthStore } from '../store/authStore';
import { queryKeys } from '../lib/queryClient';
import { adjustSubtaskCounts } from '../lib/taskCache';
import { Subtask, UpdateSubtaskInput } from '../types/task';

export const useSubtasks = (taskId: string | null) => {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.subtasks.list(taskId ?? 'none'),
    queryFn: () => subtaskService.getSubtasks(token!, taskId!),
    enabled: !!token && !!taskId,
  });
};

export const useCreateSubtask = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, title }: { taskId: string; title: string }) =>
      subtaskService.createSubtask(token!, taskId, { title }),

    onMutate: async ({ taskId, title }) => {
      const key = queryKeys.subtasks.list(taskId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Subtask[]>(key);

      const optimistic: Subtask = {
        id: `optimistic-${Date.now()}`,
        task_id: taskId,
        title,
        completed: false,
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData<Subtask[]>(key, (old) =>
        old ? [...old, optimistic] : [optimistic]
      );
      adjustSubtaskCounts(queryClient, taskId, { total: 1 });

      return { previous, taskId };
    },

    onError: (_error, _variables, context) => {
      if (!context) return;
      const key = queryKeys.subtasks.list(context.taskId);
      if (context.previous) queryClient.setQueryData(key, context.previous);
      else queryClient.removeQueries({ queryKey: key });
      adjustSubtaskCounts(queryClient, context.taskId, { total: -1 });
    },

    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.subtasks.list(variables.taskId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      // Shared lists render the same sub-task counts.
      queryClient.invalidateQueries({ queryKey: queryKeys.shares.all });
    },
  });
};

export const useUpdateSubtask = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      subtaskId,
      updates,
    }: {
      taskId: string;
      subtaskId: string;
      updates: UpdateSubtaskInput;
    }) => subtaskService.updateSubtask(token!, taskId, subtaskId, updates),

    onMutate: async ({ taskId, subtaskId, updates }) => {
      const key = queryKeys.subtasks.list(taskId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Subtask[]>(key);
      const existing = previous?.find((subtask) => subtask.id === subtaskId);

      queryClient.setQueryData<Subtask[]>(key, (old) =>
        old
          ? old.map((subtask) =>
              subtask.id === subtaskId ? { ...subtask, ...updates } : subtask
            )
          : old
      );

      // Only nudge the "completed" counter when the tick really changes.
      let completedDelta = 0;
      if (
        existing &&
        updates.completed !== undefined &&
        updates.completed !== existing.completed
      ) {
        completedDelta = updates.completed ? 1 : -1;
        adjustSubtaskCounts(queryClient, taskId, { completed: completedDelta });
      }

      return { previous, taskId, completedDelta };
    },

    onError: (_error, _variables, context) => {
      if (!context) return;
      if (context.previous) {
        queryClient.setQueryData(
          queryKeys.subtasks.list(context.taskId),
          context.previous
        );
      }
      if (context.completedDelta) {
        adjustSubtaskCounts(queryClient, context.taskId, {
          completed: -context.completedDelta,
        });
      }
    },

    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.subtasks.list(variables.taskId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      // Shared lists render the same sub-task counts.
      queryClient.invalidateQueries({ queryKey: queryKeys.shares.all });
    },
  });
};

export const useDeleteSubtask = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, subtaskId }: { taskId: string; subtaskId: string }) =>
      subtaskService.deleteSubtask(token!, taskId, subtaskId),

    onMutate: async ({ taskId, subtaskId }) => {
      const key = queryKeys.subtasks.list(taskId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Subtask[]>(key);
      const existing = previous?.find((subtask) => subtask.id === subtaskId);

      queryClient.setQueryData<Subtask[]>(key, (old) =>
        old ? old.filter((subtask) => subtask.id !== subtaskId) : old
      );
      adjustSubtaskCounts(queryClient, taskId, {
        total: -1,
        completed: existing?.completed ? -1 : 0,
      });

      return { previous, taskId };
    },

    onError: (_error, _variables, context) => {
      if (!context) return;
      if (context.previous) {
        queryClient.setQueryData(
          queryKeys.subtasks.list(context.taskId),
          context.previous
        );
      }
      adjustSubtaskCounts(queryClient, context.taskId, { total: 1 });
    },

    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.subtasks.list(variables.taskId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      // Shared lists render the same sub-task counts.
      queryClient.invalidateQueries({ queryKey: queryKeys.shares.all });
    },
  });
};
