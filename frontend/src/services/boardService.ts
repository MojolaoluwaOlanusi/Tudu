import axios from 'axios';
import type { Board, BoardColumn, Stage } from '../types/board';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export interface ColumnDeleteResult {
  moved_tasks: number;
  fallback_column_id: string | null;
}

export interface CreateColumnInput {
  name: string;
  stage: Stage;
  color?: string;
  wip_limit?: number | null;
}

export interface UpdateColumnInput {
  name?: string;
  stage?: Stage;
  color?: string;
  wip_limit?: number | null;
}

export const boardService = {
  getBoards: async (token: string): Promise<Board[]> =>
    (await axios.get(`${API_URL}/api/boards`, { headers: auth(token) })).data,

  getBoard: async (token: string, id: string): Promise<Board> =>
    (await axios.get(`${API_URL}/api/boards/${id}`, { headers: auth(token) })).data,

  createBoard: async (token: string, name: string, workspaceId?: string): Promise<Board> =>
    (
      await axios.post(
        `${API_URL}/api/boards`,
        { name, workspace_id: workspaceId },
        { headers: auth(token) }
      )
    ).data,

  updateBoard: async (token: string, id: string, name: string): Promise<Board> =>
    (await axios.put(`${API_URL}/api/boards/${id}`, { name }, { headers: auth(token) })).data,

  deleteBoard: async (token: string, id: string): Promise<void> => {
    // The UI confirms before calling this; `confirm=true` is what the server
    // requires to delete a board that still has tasks.
    await axios.delete(`${API_URL}/api/boards/${id}`, {
      headers: auth(token),
      params: { confirm: 'true' },
    });
  },

  getColumns: async (token: string, boardId: string): Promise<BoardColumn[]> =>
    (await axios.get(`${API_URL}/api/boards/${boardId}/columns`, { headers: auth(token) })).data,

  createColumn: async (
    token: string,
    boardId: string,
    input: CreateColumnInput
  ): Promise<BoardColumn> =>
    (
      await axios.post(`${API_URL}/api/boards/${boardId}/columns`, input, {
        headers: auth(token),
      })
    ).data,

  updateColumn: async (
    token: string,
    id: string,
    patch: UpdateColumnInput
  ): Promise<BoardColumn> =>
    (await axios.put(`${API_URL}/api/columns/${id}`, patch, { headers: auth(token) })).data,

  deleteColumn: async (token: string, id: string): Promise<ColumnDeleteResult> =>
    (await axios.delete(`${API_URL}/api/columns/${id}`, { headers: auth(token) })).data,

  reorderColumns: async (
    token: string,
    boardId: string,
    columnIds: string[]
  ): Promise<BoardColumn[]> =>
    (
      await axios.put(
        `${API_URL}/api/columns/reorder`,
        { board_id: boardId, column_ids: columnIds },
        { headers: auth(token) }
      )
    ).data,
};