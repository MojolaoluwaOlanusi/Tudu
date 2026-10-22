import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { timeService } from '../services/timeService';
import { useAuthStore } from '../store/authStore';
import type { CreateManualEntry } from '../types/time';

const ACTIVE_KEY = ['time', 'active'] as const;
const ENTRIES_KEY = ['time', 'entries'] as const;
const REPORT_KEY = ['time', 'report'] as const;

export const useActiveTimer = () => {
  const { token } = useAuthStore();
  return useQuery({
    queryKey: ACTIVE_KEY,
    queryFn: () => timeService.getActive(token!),
    enabled: !!token,
    refetchInterval: 30_000,
    staleTime: 5_000,
  });
};

const invalidateAll = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ACTIVE_KEY });
  queryClient.invalidateQueries({ queryKey: ENTRIES_KEY });
  queryClient.invalidateQueries({ queryKey: REPORT_KEY });
};

export const useStartTimer = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { taskId?: string | null; description?: string | null; billable?: boolean }) =>
      timeService.start(token!, body),
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useStopTimer = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => timeService.stop(token!),
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useTimeEntries = (limit = 30) => {
  const { token } = useAuthStore();
  return useQuery({
    queryKey: [...ENTRIES_KEY, limit],
    queryFn: () => timeService.listEntries(token!, { limit }),
    enabled: !!token,
  });
};

export const useCreateManualEntry = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateManualEntry) => timeService.createManual(token!, body),
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useDeleteTimeEntry = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => timeService.deleteEntry(token!, id),
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useTimeReport = (range: 'week' | 'month' | 'quarter') => {
  const { token } = useAuthStore();
  return useQuery({
    queryKey: [...REPORT_KEY, range],
    queryFn: () => timeService.report(token!, range),
    enabled: !!token,
  });
};

export const formatElapsed = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

export const formatDuration = (seconds: number): string => {
  if (seconds <= 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};
