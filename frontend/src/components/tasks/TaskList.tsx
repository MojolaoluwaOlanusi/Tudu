import React, { useMemo } from 'react';
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useOverdueTasks,
} from '../../hooks/useTasks';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useUiStore } from '../../store/uiStore';
import {
  useFilterStore,
  useTaskFilters,
  useHasActiveFilters,
} from '../../store/filterStore';
import { Task, CreateTaskInput, UpdateTaskInput, Category, Priority, Status } from '../../types/task';
import TaskCard from './TaskCard';
import TaskForm from './TaskForm';
import ShareModal from '../sharing/ShareModal';
import { useMyShares, flattenShares } from '../../hooks/useSharing';
import SearchBar from '../common/SearchBar';
import FilterDropdown from '../common/FilterDropdown';

const TaskList: React.FC = () => {
  /* ------------- Filters (Zustand) ------------- */
  const search = useFilterStore((s) => s.search);
  const setSearch = useFilterStore((s) => s.setSearch);
  const setStatus = useFilterStore((s) => s.setStatus);
  const setCategory = useFilterStore((s) => s.setCategory);
  const setPriority = useFilterStore((s) => s.setPriority);
  const clearFilters = useFilterStore((s) => s.clearFilters);
  const filters = useTaskFilters();
  const hasActiveFilters = useHasActiveFilters();

  // Debounce the search box so typing does not fire a request per keystroke.
  const debouncedSearch = useDebouncedValue(search, 300);
  const activeFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch || undefined }),
    [filters, debouncedSearch]
  );

  /* -------------- UI state (Zustand) -------------- */
  const isTaskFormOpen = useUiStore((s) => s.isTaskFormOpen);
  const editingTaskId = useUiStore((s) => s.editingTaskId);
  const openTaskForm = useUiStore((s) => s.openTaskForm);
  const closeTaskForm = useUiStore((s) => s.closeTaskForm);
  const isSidebarOpen = useUiStore((s) => s.isSidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const pushToast = useUiStore((s) => s.pushToast);
  const isShareModalOpen = useUiStore((s) => s.isShareModalOpen);
  const openShareModal = useUiStore((s) => s.openShareModal);

  /* ----------- Server state (React Query) ----------- */
  const { data: tasks, isLoading, isFetching, isError, error, refetch } =
    useTasks(activeFilters);
  const { data: overdueTasks } = useOverdueTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { data: myShares } = useMyShares();

  // Ids of tasks I have shared, used for the "Shared" tag on the card.
  const sharedTaskIds = useMemo(() => {
    const ids = new Set<string>();
    (myShares ? flattenShares(myShares) : []).forEach((share) => {
      if (share.status === 'declined') return;
      (share.task_ids ?? []).forEach((id) => ids.add(id));
    });
    return ids;
  }, [myShares]);

  // The task being edited may live in the main list or in the overdue list.
  const editingTask = useMemo(
    () =>
      [...(tasks ?? []), ...(overdueTasks ?? [])].find(
        (task) => task.id === editingTaskId
      ) ?? null,
    [tasks, overdueTasks, editingTaskId]
  );

  const notify = (err: unknown, fallback: string) => {
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
        await createTask.mutateAsync(values);
        pushToast('Task created', 'success');
      }
      closeTaskForm();
    } catch (err) {
      notify(err, 'Could not save the task');
    }
  };

  const handleUpdateTask = async (id: string, updates: UpdateTaskInput) => {
    try {
      await updateTask.mutateAsync({ id, task: updates });
    } catch (err) {
      notify(err, 'Could not update the task');
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteTask.mutateAsync(id);
      pushToast('Task deleted', 'success');
    } catch (err) {
      notify(err, 'Could not delete the task');
    }
  };

  const handleStatusChange = (id: string, status: Task['status']) =>
    handleUpdateTask(id, { status });

  const handleEdit = (task: Task) => openTaskForm(task.id);

  /* -------------- Loading / error -------------- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-accent" />
      </div>
    );
  }

  if (isError) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-handwritten text-3xl text-ink sm:text-4xl">
          My tasks
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={toggleSidebar} className="btn-ghost sm:hidden">
            {isSidebarOpen ? 'Hide filters' : 'Filters'}
          </button>
          <button onClick={openShareModal} className="btn-ghost shrink-0">
            Share
          </button>
          <button
            onClick={() =>
              isTaskFormOpen && !editingTask ? closeTaskForm() : openTaskForm(null)
            }
            className="btn-accent brush-stroke shrink-0"
          >
            {isTaskFormOpen && !editingTask ? 'Cancel' : '+ New task'}
          </button>
        </div>
      </div>

      {isFetching && !isLoading && (
        <p className="text-xs text-ink-muted">Syncing…</p>
      )}

      {/* Search is always visible */}
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search tasks by title or description..."
      />

      {/* Filter panel: collapsible on mobile, always open from sm upwards */}
      <div className={`card p-4 ${isSidebarOpen ? 'block' : 'hidden'} sm:block`}>
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

      {/* Overdue tasks */}
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

      {isShareModalOpen && <ShareModal tasks={tasks ?? []} />}

      {!tasks || tasks.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-handwritten text-2xl text-ink-muted">
            No tasks yet — create your first one!
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => (
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
      )}
    </div>
  );
};

export default TaskList;