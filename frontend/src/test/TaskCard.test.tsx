import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskCard from '../components/tasks/TaskCard';
import type { Task } from '../types/task';

// TaskCard reaches into these stores and hooks; keep them inert.
vi.mock('../hooks/useSubtasks', () => ({
  useSubtasks: () => ({ data: [] }),
  useCreateSubtask: () => ({ mutateAsync: vi.fn() }),
  useUpdateSubtask: () => ({ mutate: vi.fn() }),
  useDeleteSubtask: () => ({ mutate: vi.fn() }),
}));
vi.mock('../hooks/usePomodoro', () => ({
  useCompletePomodoro: () => ({ mutate: vi.fn() }),
  useStartPomodoro: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../hooks/useActivity', () => ({
  useTaskActivity: () => ({ data: [] }),
}));

const makeTask = (over: Partial<Task> = {}): Task =>
  ({
    id: 'task-1',
    user_id: 'user-1',
    title: 'Write the tests',
    description: null,
    status: 'todo',
    priority: null,
    category: null,
    due_date: null,
    subtask_count: 0,
    subtasks_completed: 0,
    ...over,
  } as Task);

describe('TaskCard', () => {
  it('renders the title', () => {
    render(<TaskCard task={makeTask()} />);
    expect(screen.getByText('Write the tests')).toBeInTheDocument();
  });

  it('shows no checkmark while the task is open', () => {
    const { container } = render(<TaskCard task={makeTask({ status: 'todo' })} />);
    expect(container.querySelector('.check-pop')).toBeNull();
  });

  it('shows an animated checkmark once the task is done', () => {
    const { container } = render(<TaskCard task={makeTask({ status: 'done' })} />);
    expect(container.querySelector('.check-pop')).not.toBeNull();
  });

  it('strikes through a completed title', () => {
    render(<TaskCard task={makeTask({ status: 'done' })} />);
    expect(screen.getByText('Write the tests')).toHaveClass('line-through');
  });

  it('renders a very long title without truncating the element', () => {
    // The responsiveness fix relies on min-w-0 so long titles wrap.
    const long = 'x'.repeat(300);
    render(<TaskCard task={makeTask({ title: long })} />);
    expect(screen.getByText(long)).toBeInTheDocument();
  });

  it('reports status changes through onStatusChange', async () => {
    const onStatusChange = vi.fn();
    render(
      <TaskCard
        task={makeTask()}
        onStatusChange={onStatusChange}
      />
    );

    await userEvent.selectOptions(
      screen.getByLabelText('Change task status'),
      'done'
    );

    expect(onStatusChange).toHaveBeenCalledWith('task-1', 'done');
  });

  it('hides the controls when no handler is supplied (shared lists)', () => {
    render(<TaskCard task={makeTask()} />);
    expect(screen.queryByLabelText('Change task status')).toBeNull();
  });

  it('falls back to a read-only status badge without a handler', () => {
    render(<TaskCard task={makeTask({ status: 'doing' })} />);
    expect(screen.getByText('doing')).toBeInTheDocument();
  });

  it('offers edit and delete only when handlers exist', () => {
    const { rerender } = render(<TaskCard task={makeTask()} />);
    expect(screen.queryByLabelText('Edit task')).toBeNull();

    rerender(
      <TaskCard task={makeTask()} onEdit={vi.fn()} onDelete={vi.fn()} />
    );
    expect(screen.getByLabelText('Edit task')).toBeInTheDocument();
    expect(screen.getByLabelText('Delete task')).toBeInTheDocument();
  });

  it('shows sub-task progress when present', () => {
    render(
      <TaskCard task={makeTask({ subtask_count: 4, subtasks_completed: 3 })} />
    );
    expect(screen.getByText('3/4')).toBeInTheDocument();
  });
});