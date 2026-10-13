import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { boardService, type ColumnDeleteResult } from '../services/boardService';
import { useAuthStore } from '../store/authStore';
import { useBoardStore } from '../store/boardStore';
import { queryKeys } from '../lib/queryClient';
import type { Board, BoardColumn, Stage } from '../types/board';

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

export const useBoards = () => {
  const { token } = useAuthStore();
  return useQuery<Board[]>({
    queryKey: queryKeys.boards.all,
    queryFn: () => boardService.getBoards(token!),
    enabled: !!token,
    staleTime: 60_000,
  });
};

/**
 * The active board id.
 *
 * Falls back to the first board whenever the stored id is missing or has just
 * been deleted (optimistically, before the server confirms), so the UI never
 * shows an empty Kanban while the refetch is in flight.
 */
export const useActiveBoardId = (): string | null => {
  const { data: boards } = useBoards();
  const activeId = useBoardStore((s) => s.activeBoardId);
  const setActive = useBoardStore((s) => s.setActiveBoard);

  const valid = !!boards?.some((b) => b.id === activeId);

  useEffect(() => {
    if (boards && boards.length > 0 && !valid) {
      setActive(boards[0].id);
    }
  }, [boards, valid, setActive]);

  if (activeId && valid) return activeId;
  return boards && boards.length > 0 ? boards[0].id : null;
};

export const useBoardColumns = (boardId: string | null | undefined) => {
  const { token } = useAuthStore();
  return useQuery<BoardColumn[]>({
    queryKey: queryKeys.boards.columns(boardId ?? 'none'),
    queryFn: () => boardService.getColumns(token!, boardId!),
    enabled: !!token && !!boardId,
    staleTime: 30_000,
  });
};

/* ------------------------------------------------------------------ */
/* Shared invalidation                                                 */
/* ------------------------------------------------------------------ */

const useInvalidateBoard = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
  };
};

/** A placeholder id for optimistic rows. Never sent to the server. */
const tempId = () => `temp-${Math.random().toString(36).slice(2, 10)}`;

/* ------------------------------------------------------------------ */
/* Board mutations (optimistic)                                        */
/* ------------------------------------------------------------------ */

export const useCreateBoard = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<
    Board,
    unknown,
    { name: string; workspaceId?: string },
    { previous?: Board[] }
  >({
    mutationFn: ({ name, workspaceId }) => boardService.createBoard(token!, name, workspaceId),
    onMutate: async ({ name, workspaceId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.boards.all });
      const previous = queryClient.getQueryData<Board[]>(queryKeys.boards.all);
      const optimistic = {
        id: tempId(),
        user_id: '',
        name,
        position: 9999,
        workspace_id: workspaceId ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as Board;
      queryClient.setQueryData<Board[]>(queryKeys.boards.all, (old) =>
        old ? [...old, optimistic] : [optimistic]
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(queryKeys.boards.all, ctx.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
    },
  });
};

export const useRenameBoard = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<Board, unknown, { id: string; name: string }, { previous?: Board[] }>({
    mutationFn: ({ id, name }) => boardService.updateBoard(token!, id, name),
    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.boards.all });
      const previous = queryClient.getQueryData<Board[]>(queryKeys.boards.all);
      queryClient.setQueryData<Board[]>(queryKeys.boards.all, (old) =>
        old ? old.map((b) => (b.id === id ? { ...b, name } : b)) : old
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(queryKeys.boards.all, ctx.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
    },
  });
};

export const useDeleteBoard = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<void, unknown, string, { previous?: Board[] }>({
    mutationFn: (id) => boardService.deleteBoard(token!, id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.boards.all });
      const previous = queryClient.getQueryData<Board[]>(queryKeys.boards.all);
      // Remove the board from the list, plus its cached columns.
      queryClient.setQueryData<Board[]>(queryKeys.boards.all, (old) =>
        old ? old.filter((b) => b.id !== id) : old
      );
      queryClient.removeQueries({ queryKey: queryKeys.boards.columns(id) });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(queryKeys.boards.all, ctx.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
    },
  });
};

/* ------------------------------------------------------------------ */
/* Column mutations (optimistic)                                       */
/* ------------------------------------------------------------------ */

export const useCreateColumn = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<
    BoardColumn,
    unknown,
    { boardId: string; name: string; stage: Stage; color?: string },
    { previous?: BoardColumn[]; key: readonly unknown[] }
  >({
    mutationFn: ({ boardId, name, stage, color }) =>
      boardService.createColumn(token!, boardId, { name, stage, color }),
    onMutate: async ({ boardId, name, stage, color }) => {
      const key = queryKeys.boards.columns(boardId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<BoardColumn[]>(key);
      const optimistic = {
        id: tempId(),
        board_id: boardId,
        name,
        position: previous?.length ?? 0,
        color: color ?? 'gray',
        stage,
        wip_limit: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as BoardColumn;
      queryClient.setQueryData<BoardColumn[]>(key, (old) =>
        old ? [...old, optimistic] : [optimistic]
      );
      return { previous, key };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined && ctx.key) {
        queryClient.setQueryData(ctx.key, ctx.previous);
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.columns(vars.boardId) });
    },
  });
};

export const useUpdateColumn = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<
    BoardColumn,
    unknown,
    { id: string; boardId: string; patch: Partial<BoardColumn> },
    { previous?: BoardColumn[]; key: readonly unknown[] }
  >({
    mutationFn: ({ id, patch }) => boardService.updateColumn(token!, id, patch),
    onMutate: async ({ id, boardId, patch }) => {
      const key = queryKeys.boards.columns(boardId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<BoardColumn[]>(key);
      queryClient.setQueryData<BoardColumn[]>(key, (old) =>
        old ? old.map((c) => (c.id === id ? { ...c, ...patch } : c)) : old
      );
      return { previous, key };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined && ctx.key) {
        queryClient.setQueryData(ctx.key, ctx.previous);
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.columns(vars.boardId) });
    },
  });
};

export const useDeleteColumn = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<
    ColumnDeleteResult,
    unknown,
    { id: string; boardId: string },
    { previous?: BoardColumn[]; key: readonly unknown[] }
  >({
    mutationFn: ({ id }) => boardService.deleteColumn(token!, id),
    onMutate: async ({ id, boardId }) => {
      const key = queryKeys.boards.columns(boardId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<BoardColumn[]>(key);
      queryClient.setQueryData<BoardColumn[]>(key, (old) =>
        old ? old.filter((c) => c.id !== id) : old
      );
      return { previous, key };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined && ctx.key) {
        queryClient.setQueryData(ctx.key, ctx.previous);
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.columns(vars.boardId) });
    },
  });
};

/**
 * Reorder columns. The cache is rewritten immediately (so a drag feels
 * instant); the server request only exists to persist the new order. If it
 * fails, the previous order is restored.
 */
export const useReorderColumns = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<
    BoardColumn[],
    unknown,
    { boardId: string; columnIds: string[] },
    { previous?: BoardColumn[]; key: readonly unknown[] }
  >({
    mutationFn: ({ boardId, columnIds }) => boardService.reorderColumns(token!, boardId, columnIds),
    onMutate: async ({ boardId, columnIds }) => {
      const key = queryKeys.boards.columns(boardId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<BoardColumn[]>(key);
      queryClient.setQueryData<BoardColumn[]>(key, (old) => {
        if (!old) return old;
        const byId = new Map(old.map((c) => [c.id, c]));
        const next: BoardColumn[] = [];
        columnIds.forEach((id, i) => {
          const c = byId.get(id);
          if (c) next.push({ ...c, position: i });
        });
        // Anything not mentioned in columnIds (shouldn't happen) stays at the end.
        old.forEach((c) => {
          if (!columnIds.includes(c.id)) next.push(c);
        });
        return next;
      });
      return { previous, key };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined && ctx.key) {
        queryClient.setQueryData(ctx.key, ctx.previous);
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.columns(vars.boardId) });
    },
  });
};
