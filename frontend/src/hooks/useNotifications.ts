import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  notificationService,
  type NotificationPreferences,
} from '../services/notificationService';
import { useAuthStore } from '../store/authStore';

const QUERY_KEY = ['notifications', 'preferences'] as const;

export const useNotificationPreferences = () => {
  const { token } = useAuthStore();
  return useQuery<NotificationPreferences>({
    queryKey: QUERY_KEY,
    queryFn: () => notificationService.get(token!),
    enabled: !!token,
    staleTime: 60_000,
  });
};

export const useSetReminders = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<NotificationPreferences, unknown, boolean>({
    mutationFn: (reminders) => notificationService.set(token!, reminders),
    onSuccess: (data) => queryClient.setQueryData(QUERY_KEY, data),
  });
};
