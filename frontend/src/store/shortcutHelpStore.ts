import { create } from 'zustand';

interface ShortcutHelpState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

/** Visibility of the "?" keyboard-shortcuts modal. */
export const useShortcutHelpStore = create<ShortcutHelpState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
