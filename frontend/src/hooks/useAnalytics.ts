import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analyticsService';
import { useAuthStore } from '../store/authStore';
import { queryKeys } from '../lib/queryClient';
import type { AnalyticsRange } from '../types/analytics';

export const useAnalyticsOverview = (enabled = true) => {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: queryKeys.analytics.overview,
    queryFn: () => analyticsService.overview(token!),
    enabled: !!token && enabled,
    retry: false,
  });
};

export const useCompletedTasks = (range: AnalyticsRange, enabled = true) => {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: queryKeys.analytics.completed(range),
    queryFn: () => analyticsService.completedTasks(token!, range),
    enabled: !!token && enabled,
    // keeps the previous range on screen while the next one loads
    placeholderData: (previous) => previous,
    retry: false,
  });
};

export const useTimeSpent = (range: AnalyticsRange, enabled = true) => {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: queryKeys.analytics.timeSpent(range),
    queryFn: () => analyticsService.timeSpent(token!, range),
    enabled: !!token && enabled,
    placeholderData: (previous) => previous,
    retry: false,
  });
};


export const useTeamAnalytics = (
  workspaceId: string | null,
  range: AnalyticsRange,
) => {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ['analytics', 'team', workspaceId, range],
    queryFn: () => analyticsService.team(token!, workspaceId!, range),
    enabled: !!token && !!workspaceId,
    placeholderData: (previous) => previous,
    retry: false,
  });
};
