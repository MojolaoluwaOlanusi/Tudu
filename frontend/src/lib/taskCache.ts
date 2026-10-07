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

/**
 * A pending move: a bare status (the classic payload) or a status plus the
 * destination column. Accepting both keeps every existing caller working.
 */
export type TaskMovePatch =
  | Task['status']
  | { status: Task['status']; column_id?: string | null };

const withStatus = (task: Task, changes: Record<string, TaskMovePatch>): Task => {
  const patch = changes[task.id];
  if (!patch) return task;
  if (typeof patch === 'string') return { ...task, status: patch };
  return {
    ...task,
    status: patch.status,
    // Only overwrite placement when the move actually named a column, so a
    // status-only move cannot blank out a column the card already sits in.
    ...(patch.column_id != null ? { column_id: patch.column_id } : {}),
  };
};

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

/**
 * Every task we can see across the caches (used to rebuild the overdue list).
 *
 * Only the list-shaped caches count. `['tasks', ...]` also holds per-task
 * detail entries, which contain a single Task rather than an array of them,
 * so the shape has to be checked before iterating.
 */
const collectKnownTasks = (queryClient: QueryClient): Task[] => {
  const map = new Map<string, Task>();
  const collect = (tasks: Task[] | undefined) =>
    tasks?.forEach((task) => map.set(task.id, task));

  collect(queryClient.getQueryData<Task[]>(queryKeys.tasks.kanban));
  queryClient
    .getQueriesData<Task[]>({ queryKey: queryKeys.tasks.all })
    .forEach(([, data]) => {
      if (!Array.isArray(data)) return;
      collect(data);
    });
  return Array.from(map.values());
};

/**
 * Optimistically move tasks between columns across every task cache:
 * the Kanban board, the filtered lists and the overdue list.
 */
export const applyStatusChanges = (
  queryClient: QueryClient,
  changes: Record<string, TaskMovePatch>
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

/** Insert or replace a task everywhere it can appear, in place of a refetch. */
export const applyTaskUpsert = (queryClient: QueryClient, incoming: Task): void => {
  const merge = (list: Task[]): Task[] => {
    const exists = list.some((task) => task.id === incoming.id);
    return exists
      ? list.map((task) => (task.id === incoming.id ? { ...task, ...incoming } : task))
      : [incoming, ...list];
  };

  queryClient.setQueryData<Task[]>(queryKeys.tasks.kanban, (old) =>
    old ? sortByCreatedAtDesc(merge(old)) : old
  );

  queryClient
    .getQueriesData<Task[]>({ queryKey: queryKeys.tasks.all })
    .forEach(([key, data]) => {
      if (!data || !Array.isArray(key) || key[1] !== 'list') return;
      const filters = key[2] as TaskFilters | undefined;
      queryClient.setQueryData<Task[]>(key, (old) =>
        old ? sortByCreatedAtDesc(merge(old).filter((task) => matchesFilters(task, filters))) : old
      );
    });

  queryClient.setQueryData<Task>(queryKeys.tasks.detail(incoming.id), (old) =>
    old ? { ...old, ...incoming } : incoming
  );

  queryClient.setQueryData<Task[]>(queryKeys.tasks.overdue, (old) => {
    if (!old) return old;
    return merge(old).filter(isOverdueTask).sort((a, b) => dueTime(a) - dueTime(b));
  });
};

/** Drop a deleted task from every task cache. */
export const applyTaskRemoval = (queryClient: QueryClient, taskId: string): void => {
  const drop = (list: Task[]): Task[] => list.filter((task) => task.id !== taskId);

  queryClient.setQueryData<Task[]>(queryKeys.tasks.kanban, (old) => (old ? drop(old) : old));

  queryClient
    .getQueriesData<Task[]>({ queryKey: queryKeys.tasks.all })
    .forEach(([key, data]) => {
      if (!data || !Array.isArray(key) || key[1] !== 'list') return;
      queryClient.setQueryData<Task[]>(key, (old) => (old ? drop(old) : old));
    });

  queryClient.setQueryData<Task[]>(queryKeys.tasks.overdue, (old) => (old ? drop(old) : old));
  queryClient.removeQueries({ queryKey: queryKeys.tasks.detail(taskId) });
};

/**
 * Nudge the sub-task counters on a task inside every task cache, so the
 * "2/5 completed" badge updates without a refetch.
 */
export const adjustSubtaskCounts = (
  queryClient: QueryClient,
  taskId: string,
  delta: { total?: number; completed?: number }
): void => {
  const patch = (task: Task): Task =>
    task.id === taskId
      ? {
          ...task,
          subtask_count: Math.max(0, (task.subtask_count ?? 0) + (delta.total ?? 0)),
          subtasks_completed: Math.max(
            0,
            (task.subtasks_completed ?? 0) + (delta.completed ?? 0)
          ),
        }
      : task;

  queryClient.setQueryData<Task[]>(queryKeys.tasks.kanban, (old) =>
    old ? old.map(patch) : old
  );

  queryClient
    .getQueriesData<Task[]>({ queryKey: queryKeys.tasks.all })
    .forEach(([key, data]) => {
      if (!data || !Array.isArray(key) || key[1] !== 'list') return;
      queryClient.setQueryData<Task[]>(key, (old) => (old ? old.map(patch) : old));
    });

  queryClient.setQueryData<Task>(queryKeys.tasks.detail(taskId), (old) =>
    old ? patch(old) : old
  );
};
