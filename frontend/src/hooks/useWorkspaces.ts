import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workspaceService } from '../services/workspaceService';
import { useAuthStore } from '../store/authStore';
import { queryKeys } from '../lib/queryClient';
import type { BoardRole } from '../types/board';
import type { Workspace, WorkspaceMember } from '../types/workspace';

export const useWorkspaces = () => {
  const { token } = useAuthStore();
  return useQuery<Workspace[]>({
    queryKey: queryKeys.workspaces.all,
    queryFn: () => workspaceService.getWorkspaces(token!),
    enabled: !!token,
    staleTime: 60_000,
  });
};

export const useWorkspaceInvites = () => {
  const { token } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.workspaces.invites,
    queryFn: () => workspaceService.getInvites(token!),
    enabled: !!token,
    staleTime: 30_000,
  });
};

export const useWorkspaceMembers = (workspaceId: string | null | undefined) => {
  const { token } = useAuthStore();
  return useQuery<WorkspaceMember[]>({
    queryKey: queryKeys.workspaces.members(workspaceId ?? 'none'),
    queryFn: () => workspaceService.getMembers(token!, workspaceId!),
    enabled: !!token && !!workspaceId,
    staleTime: 30_000,
  });
};

/** Membership changes can change which boards (and tasks) I can see, so refresh them too. */
const useInvalidateTeam = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
  };
};

export const useCreateWorkspace = () => {
  const { token } = useAuthStore();
  const invalidate = useInvalidateTeam();
  return useMutation<Workspace, unknown, string>({
    mutationFn: (name) => workspaceService.createWorkspace(token!, name),
    onSuccess: invalidate,
  });
};

export const useInviteMember = () => {
  const { token } = useAuthStore();
  const invalidate = useInvalidateTeam();
  return useMutation<
    WorkspaceMember,
    unknown,
    { workspaceId: string; email: string; role: BoardRole }
  >({
    mutationFn: ({ workspaceId, email, role }) =>
      workspaceService.invite(token!, workspaceId, email, role),
    onSuccess: invalidate,
  });
};

export const useRespondToWorkspaceInvite = () => {
  const { token } = useAuthStore();
  const invalidate = useInvalidateTeam();
  return useMutation<void, unknown, { workspaceId: string; status: 'accepted' | 'declined' }>({
    mutationFn: ({ workspaceId, status }) => workspaceService.respond(token!, workspaceId, status),
    onSuccess: invalidate,
  });
};

export const useSetMemberRole = () => {
  const { token } = useAuthStore();
  const invalidate = useInvalidateTeam();
  return useMutation<void, unknown, { workspaceId: string; userId: string; role: BoardRole }>({
    mutationFn: ({ workspaceId, userId, role }) =>
      workspaceService.setRole(token!, workspaceId, userId, role),
    onSuccess: invalidate,
  });
};

export const useRemoveMember = () => {
  const { token } = useAuthStore();
  const invalidate = useInvalidateTeam();
  return useMutation<void, unknown, { workspaceId: string; userId: string }>({
    mutationFn: ({ workspaceId, userId }) =>
      workspaceService.removeMember(token!, workspaceId, userId),
    onSuccess: invalidate,
  });
};

export const useAssignTask = () => {
  const { token } = useAuthStore();
  const invalidate = useInvalidateTeam();
  return useMutation<unknown, unknown, { taskId: string; assigneeId: string | null }>({
    mutationFn: ({ taskId, assigneeId }) => workspaceService.assignTask(token!, taskId, assigneeId),
    onSuccess: invalidate,
  });
};