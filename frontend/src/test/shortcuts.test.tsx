import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ShortcutHelp from '../components/common/ShortcutHelp';
import CommandPalette from '../components/common/CommandPalette';
import { useShortcutHelpStore } from '../store/shortcutHelpStore';
import { useCommandPaletteStore } from '../store/commandPaletteStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// The palette reads boards and tasks; both hooks are stubbed.
vi.mock('../hooks/useBoards', () => ({
  useBoards: () => ({ data: [] }),
}));
vi.mock('../hooks/useTasks', () => ({
  useTasks: () => ({ data: [] }),
}));
vi.mock('../store/uiStore', () => ({
  useUiStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ openTaskForm: vi.fn() }),
}));
vi.mock('../store/boardStore', () => ({
  useBoardStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ setActiveBoard: vi.fn() }),
}));

const wrap = (ui: React.ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );

describe('keyboard shortcut modals', () => {
  beforeEach(() => {
    useShortcutHelpStore.getState().close();
    useCommandPaletteStore.getState().close();
  });

  it('renders nothing while closed', () => {
    wrap(<ShortcutHelp />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('lists the shortcuts when the help store is open', () => {
    useShortcutHelpStore.getState().open();
    wrap(<ShortcutHelp />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Keyboard shortcuts/i)).toBeInTheDocument();
    expect(screen.getByText(/Go to Board/i)).toBeInTheDocument();
    expect(screen.getByText(/Command palette/i)).toBeInTheDocument();
  });

  it('CommandPalette renders nothing while closed', () => {
    wrap(<CommandPalette />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('CommandPalette shows the action list when open', () => {
    useCommandPaletteStore.getState().open();
    wrap(<CommandPalette />);
    expect(screen.getByRole('dialog', { name: /Command palette/i })).toBeInTheDocument();
    expect(screen.getByText(/New task/i)).toBeInTheDocument();
    expect(screen.getByText(/Go to Board/i)).toBeInTheDocument();
  });

  it('CommandPalette filters by query', () => {
    useCommandPaletteStore.getState().open();
    wrap(<CommandPalette />);
    const input = screen.getByLabelText(/Command palette search/i);
    fireEvent.change(input, { target: { value: 'stats' } });
    expect(screen.getByText(/Go to Stats/i)).toBeInTheDocument();
    expect(screen.queryByText(/Go to Board/i)).toBeNull();
  });
});
