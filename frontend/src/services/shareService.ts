import axios from 'axios';
import { Task, UpdateTaskInput } from '../types/task';
import {
  SharedList,
  SharedListWithTasks,
  SharedUser,
  ShareStatus,
  CreateShareInput,
} from '../types/share';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const headers = (token: string) => ({
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
});

/** Page envelope returned by the paginated shared-list endpoints. */
export interface PagedResult<T> {
  items: T[];
  total: number;
}

export interface PageParam {
  limit: number;
  offset: number;
}

export const shareService = {
  /** Find a user by email so we can show who we are inviting. */
  lookupUser: async (token: string, email: string): Promise<SharedUser> => {
    const response = await axios.get(`${API_URL}/api/users/lookup`, {
      ...headers(token),
      params: { email },
    });
    return response.data;
  },

  /** Share a selection of my tasks with another user. */
  createShare: async (token: string, input: CreateShareInput): Promise<SharedList> => {
    const response = await axios.post(`${API_URL}/api/share`, input, headers(token));
    return response.data;
  },

  /** Lists I have shared with other people (paginated). */
  getMyShares: async (
    token: string,
    page: PageParam
  ): Promise<PagedResult<SharedList>> => {
    const response = await axios.get(`${API_URL}/api/share`, {
      ...headers(token),
      params: page,
    });
    return response.data;
  },

  /** Accept or decline an invitation. */
  respondToShare: async (
    token: string,
    sharedListId: string,
    status: Extract<ShareStatus, 'accepted' | 'declined'>
  ): Promise<SharedList> => {
    // The API exposes the *action* (/accept, /decline), not the resulting
    // state - posting "accepted" would 404.
    const action = status === 'accepted' ? 'accept' : 'decline';
    const response = await axios.post(
      `${API_URL}/api/share/${action}`,
      { sharedListId },
      headers(token)
    );
    return response.data;
  },

  /** Lists other people shared with me, pending invitations included (paginated). */
  getSharedWithMe: async (
    token: string,
    page: PageParam
  ): Promise<PagedResult<SharedList>> => {
    const response = await axios.get(`${API_URL}/api/shared-lists`, {
      ...headers(token),
      params: page,
    });
    return response.data;
  },

  /** One shared list together with its tasks. */
  getSharedList: async (token: string, id: string): Promise<SharedListWithTasks> => {
    const response = await axios.get(`${API_URL}/api/shared-lists/${id}`, headers(token));
    return response.data;
  },

  /** Remove a share (recipient removes it, owner revokes it). */
  removeShare: async (token: string, id: string): Promise<void> => {
    await axios.delete(`${API_URL}/api/shared-lists/${id}`, headers(token));
  },

  /** Change a task inside a shared list (needs read_write). */
  updateSharedTask: async (
    token: string,
    shareId: string,
    taskId: string,
    updates: UpdateTaskInput
  ): Promise<Task> => {
    const response = await axios.patch(
      `${API_URL}/api/shared-lists/${shareId}/tasks/${taskId}`,
      updates,
      headers(token)
    );
    return response.data;
  },
};