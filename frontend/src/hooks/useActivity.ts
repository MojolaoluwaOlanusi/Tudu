import { useQuery } from '@tanstack/react-query';
import { activityService, type ActivityFilters } from '../services/activityService';
import { useAuthStore } from '../store/authStore';

/** My activity feed with optional task / date filters. */
export const useActivityFeed = (filters: ActivityFilters = {}) => {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: ['activity', 'feed', filters],
    queryFn: () => activityService.getActivity(token!, filters),
    enabled: !!token,
  });
};

/** My activity on a single task (used inside the task card). */
export const useTaskActivity = (taskId: string | null, limit = 10) => {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: ['activity', 'task', taskId, limit],
    queryFn: () => activityService.getTaskActivity(token!, taskId!, limit),
    enabled: !!token && !!taskId,
  });
};