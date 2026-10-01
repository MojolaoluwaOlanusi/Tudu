import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { taskService } from '../services/taskService';
import { useAuthStore } from '../store/authStore';
import { queryKeys } from '../lib/queryClient';
import { isOverdueTask, matchesFilters, sortByCreatedAtDesc } from '../lib/taskCache';
import { Task, CreateTaskInput, UpdateTaskInput, TaskFilters } from '../types/task';

const TASKS_KEY = queryKeys.tasks.all;
const OVERDUE_KEY = queryKeys.tasks.overdue;

/**
 * Apply a change to every cached `['tasks', filters]` list so the UI updates
 * immediately instead of waiting for a refetch round-trip. The server response
 * still reconciles the cache via `onSettled` invalidation.
 */
const patchTaskLists = (
  queryClient: QueryClient,
  patch: (tasks: Task[], filters?: TaskFilters) => Task[]
) => {
  queryClient
    .getQueriesData<Task[]>({ queryKey: TASKS_KEY })
    .forEach(([key, data]) => {
      // Only patch the filtered *list* caches - never the detail/overdue caches.
      if (!data || !Array.isArray(key) || key[1] !== 'list') return;
      const filters = key[2] as TaskFilters | undefined;
      queryClient.setQueryData<Task[]>(key, patch(data, filters));
    });
};

export const useTasks = (filters?: TaskFilters) => {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.tasks.list(filters),
    queryFn: () => taskService.getTasks(token!, filters!),
    enabled: !!token,
  });
};

export const useTask = (id: string) => {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.tasks.detail(id),
    queryFn: () => taskService.getTaskById(token!, id),
    enabled: !!token && !!id,
  });
};

export const useCreateTask = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (task: CreateTaskInput) => taskService.createTask(token!, task),
    onMutate: async (taskInput) => {
      await queryClient.cancelQueries({ queryKey: TASKS_KEY });
      await queryClient.cancelQueries({ queryKey: OVERDUE_KEY });

      const previousTasks = queryClient.getQueriesData<Task[]>({ queryKey: TASKS_KEY });
      const previousOverdue = queryClient.getQueryData<Task[]>(OVERDUE_KEY);

      const now = new Date().toISOString();
      const optimisticTask: Task = {
        id: `optimistic-${Date.now()}`,
        user_id: '',
        title: taskInput.title,
        description: taskInput.description,
        category: taskInput.category,
        priority: taskInput.priority,
        due_date: taskInput.due_date,
        status: 'todo',
        created_at: now,
        updated_at: now,
      };

      patchTaskLists(queryClient, (tasks, filters) =>
        matchesFilters(optimisticTask, filters)
          ? sortByCreatedAtDesc([optimisticTask, ...tasks])
          : tasks
      );

      if (isOverdueTask(optimisticTask)) {
        queryClient.setQueryData<Task[]>(OVERDUE_KEY, (old) =>
          old ? [optimisticTask, ...old] : [optimisticTask]
        );
      }

      return { previousTasks, previousOverdue };
    },
    onError: (_error, _variables, context) => {
      context?.previousTasks?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      queryClient.setQueryData(OVERDUE_KEY, context?.previousOverdue);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
      queryClient.invalidateQueries({ queryKey: OVERDUE_KEY });
    },
  });
};

export const useUpdateTask = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, task }: { id: string; task: UpdateTaskInput }) =>
      taskService.updateTask(token!, id, task),
    onMutate: async ({ id, task: updates }) => {
      await queryClient.cancelQueries({ queryKey: TASKS_KEY });
      await queryClient.cancelQueries({ queryKey: OVERDUE_KEY });
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(id) });

      const previousTasks = queryClient.getQueriesData<Task[]>({ queryKey: TASKS_KEY });
      const previousOverdue = queryClient.getQueryData<Task[]>(OVERDUE_KEY);
      const previousSingle = queryClient.getQueryData<Task>(queryKeys.tasks.detail(id));

      const applyUpdate = (task: Task): Task => {
        const definedUpdates = Object.fromEntries(
          Object.entries(updates).filter(([, value]) => value !== undefined)
        );
        return { ...task, ...definedUpdates } as Task;
      };

      patchTaskLists(queryClient, (tasks, filters) =>
        tasks
          .map((task) => (task.id === id ? applyUpdate(task) : task))
          .filter((task) => matchesFilters(task, filters))
      );

      queryClient.setQueryData<Task[]>(OVERDUE_KEY, (old) => {
        if (!old) return old;
        const existing = old.find((task) => task.id === id);
        if (!existing) return old;
        const updated = applyUpdate(existing);
        return isOverdueTask(updated)
          ? old.map((task) => (task.id === id ? updated : task))
          : old.filter((task) => task.id !== id);
      });

      if (previousSingle) {
        queryClient.setQueryData<Task>(queryKeys.tasks.detail(id), applyUpdate(previousSingle));
      }

      return { previousTasks, previousOverdue, previousSingle };
    },
    onError: (_error, variables, context) => {
      context?.previousTasks?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      queryClient.setQueryData(OVERDUE_KEY, context?.previousOverdue);
      if (context?.previousSingle) {
        queryClient.setQueryData(queryKeys.tasks.detail(variables.id), context.previousSingle);
      }
    },
    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
      queryClient.invalidateQueries({ queryKey: OVERDUE_KEY });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(id) });
    },
  });
};

export const useDeleteTask = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => taskService.deleteTask(token!, id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: TASKS_KEY });
      await queryClient.cancelQueries({ queryKey: OVERDUE_KEY });

      const previousTasks = queryClient.getQueriesData<Task[]>({ queryKey: TASKS_KEY });
      const previousOverdue = queryClient.getQueryData<Task[]>(OVERDUE_KEY);

      patchTaskLists(queryClient, (tasks) => tasks.filter((task) => task.id !== id));
      queryClient.setQueryData<Task[]>(OVERDUE_KEY, (old) =>
        old ? old.filter((task) => task.id !== id) : old
      );

      return { previousTasks, previousOverdue };
    },
    onError: (_error, _variables, context) => {
      context?.previousTasks?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      queryClient.setQueryData(OVERDUE_KEY, context?.previousOverdue);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
      queryClient.invalidateQueries({ queryKey: OVERDUE_KEY });
    },
  });
};

export const useOverdueTasks = () => {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: OVERDUE_KEY,
    queryFn: () => taskService.getOverdueTasks(token!),
    enabled: !!token,
  });
};
