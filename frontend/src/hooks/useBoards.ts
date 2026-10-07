import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { boardService } from '../services/boardService';
import { useAuthStore } from '../store/authStore';
import { useBoardStore } from '../store/boardStore';
import { queryKeys } from '../lib/queryClient';
import { Board, BoardColumn, CreateColumnInput, UpdateColumnInput } from '../types/board';

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

/**
 * The board the Kanban should render.
 *
 * Falls back to the first board when the stored id is missing, stale, or
 * belongs to a board that has since been deleted.
 */
export const useActiveBoardId = (): string | null => {
  const { data: boards, isLoading } = useBoards();
  const activeBoardId = useBoardStore((s) => s.activeBoardId);

  if (!boards || boards.length === 0) return null;
  const match = boards.find((b) => b.id === activeBoardId);
  return (match ?? boards[0]).id;
};

/**
 * Columns for a board.
 *
 * Returns `undefined` while loading and `null` on failure, so callers can
 * distinguish "still fetching" from "the backend has no boards yet" and fall
 * back to the classic three columns rather than rendering an empty board.
 */
export const useBoardColumns = (boardId: string | null) => {
  const { token } = useAuthStore();
  return useQuery<BoardColumn[] | null>({
    queryKey: queryKeys.boards.columns(boardId ?? 'none'),
    queryFn: async () => {
      try {
        return await boardService.getColumns(token!, boardId!);
      } catch {
        // Backend predates this phase, or the migration has not run.
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
  return useMutation<
    { moved_tasks: number; fallback_column_id: string },
    unknown,
    string
  >({
    mutationFn: (columnId) => boardService.deleteColumn(token!, columnId),
    onSuccess: invalidate,
  });
};

export const useReorderColumns = () => {
  const { token } = useAuthStore();
  const invalidate = useInvalidateBoard();
  return useMutation<BoardColumn[], unknown, string[]>({
    mutationFn: (columnIds) => boardService.reorderColumns(token!, columnIds),
    onSuccess: invalidate,
  });
};
