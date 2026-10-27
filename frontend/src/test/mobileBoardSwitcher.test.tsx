import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockBoards = vi.fn();
vi.mock('../hooks/useBoards', () => ({
  useBoards: () => mockBoards(),
  useActiveBoardId: () => 'b1',
}));
vi.mock('../store/boardStore', () => ({
  useBoardStore: (selector: (s: { setActiveBoard: () => void }) => unknown) =>
    selector({ setActiveBoard: vi.fn() }),
}));

import MobileBoardSwitcher from '../components/app/MobileBoardSwitcher';

describe('MobileBoardSwitcher', () => {
  beforeEach(() => mockBoards.mockReset());

  it('renders nothing for a single-board user', () => {
    mockBoards.mockReturnValue({ data: [{ id: 'b1', name: 'Solo' }] });
    render(<MobileBoardSwitcher />);
    expect(screen.queryByLabelText(/switch board/i)).toBeNull();
  });

  it('renders nothing when there are no boards at all', () => {
    mockBoards.mockReturnValue({ data: [] });
    render(<MobileBoardSwitcher />);
    expect(screen.queryByLabelText(/switch board/i)).toBeNull();
  });

  it('renders one option per board when there are two or more', () => {
    mockBoards.mockReturnValue({
      data: [
        { id: 'b1', name: 'Personal', workspace_name: null },
        { id: 'b2', name: 'Sprint 12', workspace_name: 'Acme' },
      ],
    });
    render(<MobileBoardSwitcher />);
    const select = screen.getByLabelText(/switch board/i) as HTMLSelectElement;
    expect(select.options).toHaveLength(2);
    expect(select.options[1].textContent).toBe('Acme · Sprint 12');
  });
});