import axios from 'axios';
import {
  Board,
  BoardColumn,
  CreateColumnInput,
  UpdateColumnInput,
  Workspace,
  WorkspaceMember,
  TeamRole,
  CreateWorkspaceInput,
  SetMemberRoleInput,
} from '../types/board';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export const boardService = {
  /** Lists the user's boards, creating the default one on first call. */
  getBoards: async (token: string): Promise<Board[]> => {
    const res = await axios.get(`${API_URL}/api/boards`, { headers: auth(token) });
    return res.data;
  },

  /** List the user's workspaces */
  getWorkspaces: async (token: string): Promise<Workspace[]> => {
    const res = await axios.get(`${API_URL}/api/workspaces`, { headers: auth(token) });
    return res.data;
  },

  /** Create a new workspace (owner = admin) */
  createWorkspace: async (token: string, name: string): Promise<Workspace> => {
    const res = await axios.post(`${API_URL}/api/workspaces`, { name }, { headers: auth(token) });
    return res.data;
  },

  /** Invite a member to a workspace */
  inviteToWorkspace: async (
    token: string,
    workspaceId: string,
    email: string,
    role: TeamRole
  ): Promise<WorkspaceMember> => {
    const res = await axios.post(
      `${API_URL}/api/workspaces/${workspaceId}/invite`,
      { email, role },
      { headers: auth(token) }
    );
    return res.data;
  },

  /** Update a member's role in a workspace */
  setMemberRole: async (
    token: string,
    workspaceId: string,
    memberId: string,
    role: TeamRole
  ): Promise<{ message: string }> => {
    const res = await axios.patch(
      `${API_URL}/api/workspaces/${workspaceId}/members/${memberId}/role`,
      { role },
      { headers: auth(token) }
    );
    return res.data;
  },

  /** Remove a member from a workspace */
  removeMember: async (
    token: string,
    workspaceId: string,
    memberId: string
  ): Promise<{ message: string }> => {
    const res = await axios.delete(
      `${API_URL}/api/workspaces/${workspaceId}/members/${memberId}`,
      { headers: auth(token) }
    );
    return res.data;
  },

  createBoard: async (token: string, name: string): Promise<Board> => {
    const res = await axios.post(`${API_URL}/api/boards`, { name }, { headers: auth(token) });
    return res.data;
  },

  updateBoard: async (token: string, id: string, name: string): Promise<Board> => {
    const res = await axios.put(`${API_URL}/api/boards/${id}`, { name }, { headers: auth(token) });
    return res.data;
  },

  deleteBoard: async (token: string, id: string): Promise<void> => {
    await axios.delete(`${API_URL}/api/boards/${id}`, { headers: auth(token) });
  },

  getColumns: async (token: string, boardId: string): Promise<BoardColumn[]> => {
    const res = await axios.get(`${API_URL}/api/boards/${boardId}/columns`, {
      headers: auth(token),
    });
    return res.data;
  },

  createColumn: async (
    token: string,
    boardId: string,
    input: CreateColumnInput
  ): Promise<BoardColumn> => {
    const res = await axios.post(`${API_URL}/api/boards/${boardId}/columns`, input, {
      headers: auth(token),
    });
    return res.data;
  },

  updateColumn: async (
    token: string,
    columnId: string,
    input: UpdateColumnInput
  ): Promise<BoardColumn> => {
    const res = await axios.put(`${API_URL}/api/columns/${columnId}`, input, {
      headers: auth(token),
    });
    return res.data;
  },

  deleteColumn: async (
    token: string,
    columnId: string
  ): Promise<{ moved_tasks: number; fallback_column_id: string }> => {
    const res = await axios.delete(`${API_URL}/api/columns/${columnId}`, {
      headers: auth(token),
    });
    return res.data;
  },

  /** Sends the board's complete column list in its new order. */
  reorderColumns: async (token: string, columnIds: string[]): Promise<BoardColumn[]> => {
    const res = await axios.put(
      `${API_URL}/api/columns/reorder`,
      { column_ids: columnIds },
      { headers: auth(token) }
    );
    return res.data;
  },
};
