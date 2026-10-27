import React, { useEffect, useMemo, useState } from 'react';
import { Filter } from 'lucide-react';
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useOverdueTasks,
  useBatchDeleteTasks,
  useBatchAssignTasks,
} from '../../hooks/useTasks';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useUiStore } from '../../store/uiStore';
import { isNetworkError, shouldShowQueuedToast } from '../../lib/offlineQueue';
import { useUndoStore } from '../../store/undoStore';
import { useConfirmStore } from '../../store/confirmStore';
import { useBoardStore } from '../../store/boardStore';
import {
  useFilterStore,
  useTaskFilters,
  useHasActiveFilters,
} from '../../store/filterStore';
import { Task, CreateTaskInput, Category, Priority, Status } from '../../types/task';
import TaskCard from './TaskCard';
import TaskForm from './TaskForm';
import ShareModal from '../sharing/ShareModal';
import { useMyShares, flattenShares } from '../../hooks/useSharing';
import QueryBar from './QueryBar';
import SortDropdown from './SortDropdown';
import SortDirectionToggle from './SortDirectionToggle';
import BulkActionBar from '../common/BulkActionBar';
import { useUserPreferencesSync } from '../../hooks/useUserPreferencesSync';
import { useSearchParams } from 'react-router-dom';
import { useActiveBoardId } from '../../hooks/useBoards';
import FilterDropdown from '../common/FilterDropdown';
import { useConfetti } from '../common/ConfettiProvider';
import EmptyState from './EmptyState';
import RecentActivity from '../activity/RecentActivity';

const TaskList: React.FC = () => {
  const confirm = useConfirmStore((s) => s.confirm);
  /* ------------- Bulk selection ------------- */
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const batchDelete = useBatchDeleteTasks();
  const batchAssign = useBatchAssignTasks();

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const clearSelection = () => setSelectedIds(new Set());

  const exitSelectMode = () => {
    clearSelection();
    setSelectMode(false);
  };

  useEffect(() => {
    if (!selectMode) return;
    const handler = () => exitSelectMode();
    window.addEventListener('tudu:escape', handler);
    return () => window.removeEventListener('tudu:escape', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectMode]);

  /* ------------- Filters (Zustand) ------------- */
  const search = useFilterStore((s) => s.search);
  const setSearch = useFilterStore((s) => s.setSearch);
  const setStatus = useFilterStore((s) => s.setStatus);
  const setCategory = useFilterStore((s) => s.setCategory);
  const setPriority = useFilterStore((s) => s.setPriority);
  const clearFilters = useFilterStore((s) => s.clearFilters);
  const filters = useTaskFilters();
  const hasActiveFilters = useHasActiveFilters();

  const debouncedSearch = useDebouncedValue(search, 300);
  const activeFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch || undefined }),
    [filters, debouncedSearch]
  );

  /* -------------- UI state -------------- */
  const isTaskFormOpen = useUiStore((s) => s.isTaskFormOpen);
  const editingTaskId = useUiStore((s) => s.editingTaskId);
  const openTaskForm = useUiStore((s) => s.openTaskForm);
  const closeTaskForm = useUiStore((s) => s.closeTaskForm);
  const openDetail = useUiStore((s) => s.openDetail);
  const filtersOpen = useUiStore((s) => s.filtersOpen);
  const toggleFilters = useUiStore((s) => s.toggleFilters);
  const pushToast = useUiStore((s) => s.pushToast);
  const isShareModalOpen = useUiStore((s) => s.isShareModalOpen);
  const openShareModal = useUiStore((s) => s.openShareModal);

  /* ----------- Server state ----------- */
  const { data: tasks, isLoading, isFetching, isError, error, refetch } =
    useTasks(activeFilters);
  const { data: overdueTasks } = useOverdueTasks();
  const explicitBoardId = useBoardStore((s) => s.activeBoardId);
  useUserPreferencesSync();
  const visibleTasks = useMemo(() => {
    const list = tasks ?? [];
    if (!explicitBoardId) return list;
    return list.filter((t) => t.board_id === explicitBoardId);
  }, [tasks, explicitBoardId]);

  const [taskQueryParams] = useSearchParams();
  const setSearchFilter = useFilterStore((s) => s.setSearch);
  const setSortFilter = useFilterStore((s) => s.setSort);
  const setOrderFilter = useFilterStore((s) => s.setOrder);

  useEffect(() => {
    const q = taskQueryParams.get('q');
    if (q !== null && q !== search) setSearchFilter(q);
    const s = taskQueryParams.get('sort');
    if (s) setSortFilter(s as never);
    const o = taskQueryParams.get('order');
    if (o === 'asc' || o === 'desc') setOrderFilter(o);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskQueryParams]);

  const createTask = useCreateTask();
  const activeBoardId = useActiveBoardId();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { data: myShares } = useMyShares();

  const sharedTaskIds = useMemo(() => {
    const ids = new Set<string>();
    (myShares ? flattenShares(myShares) : []).forEach((share) => {
      if (share.status === 'declined') return;
      (share.task_ids ?? []).forEach((id) => ids.add(id));
    });
    return ids;
  }, [myShares]);

  const editingTask = useMemo(
    () =>
      [...(tasks ?? []), ...(overdueTasks ?? [])].find(
        (task) => task.id === editingTaskId
      ) ?? null,
    [tasks, overdueTasks, editingTaskId]
  );

  const notify = (err: unknown, fallback: string) => {
    if (isNetworkError(err)) {
      if (shouldShowQueuedToast()) {
        pushToast('Saved offline — will sync when you reconnect', 'info');
      }
      return;
    }
    const detail =
      (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
    pushToast(detail || fallback, 'error');
  };

  /* ----------------- Mutations ----------------- */
  const handleSubmitTask = async (values: CreateTaskInput) => {
    try {
      if (editingTask) {
        await updateTask.mutateAsync({ id: editingTask.id, task: values });
        pushToast('Task updated', 'success');
      } else {
        await createTask.mutateAsync({ ...values, board_id: activeBoardId ?? undefined });
        pushToast('Task created', 'success');
      }
      closeTaskForm();
    } catch (err) {
      if (isNetworkError(err)) {
        if (shouldShowQueuedToast()) {
          pushToast('Saved offline — will sync when you reconnect', 'info');
        }
        closeTaskForm();
        return;
      }
      notify(err, 'Could not save the task');
    }
  };

  const { burst } = useConfetti();
  const setPendingUndo = useUndoStore((s) => s.setPending);

  const handleDeleteTask = async (id: string) => {
    const task = tasks?.find((t) => t.id === id);
    if (!task) return;
    const ok = await confirm({
      title: 'Delete task?',
      message: 'You can undo this from the toast for 10 seconds.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteTask.mutateAsync(id);
      setPendingUndo({
        taskId: id,
        title: task.title,
        expiresAt: Date.now() + 10_000,
      });
    } catch (err) {
      notify(err, 'Could not delete the task');
    }
  };

  const handleStatusChange = async (id: string, status: Task['status']) => {
    const previous = tasks?.find((task) => task.id === id)?.status;
    try {
      await updateTask.mutateAsync({ id, task: { status } });
      if (status === 'done' && previous !== 'done') {
        burst();
      }
    } catch (err) {
      notify(err, 'Could not update the task');
    }
  };

  const handleEdit = (task: Task) => openDetail({ type: 'task', id: task.id });

  /* ------------- Bulk actions ------------- */
  const handleBulkDone = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      await updateTask.mutateAsync({ id: ids[0], task: { status: 'done' } });
      if (ids.length > 1) {
        await Promise.all(
          ids.slice(1).map((id) =>
            updateTask.mutateAsync({ id, task: { status: 'done' } })
          )
        );
      }
      pushToast(`${ids.length} task${ids.length === 1 ? '' : 's'} marked done`, 'success');
      exitSelectMode();
    } catch (err) {
      notify(err, 'Could not update the tasks');
    }
  };

  const handleBulkTodo = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      await Promise.all(
        ids.map((id) => updateTask.mutateAsync({ id, task: { status: 'todo' } }))
      );
      pushToast(`${ids.length} task${ids.length === 1 ? '' : 's'} reopened`, 'success');
      exitSelectMode();
    } catch (err) {
      notify(err, 'Could not update the tasks');
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const ok = await confirm({
      title: `Delete ${ids.length} task${ids.length === 1 ? '' : 's'}?`,
      message: 'You can undo one at a time from the toast.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await batchDelete.mutateAsync(ids);
      pushToast(`${ids.length} task${ids.length === 1 ? '' : 's'} deleted`, 'success');
      exitSelectMode();
    } catch (err) {
      notify(err, 'Could not delete the selected tasks');
    }
  };

  /* -------------- Loading / error -------------- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-accent" />
      </div>
    );
  }

  if (isError && (!tasks || tasks.length === 0)) {
    return (
      <div className="card p-10 text-center">
        <p className="text-red-500">
          {(error as Error)?.message || 'Error loading tasks.'}
        </p>
        <button onClick={() => refetch()} className="btn-ghost mt-4">
          Try again
        </button>
      </div>
    );
  }

  const taskCount = visibleTasks.length;
  const overdueCount = (overdueTasks ?? []).length;

  return (
    <div className="space-y-6">
      {/* Heading row — mockup layout: title + count, right-aligned actions. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-handwritten text-3xl leading-none text-ink sm:text-4xl">
            My tasks
          </h1>
          <p className="mt-2 text-[12px] text-ink-faint">
            {taskCount} task{taskCount === 1 ? '' : 's'}{explicitBoardId ? ' on this board' : ''}
            {overdueCount > 0 && ` · ${overdueCount} overdue`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={toggleFilters}
            className={
              'btn-ghost !py-1.5 !text-[13px] ' +
              (filtersOpen ? 'border-brand/40 text-brand' : '')
            }
            aria-pressed={filtersOpen}
          >
            <Filter className="h-3.5 w-3.5" />
            {filtersOpen ? 'Hide filters' : 'Filters'}
          </button>
          <button onClick={openShareModal} className="btn-ghost !py-1.5 !text-[13px] shrink-0">
            Share
          </button>
          <button
            onClick={() => {
              if (selectMode) exitSelectMode();
              else setSelectMode(true);
            }}
            className="btn-ghost !py-1.5 !text-[13px] shrink-0"
            aria-pressed={selectMode}
            data-tour="select-tasks"
          >
            {selectMode ? 'Cancel' : 'Select'}
          </button>
          <button
            onClick={() =>
              isTaskFormOpen && !editingTask ? closeTaskForm() : openTaskForm(null)
            }
            className="btn-accent brush-stroke !py-1.5 !text-[13px] shrink-0"
            data-tour="new-task"
          >
            {isTaskFormOpen && !editingTask ? 'Cancel' : '+ New task'}
          </button>
        </div>
      </div>

      {isFetching && !isLoading && (
        <p className="text-xs text-ink-muted">Syncing…</p>
      )}

      {/* Search + sort row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <QueryBar />
        </div>
        <SortDropdown />
        <SortDirectionToggle />
      </div>

      {/* Filters panel (mobile collapsible, desktop always shown) */}
      <div
        className={`card p-4 ${filtersOpen ? 'block' : 'hidden'}`}
        data-tour="filters"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FilterDropdown
              label="Status"
              value={filters.status || ''}
              onChange={(value) => setStatus(value ? (value as Status) : undefined)}
              options={[
                { value: 'todo', label: 'To-do' },
                { value: 'doing', label: 'Doing' },
                { value: 'done', label: 'Done' },
              ]}
            />
            <FilterDropdown
              label="Category"
              value={filters.category || ''}
              onChange={(value) => setCategory(value ? (value as Category) : undefined)}
              options={[
                { value: 'work', label: 'Work' },
                { value: 'personal', label: 'Personal' },
                { value: 'study', label: 'Study' },
              ]}
            />
            <FilterDropdown
              label="Priority"
              value={filters.priority || ''}
              onChange={(value) => setPriority(value ? (value as Priority) : undefined)}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
              ]}
            />
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm font-medium text-accent-strong transition-colors hover:text-accent"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Overdue */}
      {overdueTasks && overdueTasks.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-900/20">
          <h3 className="mb-3 text-lg font-semibold text-red-800 dark:text-red-200">
            Overdue tasks ({overdueTasks.length})
          </h3>
          <div className="grid gap-3">
            {overdueTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isShared={sharedTaskIds.has(task.id)}
                onEdit={handleEdit}
                onDelete={handleDeleteTask}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        </div>
      )}

      {isTaskFormOpen && (
        <TaskForm
          initialTask={editingTask}
          onSubmit={handleSubmitTask}
          onCancel={closeTaskForm}
          isLoading={createTask.isPending || updateTask.isPending}
        />
      )}

      {isShareModalOpen && <ShareModal tasks={visibleTasks} />}

      <BulkActionBar
        count={selectedIds.size}
        busy={batchDelete.isPending || batchAssign.isPending}
        onMarkDone={handleBulkDone}
        onMarkTodo={handleBulkTodo}
        onDelete={handleBulkDelete}
        onClear={clearSelection}
      />

      {visibleTasks.length === 0 ? (
        <EmptyState
          variant={hasActiveFilters ? 'filtered' : 'empty'}
          onNew={() => openTaskForm(null)}
          onClearFilters={clearFilters}
        />
      ) : (
        <div className="grid gap-3">
          {visibleTasks.map((task) => {
            const selected = selectedIds.has(task.id);
            return (
              <div
                key={task.id}
                role={selectMode ? 'checkbox' : undefined}
                aria-checked={selectMode ? selected : undefined}
                tabIndex={selectMode ? 0 : undefined}
                onClick={selectMode ? () => toggleSelect(task.id) : undefined}
                onKeyDown={
                  selectMode
                    ? (e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          toggleSelect(task.id);
                        }
                      }
                    : undefined
                }
                className={
                  selectMode
                    ? 'flex cursor-pointer items-start gap-3 rounded-2xl p-1 transition-colors hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent'
                    : undefined
                }
              >
                {selectMode && (
                  <span
                    aria-hidden="true"
                    className={`mt-4 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                      selected
                        ? 'border-accent bg-accent text-white'
                        : 'border-hairline bg-surface'
                    }`}
                  >
                    {selected && (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M2 6l3 3 5-6" />
                      </svg>
                    )}
                  </span>
                )}
                <div className={selectMode ? 'pointer-events-none flex-1' : 'flex-1'}>
                  <TaskCard
                    task={task}
                    isShared={sharedTaskIds.has(task.id)}
                    onEdit={handleEdit}
                    onDelete={handleDeleteTask}
                    onStatusChange={handleStatusChange}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent activity — mockup puts it at the bottom of the list view,
          with an id so the sidebar's "Recent activity" jump can find it. */}
      <div className="mt-12 border-t border-line-subtle pt-8" data-tour="activity" id="recent-activity">
        <RecentActivity />
      </div>
    </div>
  );
};

export default TaskList;
