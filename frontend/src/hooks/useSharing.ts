import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shareService } from '../services/shareService';
import { useAuthStore } from '../store/authStore';
import { queryKeys } from '../lib/queryClient';
import { CreateShareInput, ShareStatus } from '../types/share';
import { UpdateTaskInput } from '../types/task';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Find someone by email while typing in the share modal. */
export const useLookupUser = (email: string) => {
  const { token } = useAuthStore();
  const isValid = EMAIL_RE.test(email.trim());

  return useQuery({
    queryKey: ['users', 'lookup', email.trim().toLowerCase()],
    queryFn: () => shareService.lookupUser(token!, email.trim()),
    enabled: !!token && isValid,
    staleTime: 60_000,
    retry: false,
  });
};

/** Lists I have shared with other people. */
export const useMyShares = () => {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.shares.mine,
    queryFn: () => shareService.getMyShares(token!),
    enabled: !!token,
  });
};

/** "Shared with me" - pending invitations plus the lists I accepted. */
export const useSharedWithMe = () => {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.shares.withMe,
    queryFn: () => shareService.getSharedWithMe(token!),
    enabled: !!token,
  });
};

/** One shared list plus its tasks. */
export const useSharedList = (id: string | null) => {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.shares.detail(id ?? 'none'),
    queryFn: () => shareService.getSharedList(token!, id!),
    enabled: !!token && !!id,
  });
};

export const useCreateShare = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateShareInput) => shareService.createShare(token!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shares.all });
    },
  });
};

export const useRespondToShare = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sharedListId,
      status,
    }: {
      sharedListId: string;
      status: Extract<ShareStatus, 'accepted' | 'declined'>;
    }) => shareService.respondToShare(token!, sharedListId, status),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shares.all });
    },
  });
};

export const useRemoveShare = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => shareService.removeShare(token!, id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.shares.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.shares.all });
    },
  });
};

export const useUpdateSharedTask = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      shareId,
      taskId,
      updates,
    }: {
      shareId: string;
      taskId: string;
      updates: UpdateTaskInput;
    }) => shareService.updateSharedTask(token!, shareId, taskId, updates),

    onMutate: async ({ shareId, taskId, updates }) => {
      const key = queryKeys.shares.detail(shareId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<{ tasks?: unknown[] }>(key);

      queryClient.setQueryData(key, (old: any) =>
        old
          ? {
              ...old,
              tasks: (old.tasks ?? []).map((task: any) =>
                task.id === taskId ? { ...task, ...updates } : task
              ),
            }
          : old
      );

      return { previous, shareId };
    },

    onError: (_error, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.shares.detail(variables.shareId), context.previous);
      }
    },

    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shares.detail(variables.shareId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.shares.all });
      // The owner sees the change through their own socket, but refresh anyway.
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
};