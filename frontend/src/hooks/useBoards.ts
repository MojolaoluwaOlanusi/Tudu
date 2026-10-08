import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { boardService, workspaceService } from '../services/boardService';
import { useAuthStore } from '../store/authStore';
import { useBoardStore } from '../store/boardStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { queryKeys } from '../lib/queryClient';
import {
  Board,
  BoardColumn,
  CreateColumnInput,
  UpdateColumnInput,
} from '../types/board';

/** Every board the signed-in user owns. Creates the default one on first call. */
export const useBoards = () => {
  const { token } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.boards.all,
    queryFn: () => boardService.getBoards(token!),
    enabled: !!token,
    staleTime: 60_000,
  });
};

/** The board the Kanban should render. */
export const useActiveBoardId = (): string | null => {
  const { data: boards, isLoading } = useBoards();
  const activeBoardId = useBoardStore((s) => s.activeBoardId);

  if (isLoading || !boards || boards.length === 0) return null;
  const match = boards.find((b) => b.id === activeBoardId);
  return (match ?? boards[0]).id;
};

/** Columns for a board. */
export const useBoardColumns = (boardId: string | null) => {
  const { token } = useAuthStore();
  return useQuery<BoardColumn[] | null>({
    queryKey: queryKeys.boards.columns(boardId ?? 'none'),
    queryFn: async () => {
      try {
        return await boardService.getColumns(token!, boardId!);
      } catch {
        return null;
      }
    },
    enabled: !!token && !!boardId,
    staleTime: 30_000,
  });
};

/** After any board/column mutation the board, its columns and the cards move together. */
const useInvalidateBoard = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
  };
};

export const useCreateBoard = () => {
  const { token } = useAuthStore();
  const invalidate = useInvalidateBoard();
  return useMutation<Board, unknown, string>({
    mutationFn: (name) => boardService.createBoard(token!, name),
    onSuccess: invalidate,
  });
};

export const useDeleteBoard = () => {
  const { token } = useAuthStore();
  const invalidate = useInvalidateBoard();
  return useMutation<void, unknown, string>({
    mutationFn: (id) => boardService.deleteBoard(token!, id),
    onSuccess: () => {
      useBoardStore.getState().setActiveBoard(null);
      invalidate();
    },
  });
};

export const useCreateColumn = () => {
  const { token } = useAuthStore();
  const invalidate = useInvalidateBoard();
  return useMutation<BoardColumn, unknown, { boardId: string; input: CreateColumnInput }>({
    mutationFn: ({ boardId, input }) => boardService.createColumn(token!, boardId, input),
    onSuccess: invalidate,
  });
};

export const useUpdateColumn = () => {
  const { token } = useAuthStore();
  const invalidate = useInvalidateBoard();
  return useMutation<BoardColumn, unknown, { columnId: string; input: UpdateColumnInput }>({
    mutationFn: ({ columnId, input }) => boardService.updateColumn(token!, columnId, input),
    onSuccess: invalidate,
  });
};

export const useDeleteColumn = () => {
  const { token } = useAuthStore();
  const invalidate = useInvalidateBoard();
  return useMutation<{ moved_tasks: number; fallback_column_id: string }, unknown, string>({
    mutationFn: (columnId) => boardService.deleteColumn(token!, columnId),
    onSuccess: invalidate,
  });
};

export const useReorderColumns = () => {
/* ------------------------- Workspaces ------------------------- */

/** Every workspace the signed-in user belongs to. */
export const useWorkspaces = () => {
  const { token } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.workspaces.all,
    queryFn: () => workspaceService.getWorkspaces(token!),
    enabled: !!token,
    staleTime: 60_000,
  });
};

/** The workspace the Kanban should render in a workspace context. */
export const useActiveWorkspaceId = (): string | null => {
  const { data: workspaces, isLoading } = useWorkspaces();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  if (isLoading || !workspaces || workspaces.length === 0) return null;
  const match = workspaces.find((w: Workspace) => w.id === activeWorkspaceId);
  return (match ?? workspaces[0]).id;
};

export const useWorkspacesQuery = () => {
  const { token } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.workspaces.all,
    queryFn: () => workspaceService.getWorkspaces(token!),
    enabled: !!token,
    staleTime: 60_000,
  });
};

export const useCreateWorkspace = () => {
  const { token } = useAuthStore();
  const invalidate = useInvalidateWorkspace();
  return useMutation<Workspace, unknown, string>({
    mutationFn: (name) => workspaceService.createWorkspace(token!, name),
    onSuccess: invalidate,
  });
};

export const useInviteToWorkspace = () => {
  const { token } = useAuthStore();
  const invalidate = useInvalidateWorkspace();
  return useMutation<WorkspaceMember, unknown, { workspaceId: string; email: string; role: TeamRole }>({
    mutationFn: ({ workspaceId, email, role }) =>
      workspaceService.inviteToWorkspace(token!, workspaceId, email, role),
    onSuccess: invalidate,
  });
};

export const useSetMemberRole = () => {
  const { token } = useAuthStore();
  const invalidate = useInvalidateWorkspace();
  return useMutation<{ message: string }, unknown, { workspaceId: string; memberId: string; role: TeamRole }>({
    mutationFn: ({ workspaceId, memberId, role }) =>
      workspaceService.setMemberRole(token!, workspaceId, memberId, role),
    onSuccess: invalidate,
  });
};

export const useRemoveMember = () => {
  const { token } = useAuthStore();
  const invalidate = useInvalidateWorkspace();
  return useMutation<{ message: string }, unknown, { workspaceId: string; memberId: string }>({
    mutationFn: ({ workspaceId, memberId }) =>
      workspaceService.removeMember(token!, workspaceId, memberId),
    onSuccess: invalidate,
  });
};

const useInvalidateWorkspace = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
  };
};
  const { token } = useAuthStore();
  const invalidate = useInvalidateBoard();
  return useMutation<BoardColumn[], unknown, string[]>({
    mutationFn: (columnIds) => boardService.reorderColumns(token!, columnIds),
    onSuccess: invalidate,
  });
};

export const useInvalidateBoard = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
  };
};
