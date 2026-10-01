import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analyticsService';
import { useAuthStore } from '../store/authStore';
import { queryKeys } from '../lib/queryClient';
import type { AnalyticsRange } from '../types/analytics';

export const useAnalyticsOverview = () => {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: queryKeys.analytics.overview,
    queryFn: () => analyticsService.overview(token!),
    enabled: !!token,
    retry: false,
  });
};

export const useCompletedTasks = (range: AnalyticsRange) => {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: queryKeys.analytics.completed(range),
    queryFn: () => analyticsService.completedTasks(token!, range),
    enabled: !!token,
    // keeps the previous range on screen while the next one loads
    placeholderData: (previous) => previous,
    retry: false,
  });
};

export const useTimeSpent = (range: AnalyticsRange) => {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: queryKeys.analytics.timeSpent(range),
    queryFn: () => analyticsService.timeSpent(token!, range),
    enabled: !!token,
    placeholderData: (previous) => previous,
    retry: false,
  });
};