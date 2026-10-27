import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useConfirmStore } from '../store/confirmStore';

const reset = () => useConfirmStore.setState({ current: null });

describe('ConfirmDialog', () => {
  beforeEach(reset);

  it('renders nothing when no confirm is pending', () => {
    render(<ConfirmDialog />);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('renders the title and resolves true when the confirm button is clicked', async () => {
    render(<ConfirmDialog />);
    let promise: Promise<boolean>;
    act(() => {
      promise = useConfirmStore.getState().confirm({
        title: 'Delete task?',
        message: 'You can undo this from the toast.',
        confirmLabel: 'Delete',
        destructive: true,
      });
    });
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Delete task?')).toBeInTheDocument();
    expect(screen.getByText(/you can undo/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    await expect(promise!).resolves.toBe(true);
  });

  it('resolves false when cancel is clicked', async () => {
    render(<ConfirmDialog />);
    let promise: Promise<boolean>;
    act(() => {
      promise = useConfirmStore.getState().confirm({ title: 'X' });
    });
    await screen.findByRole('alertdialog');
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await expect(promise!).resolves.toBe(false);
  });

  it('resolves false on Escape', async () => {
    render(<ConfirmDialog />);
    let promise: Promise<boolean>;
    act(() => {
      promise = useConfirmStore.getState().confirm({ title: 'X' });
    });
    await screen.findByRole('alertdialog');
    fireEvent.keyDown(window, { key: 'Escape' });
    await expect(promise!).resolves.toBe(false);
  });

  it('supersedes a pending confirm when a second one opens', async () => {
    render(<ConfirmDialog />);
    let first!: Promise<boolean>;
    let second!: Promise<boolean>;
    act(() => {
      first = useConfirmStore.getState().confirm({ title: 'First' });
    });
    await screen.findByText('First');
    act(() => {
      second = useConfirmStore.getState().confirm({ title: 'Second' });
    });
    await expect(first).resolves.toBe(false);
    expect(await screen.findByText('Second')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await expect(second).resolves.toBe(false);
  });
});