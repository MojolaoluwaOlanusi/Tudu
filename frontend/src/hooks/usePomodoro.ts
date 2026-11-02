import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pomodoroService } from '../services/pomodoroService';
import { useAuthStore } from '../store/authStore';
import { usePomodoroStore } from '../store/pomodoroStore';
import { queryKeys } from '../lib/queryClient';
import { requestNotificationPermission } from '../lib/pomodoroAlerts';
import { useUiStore } from '../store/uiStore';

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

  const pushToast = useUiStore((state) => state.pushToast);

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
    onError: (error: any) => {
      const status = error?.response?.status;
      // If the session is already completed (409) or not found (404),
      // treat it as a success from the UI's perspective: the session is gone.
      if (status === 409 || status === 404) {
        abandon();
        clearFinished();
      } else {
        pushToast('Could not log the focus session', 'error');
      }
    },
  });
};