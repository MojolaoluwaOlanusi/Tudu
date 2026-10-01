import React, { useEffect, useState } from 'react';
import { Task, CreateTaskInput, Category, Priority } from '../../types/task';

interface TaskFormProps {
  onSubmit: (task: CreateTaskInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialTask?: Task | null;
}

// Convert a stored ISO date string into the local "YYYY-MM-DDTHH:mm" value
// that a <input type="datetime-local"> expects.
const toDateTimeLocalValue = (value?: string): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const TaskForm: React.FC<TaskFormProps> = ({ onSubmit, onCancel, isLoading, initialTask }) => {
  const isEditing = Boolean(initialTask);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [dueDate, setDueDate] = useState('');

  // Prepopulate the form whenever the task being edited changes.
  useEffect(() => {
    setTitle(initialTask?.title ?? '');
    setDescription(initialTask?.description ?? '');
    setCategory(initialTask?.category ?? '');
    setPriority(initialTask?.priority ?? '');
    setDueDate(toDateTimeLocalValue(initialTask?.due_date));
  }, [initialTask]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      category: category || undefined,
      priority: priority || undefined,
      due_date: dueDate || undefined,
    });
  };

  return (
    <section className="card animate-fade-in p-5 sm:p-6">
      <h2 className="mb-4 font-handwritten text-2xl text-ink sm:text-3xl">
        {isEditing ? 'Edit task' : 'New task'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="task-title">Title *</label>
          <input
            id="task-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            placeholder="What needs doing?"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="label" htmlFor="task-desc">Description</label>
          <textarea
            id="task-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input resize-none"
            rows={3}
            placeholder="Add a few details (optional)"
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="label" htmlFor="task-category">Category</label>
            <select
              id="task-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category | '')}
              className="input"
              disabled={isLoading}
            >
              <option value="">None</option>
              <option value="work">Work</option>
              <option value="personal">Personal</option>
              <option value="study">Study</option>
            </select>
          </div>

          <div>
            <label className="label" htmlFor="task-priority">Priority</label>
            <select
              id="task-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority | '')}
              className="input"
              disabled={isLoading}
            >
              <option value="">None</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label className="label" htmlFor="task-due">Due date &amp; time</label>
            <input
              id="task-due"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="btn-ghost" disabled={isLoading}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !title.trim()}
            className="btn-accent brush-stroke"
          >
            {isLoading
              ? isEditing
                ? 'Saving...'
                : 'Creating...'
              : isEditing
                ? 'Save changes'
                : 'Create task'}
          </button>
        </div>
      </form>
    </section>
  );
};

export default TaskForm;
