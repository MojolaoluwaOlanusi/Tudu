import { create } from 'zustand';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Renders the confirm button in red when true. */
  destructive?: boolean;
}

interface Pending extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

interface ConfirmState {
  current: Pending | null;
  /**
   * Show a confirm dialog and resolve once the user answers.
   * If another dialog is already pending, it is resolved false first so
   * callers are never left awaiting a promise that will never settle.
   */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  resolve: (value: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  current: null,
  confirm: (options) =>
    new Promise<boolean>((resolve) => {
      const { current } = get();
      if (current) current.resolve(false);
      set({ current: { ...options, resolve } });
    }),
  resolve: (value) => {
    const { current } = get();
    if (current) current.resolve(value);
    set({ current: null });
  },
}));