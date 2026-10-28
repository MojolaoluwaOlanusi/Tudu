import axios from 'axios';
import { Task, CreateTaskInput, UpdateTaskInput, TaskFilters, StatusChange } from '../types/task';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const taskService = {
  // Get all tasks with optional filters
  getTasks: async (token: string, filters?: TaskFilters): Promise<Task[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.sort) params.append('sort', filters.sort);
    if (filters?.order) params.append('order', filters.order);
    if (filters?.limit) params.append('limit', String(filters.limit));

    const response = await axios.get(`${API_URL}/api/tasks?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  // Get single task by ID
  getTaskById: async (token: string, id: string): Promise<Task> => {
    const response = await axios.get(`${API_URL}/api/tasks/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  // Create new task
  createTask: async (token: string, task: CreateTaskInput): Promise<Task> => {
    const response = await axios.post(`${API_URL}/api/tasks`, task, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  // Update task
  updateTask: async (token: string, id: string, task: UpdateTaskInput): Promise<Task> => {
    const response = await axios.put(`${API_URL}/api/tasks/${id}`, task, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  // Delete task
  deleteTask: async (token: string, id: string): Promise<void> => {
    await axios.delete(`${API_URL}/api/tasks/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // Undo a soft delete (feature 4.5). The row was never removed, only
  // flagged, so this is a normal PATCH of one column under the hood.
  restoreTask: async (token: string, id: string): Promise<Task> => {
    const response = await axios.post(
      `${API_URL}/api/tasks/${id}/restore`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  // Bulk soft-delete (feature 4.6). The backend skips rows the caller
  // cannot edit and returns how many actually changed.
  batchDelete: async (token: string, ids: string[]): Promise<{ deleted: number; ids: string[] }> => {
    const response = await axios.delete(`${API_URL}/api/tasks/batch`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { ids },
    });
    return response.data;
  },

  // Bulk assign; pass assigneeId = null to unassign.
  batchAssign: async (
    token: string,
    ids: string[],
    assigneeId: string | null
  ): Promise<{ updated: number; tasks: Task[] }> => {
    const response = await axios.patch(
      `${API_URL}/api/tasks/batch/assign`,
      { ids, assignee_id: assigneeId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  // Get overdue tasks
  getOverdueTasks: async (token: string): Promise<Task[]> => {
    const response = await axios.get(`${API_URL}/api/tasks/overdue`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  // Move a single task to another column (Kanban drag & drop).
  // `columnId` is optional: sending it means the backend picks the status from
  // that column's stage, so the card and its status can never disagree.
  updateTaskStatus: async (
    token: string,
    id: string,
    status: StatusChange['status'],
    columnId?: string | null
  ): Promise<Task> => {
    const response = await axios.patch(
      `${API_URL}/api/tasks/${id}/status`,
      { status, column_id: columnId ?? null },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  // Move many tasks at once (bulk drag & drop)
  batchUpdateTaskStatus: async (
    token: string,
    updates: StatusChange[]
  ): Promise<{ updated: number; tasks: Task[] }> => {
    const response = await axios.patch(`${API_URL}/api/tasks/batch`, { updates }, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },
};
