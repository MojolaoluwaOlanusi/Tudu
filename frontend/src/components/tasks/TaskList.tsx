import React, { useState } from 'react';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useOverdueTasks } from '../../hooks/useTasks';
import { Task, CreateTaskInput, UpdateTaskInput } from '../../types/task';
import TaskCard from './TaskCard';
import TaskForm from './TaskForm';

const TaskList: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const { data: tasks, isLoading, error } = useTasks();
  const { data: overdueTasks } = useOverdueTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const handleCreateTask = async (task: CreateTaskInput) => {
    await createTask.mutateAsync(task);
    setShowForm(false);
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
          onSubmit={handleCreateTask}
          onCancel={() => {
            setShowForm(false);
            setEditingTask(null);
          }}
          isLoading={createTask.isPending}
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
