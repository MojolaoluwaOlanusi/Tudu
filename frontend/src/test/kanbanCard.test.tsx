import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import KanbanCard from '../components/kanban/KanbanCard';
import type { Task } from '../types/task';

// KanbanCard pulls in AssigneeChip (queries) and an overdue helper.
// Mock both so we can isolate the render.
vi.mock('../hooks/useBoards', () => ({ useBoards: () => ({ data: [] }) }));
vi.mock('../hooks/useWorkspaces', () => ({
  useWorkspaceMembers: () => ({ data: [] }),
  useAssignTask: () => ({ mutate: vi.fn(), isPending: false }),
}));

const makeTask = (over: Partial<Task> = {}): Task =>
  ({
    id: 't1',
    user_id: 'u1',
    title: 'Ship it',
    status: 'todo',
    priority: 'high',
    category: 'work',
    due_date: null,
    subtask_count: 0,
    subtasks_completed: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...over,
  } as Task);

describe('KanbanCard chip palettes', () => {
  it('renders the priority chip with the mockup tint classes', () => {
    render(
      <KanbanCard
        task={makeTask()}
        isSelected={false}
        onToggleSelect={() => {}}
        onEdit={() => {}}
      />
    );
    const chip = screen.getByText(/^high$/i);
    expect(chip.className).toMatch(/bg-red-500\/10/);
    expect(chip.className).toMatch(/text-red-400/);
  });

  it('renders the category chip with the mockup tint classes', () => {
    render(
      <KanbanCard
        task={makeTask()}
        isSelected={false}
        onToggleSelect={() => {}}
        onEdit={() => {}}
      />
    );
    const chip = screen.getByText(/^work$/i);
    expect(chip.className).toMatch(/bg-blue-500\/10/);
    expect(chip.className).toMatch(/text-blue-400/);
  });

  it('renders the overdue due-date chip in red', () => {
    render(
      <KanbanCard
        task={makeTask({ due_date: '2020-01-01T00:00:00Z' })}
        isSelected={false}
        onToggleSelect={() => {}}
        onEdit={() => {}}
      />
    );
    expect(screen.getByText(/overdue/i).className).toMatch(/text-red-400/);
  });
});