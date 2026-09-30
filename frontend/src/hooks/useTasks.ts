import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from '../services/taskService';
import { useAuthStore } from '../store/authStore';
import { CreateTaskInput, UpdateTaskInput, TaskFilters } from '../types/task';

export const useTasks = (filters?: TaskFilters) => {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => taskService.getTasks(token!, filters!),
    enabled: !!token,
  });
};

export const useTask = (id: string) => {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: ['task', id],
    queryFn: () => taskService.getTaskById(token!, id),
    enabled: !!token && !!id,
  });
};

export const useCreateTask = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (task: CreateTaskInput) => taskService.createTask(token!, task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};

export const useUpdateTask = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, task }: { id: string; task: UpdateTaskInput }) =>
      taskService.updateTask(token!, id, task),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', data.id] });
    },
  });
};

export const useDeleteTask = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => taskService.deleteTask(token!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};
