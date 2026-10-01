import axios from 'axios';
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

  /** Lists I have shared with other people. */
  getMyShares: async (token: string): Promise<SharedList[]> => {
    const response = await axios.get(`${API_URL}/api/share`, headers(token));
    return response.data;
  },

  /** Accept or decline an invitation. */
  respondToShare: async (
    token: string,
    sharedListId: string,
    status: Extract<ShareStatus, 'accepted' | 'declined'>
  ): Promise<SharedList> => {
    const response = await axios.post(
      `${API_URL}/api/share/${status}`,
      { sharedListId },
      headers(token)
    );
    return response.data;
  },

  /** Accepted lists other people shared with me. */
  getSharedWithMe: async (token: string): Promise<SharedList[]> => {
    const response = await axios.get(`${API_URL}/api/shared-lists`, headers(token));
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

  /** Change a task's status inside a shared list (needs read_write). */
  updateSharedTask: async (
    token: string,
    shareId: string,
    taskId: string,
    status: string
  ): Promise<unknown> => {
    const response = await axios.patch(
      `${API_URL}/api/shared-lists/${shareId}/tasks/${taskId}`,
      { status },
      headers(token)
    );
    return response.data;
  },
};