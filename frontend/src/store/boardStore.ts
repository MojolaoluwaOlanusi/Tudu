import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Which board the Kanban is currently showing.
 *
 * Persisted so a reload lands back on the same board. `null` means "no explicit
 * choice yet" - the first board from the API is used instead, so a user who has
 * never touched the selector sees exactly one board and behaves as before.
 */
interface BoardState {
  activeBoardId: string | null;
  setActiveBoard: (id: string | null) => void;
}

export const useBoardStore = create<BoardState>()(
  persist(
    (set) => ({
      activeBoardId: null,
      setActiveBoard: (id) => set({ activeBoardId: id }),
    }),
    { name: 'tudu-active-board' }
  )
);
