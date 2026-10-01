import React, { useState } from 'react';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useOverdueTasks } from '../../hooks/useTasks';
import { Task, CreateTaskInput, UpdateTaskInput, TaskFilters, Category, Priority, Status } from '../../types/task';
import TaskCard from './TaskCard';
import TaskForm from './TaskForm';
import SearchBar from '../common/SearchBar';
import FilterDropdown from '../common/FilterDropdown';

const TaskList: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filters, setFilters] = useState<TaskFilters>({});

  const { data: tasks, isLoading, error } = useTasks(filters);
  const { data: overdueTasks } = useOverdueTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const handleSubmitTask = async (values: CreateTaskInput) => {
    try {
      if (editingTask) {
        await updateTask.mutateAsync({ id: editingTask.id, task: values });
      } else {
        await createTask.mutateAsync(values);
      }
      setShowForm(false);
      setEditingTask(null);
    } catch {
      // React Query surfaces the error; keep the form open so the user can retry.
    }
  };

  const handleUpdateTask = async (id: string, updates: UpdateTaskInput) => {
    await updateTask.mutateAsync({ id, task: updates });
  };

  const handleDeleteTask = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await deleteTask.mutateAsync(id);
    }
  };

  const handleStatusChange = async (id: string, status: Task['status']) => {
    await handleUpdateTask(id, { status });
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleSearchChange = (search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  };

  const handleStatusFilterChange = (status: string) => {
    setFilters((prev) => ({
      ...prev,
      status: status as Status | undefined,
    }));
  };

  const handleCategoryFilterChange = (category: string) => {
    setFilters((prev) => ({
      ...prev,
      category: category as Category | undefined,
    }));
  };

  const handlePriorityFilterChange = (priority: string) => {
    setFilters((prev) => ({
      ...prev,
      priority: priority as Priority | undefined,
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.values(filters).some((value) => value !== undefined && value !== '');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Error loading tasks. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-handwritten text-gray-800 dark:text-white">
          My Tasks
        </h2>
        <button
          onClick={() => {
            setEditingTask(null);
            setShowForm(!showForm);
          }}
          className="px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-green-600 transition-colors brush-stroke"
        >
          {showForm ? 'Cancel' : '+ New Task'}
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <div className="space-y-4">
          <SearchBar
            value={filters.search || ''}
            onChange={handleSearchChange}
            placeholder="Search tasks by title or description..."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FilterDropdown
              label="Status"
              value={filters.status || ''}
              onChange={handleStatusFilterChange}
              options={[
                { value: 'todo', label: 'To-do' },
                { value: 'doing', label: 'Doing' },
                { value: 'done', label: 'Done' },
              ]}
            />
            <FilterDropdown
              label="Category"
              value={filters.category || ''}
              onChange={handleCategoryFilterChange}
              options={[
                { value: 'work', label: 'Work' },
                { value: 'personal', label: 'Personal' },
                { value: 'study', label: 'Study' },
              ]}
            />
            <FilterDropdown
              label="Priority"
              value={filters.priority || ''}
              onChange={handlePriorityFilterChange}
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
              className="text-sm text-brand-green hover:text-green-600 transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Overdue Tasks Section */}
      {overdueTasks && overdueTasks.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-3">
            Overdue Tasks ({overdueTasks.length})
          </h3>
          <div className="grid gap-3">
            {overdueTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={handleEdit}
                onDelete={handleDeleteTask}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <TaskForm
          initialTask={editingTask}
          onSubmit={handleSubmitTask}
          onCancel={() => {
            setShowForm(false);
            setEditingTask(null);
          }}
          isLoading={createTask.isPending || updateTask.isPending}
        />
      )}

      {!tasks || tasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            No tasks yet. Create your first task!
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
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
