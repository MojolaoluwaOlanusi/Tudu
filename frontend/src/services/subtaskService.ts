import axios from 'axios';
import { Subtask, CreateSubtaskInput, UpdateSubtaskInput } from '../types/task';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const authHeaders = (token: string) => ({
  headers: { Authorization: `Bearer ${token}` },
});

export const subtaskService = {
  // List sub-tasks for a task
  getSubtasks: async (token: string, taskId: string): Promise<Subtask[]> => {
    const response = await axios.get(`${API_URL}/api/tasks/${taskId}/subtasks`, {
      ...authHeaders(token),
    });
    return response.data;
  },

  // Create a sub-task
  createSubtask: async (
    token: string,
    taskId: string,
    input: CreateSubtaskInput
  ): Promise<Subtask> => {
    const response = await axios.post(
      `${API_URL}/api/tasks/${taskId}/subtasks`,
      input,
      { ...authHeaders(token), headers: { ...authHeaders(token).headers, 'Content-Type': 'application/json' } }
    );
    return response.data;
  },

  // Update a sub-task (rename and/or tick it off)
  updateSubtask: async (
    token: string,
    taskId: string,
    subtaskId: string,
    input: UpdateSubtaskInput
  ): Promise<Subtask> => {
    const response = await axios.patch(
      `${API_URL}/api/tasks/${taskId}/subtasks/${subtaskId}`,
      input,
      { ...authHeaders(token), headers: { ...authHeaders(token).headers, 'Content-Type': 'application/json' } }
    );
    return response.data;
  },

  // Delete a sub-task
  deleteSubtask: async (token: string, taskId: string, subtaskId: string): Promise<void> => {
    await axios.delete(
      `${API_URL}/api/tasks/${taskId}/subtasks/${subtaskId}`,
      authHeaders(token)
    );
  },
};
