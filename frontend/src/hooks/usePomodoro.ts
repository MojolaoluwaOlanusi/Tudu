import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pomodoroService } from '../services/pomodoroService';
import { useAuthStore } from '../store/authStore';
import { usePomodoroStore } from '../store/pomodoroStore';
import { queryKeys } from '../lib/queryClient';

export const usePomodoroStats = (days = 7) => {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: queryKeys.pomodoro.stats(days),
    queryFn: () => pomodoroService.stats(token!, days),
    enabled: !!token,
    retry: false,
  });
};

export const useStartPomodoro = () => {
  const token = useAuthStore((state) => state.token);
  const begin = usePomodoroStore((state) => state.begin);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      duration,
    }: {
      taskId?: string | null;
      duration?: number;
    }) => pomodoroService.start(token!, taskId, duration),

    onSuccess: (session, variables) => {
      begin({
        sessionId: session.id,
        taskId: session.task_id,
        taskTitle: null,
        mode: 'focus',
        durationMinutes: session.duration,
      });
      // A new session changes "today" immediately.
      queryClient.invalidateQueries({ queryKey: queryKeys.pomodoro.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.activity.all });
      void variables;
    },
  });
};

export const useCompletePomodoro = () => {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const abandon = usePomodoroStore((state) => state.abandon);
  const clearFinished = usePomodoroStore((state) => state.clearFinished);

  return useMutation({
    mutationFn: (sessionId: string) => pomodoroService.complete(token!, sessionId),

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pomodoro.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.activity.all });
    },

    onSuccess: () => {
      abandon();
      clearFinished();
    },
  });
};