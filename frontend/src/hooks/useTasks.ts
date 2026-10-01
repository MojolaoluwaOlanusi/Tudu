import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { taskService } from '../services/taskService';
import { useAuthStore } from '../store/authStore';
import { Task, CreateTaskInput, UpdateTaskInput, TaskFilters } from '../types/task';

const TASKS_KEY: QueryKey = ['tasks'];
const OVERDUE_KEY: QueryKey = ['overdue-tasks'];

const isTaskOverdue = (task: Task): boolean =>
  !!task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

const matchesFilters = (task: Task, filters?: TaskFilters): boolean => {
  if (!filters) return true;
  if (filters.status && task.status !== filters.status) return false;
  if (filters.category && task.category !== filters.category) return false;
  if (filters.priority && task.priority !== filters.priority) return false;
  if (filters.search) {
    const query = filters.search.toLowerCase();
    const matchesTitle = task.title?.toLowerCase().includes(query) ?? false;
    const matchesDescription = task.description?.toLowerCase().includes(query) ?? false;
    if (!matchesTitle && !matchesDescription) return false;
  }
  return true;
};

const sortByCreatedAtDesc = (tasks: Task[]): Task[] =>
  [...tasks].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

/**
 * Apply a change to every cached `['tasks', filters]` list so the UI updates
 * immediately instead of waiting for a refetch round-trip. The server response
 * still reconciles the cache via `onSettled` invalidation.
 */
const patchTaskLists = (
  queryClient: QueryClient,
  patch: (tasks: Task[], filters?: TaskFilters) => Task[]
) => {
  queryClient.getQueriesData<Task[]>({ queryKey: TASKS_KEY }).forEach(([key, data]) => {
    if (!data) return;
    const filters = Array.isArray(key) ? (key[1] as TaskFilters | undefined) : undefined;
    queryClient.setQueryData<Task[]>(key, patch(data, filters));
  });
};

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

      if (isTaskOverdue(optimisticTask)) {
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
      await queryClient.cancelQueries({ queryKey: ['task', id] });

      const previousTasks = queryClient.getQueriesData<Task[]>({ queryKey: TASKS_KEY });
      const previousOverdue = queryClient.getQueryData<Task[]>(OVERDUE_KEY);
      const previousSingle = queryClient.getQueryData<Task>(['task', id]);

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
        return isTaskOverdue(updated)
          ? old.map((task) => (task.id === id ? updated : task))
          : old.filter((task) => task.id !== id);
      });

      if (previousSingle) {
        queryClient.setQueryData<Task>(['task', id], applyUpdate(previousSingle));
      }

      return { previousTasks, previousOverdue, previousSingle };
    },
    onError: (_error, variables, context) => {
      context?.previousTasks?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      queryClient.setQueryData(OVERDUE_KEY, context?.previousOverdue);
      if (context?.previousSingle) {
        queryClient.setQueryData(['task', variables.id], context.previousSingle);
      }
    },
    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
      queryClient.invalidateQueries({ queryKey: OVERDUE_KEY });
      queryClient.invalidateQueries({ queryKey: ['task', id] });
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
