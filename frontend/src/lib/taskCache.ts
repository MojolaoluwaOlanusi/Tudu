import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { queryKeys } from './queryClient';
import { Task, TaskFilters } from '../types/task';

export const isOverdueTask = (task: Task): boolean =>
  !!task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

export const matchesFilters = (task: Task, filters?: TaskFilters): boolean => {
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

export const sortByCreatedAtDesc = (tasks: Task[]): Task[] =>
  [...tasks].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

const dueTime = (task: Task): number =>
  task.due_date ? new Date(task.due_date).getTime() : Number.MAX_SAFE_INTEGER;

export interface TaskCacheSnapshot {
  kanban?: Task[];
  lists: Array<[QueryKey, Task[] | undefined]>;
  overdue?: Task[];
}

const withStatus = (task: Task, changes: Record<string, Task['status']>): Task =>
  changes[task.id] ? { ...task, status: changes[task.id] } : task;

export const snapshotTaskCaches = (queryClient: QueryClient): TaskCacheSnapshot => ({
  kanban: queryClient.getQueryData<Task[]>(queryKeys.tasks.kanban),
  lists: queryClient.getQueriesData<Task[]>({ queryKey: queryKeys.tasks.all }),
  overdue: queryClient.getQueryData<Task[]>(queryKeys.tasks.overdue),
});

export const restoreTaskCaches = (
  queryClient: QueryClient,
  snapshot: TaskCacheSnapshot
): void => {
  if (snapshot.kanban) queryClient.setQueryData(queryKeys.tasks.kanban, snapshot.kanban);
  snapshot.lists.forEach(([key, data]) => queryClient.setQueryData(key, data));
  if (snapshot.overdue) queryClient.setQueryData(queryKeys.tasks.overdue, snapshot.overdue);
};

/** Every task we can see across the caches (used to rebuild the overdue list). */
const collectKnownTasks = (queryClient: QueryClient): Task[] => {
  const map = new Map<string, Task>();
  queryClient
    .getQueryData<Task[]>(queryKeys.tasks.kanban)
    ?.forEach((task) => map.set(task.id, task));
  queryClient
    .getQueriesData<Task[]>({ queryKey: queryKeys.tasks.all })
    .forEach(([, data]) => data?.forEach((task) => map.set(task.id, task)));
  return Array.from(map.values());
};

/**
 * Optimistically move tasks between columns across every task cache:
 * the Kanban board, the filtered lists and the overdue list.
 */
export const applyStatusChanges = (
  queryClient: QueryClient,
  changes: Record<string, Task['status']>
): void => {
  // 1. Kanban board
  queryClient.setQueryData<Task[]>(queryKeys.tasks.kanban, (old) =>
    old ? old.map((task) => withStatus(task, changes)) : old
  );

  // 2. Filtered lists - a moved card leaves any list it no longer matches.
  queryClient
    .getQueriesData<Task[]>({ queryKey: queryKeys.tasks.all })
    .forEach(([key, data]) => {
      if (!data || !Array.isArray(key) || key[1] !== 'list') return;
      const filters = key[2] as TaskFilters | undefined;
      queryClient.setQueryData<Task[]>(key, (old) =>
        (old ?? [])
          .map((task) => withStatus(task, changes))
          .filter((task) => matchesFilters(task, filters))
      );
    });

  // 3. Overdue list - rebuilt from every task we know about.
  const known = collectKnownTasks(queryClient).map((task) => withStatus(task, changes));
  if (known.length > 0) {
    queryClient.setQueryData<Task[]>(
      queryKeys.tasks.overdue,
      known.filter(isOverdueTask).sort((a, b) => dueTime(a) - dueTime(b))
    );
  }
};
