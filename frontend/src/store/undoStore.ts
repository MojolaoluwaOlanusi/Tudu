import { create } from 'zustand';

export interface PendingUndo {
  taskId: string;
  title: string;
  /** Epoch ms. The toast hides itself once Date.now() passes this. */
  expiresAt: number;
}

interface UndoState {
  pending: PendingUndo | null;
  setPending: (pending: PendingUndo) => void;
  clearPending: () => void;
}

/**
 * The pending "undo delete" action, if any.
 *
 * One at a time: deleting a second task replaces the first. This is
 * deliberate — a stack of undos invites the user to press Ctrl+Z more times
 * than they meant to, and undoing a stale action is confusing.
 */
export const useUndoStore = create<UndoState>((set) => ({
  pending: null,
  setPending: (pending) => set({ pending }),
  clearPending: () => set({ pending: null }),
}));
