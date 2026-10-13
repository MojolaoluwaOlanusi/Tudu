import axios from 'axios';
import type { BoardRole } from '../types/board';
import type { Task } from '../types/task';
import type { Workspace, WorkspaceInvite, WorkspaceMember } from '../types/workspace';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export const workspaceService = {
  getWorkspaces: async (token: string): Promise<Workspace[]> =>
    (await axios.get(`${API_URL}/api/workspaces`, { headers: auth(token) })).data,

  getInvites: async (token: string): Promise<WorkspaceInvite[]> =>
    (await axios.get(`${API_URL}/api/workspaces/invites`, { headers: auth(token) })).data,

  createWorkspace: async (token: string, name: string): Promise<Workspace> =>
    (await axios.post(`${API_URL}/api/workspaces`, { name }, { headers: auth(token) })).data,

  getMembers: async (token: string, workspaceId: string): Promise<WorkspaceMember[]> =>
    (
      await axios.get(`${API_URL}/api/workspaces/${workspaceId}/members`, {
        headers: auth(token),
      })
    ).data,

  invite: async (
    token: string,
    workspaceId: string,
    email: string,
    role: BoardRole
  ): Promise<WorkspaceMember> =>
    (
      await axios.post(
        `${API_URL}/api/workspaces/${workspaceId}/members`,
        { email, role },
        { headers: auth(token) }
      )
    ).data,

  respond: async (
    token: string,
    workspaceId: string,
    status: 'accepted' | 'declined'
  ): Promise<void> => {
    await axios.post(
      `${API_URL}/api/workspaces/${workspaceId}/respond`,
      { status },
      { headers: auth(token) }
    );
  },

  setRole: async (
    token: string,
    workspaceId: string,
    userId: string,
    role: BoardRole
  ): Promise<void> => {
    await axios.put(
      `${API_URL}/api/workspaces/${workspaceId}/members/${userId}`,
      { role },
      { headers: auth(token) }
    );
  },

  removeMember: async (token: string, workspaceId: string, userId: string): Promise<void> => {
    await axios.delete(`${API_URL}/api/workspaces/${workspaceId}/members/${userId}`, {
      headers: auth(token),
    });
  },

  assignTask: async (token: string, taskId: string, assigneeId: string | null): Promise<Task> =>
    (
      await axios.patch(
        `${API_URL}/api/tasks/${taskId}/assignee`,
        { assignee_id: assigneeId },
        { headers: auth(token) }
      )
    ).data,
};