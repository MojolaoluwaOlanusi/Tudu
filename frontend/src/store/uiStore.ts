import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

export type DetailTarget =
  | { type: 'task'; id: string }
  | { type: 'column'; id: string };

interface UIState {
  /* ---------------- Modals ---------------- */
  isTaskFormOpen: boolean;
  editingTaskId: string | null;
  composerColumnId: string | null;
  openTaskForm: (taskId?: string | null, columnId?: string | null) => void;
  closeTaskForm: () => void;

  /* ----------- Detail panel (right) ----------- */
  detail: DetailTarget | null;
  openDetail: (payload: DetailTarget) => void;
  closeDetail: () => void;

  /* -------------- Filter panel -------------- */
  filtersOpen: boolean;
  toggleFilters: () => void;
  setFiltersOpen: (open: boolean) => void;

  /* -------------- Sidebar -------------- */
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;

  /* ----------- Share modal ----------- */
  isShareModalOpen: boolean;
  openShareModal: () => void;
  closeShareModal: () => void;

  /* -------------- Toasts -------------- */
  toasts: Toast[];
  pushToast: (message: string, variant?: ToastVariant) => void;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
}

let toastCounter = 0;
const TOAST_TIMEOUT = 4000;

export const useUiStore = create<UIState>()((set, get) => ({
  isTaskFormOpen: false,
  editingTaskId: null,
  composerColumnId: null,
  openTaskForm: (taskId, columnId) =>
    set({
      isTaskFormOpen: true,
      editingTaskId: taskId ?? null,
      composerColumnId: columnId ?? null,
    }),
  closeTaskForm: () =>
    set({ isTaskFormOpen: false, editingTaskId: null, composerColumnId: null }),

  detail: null,
  openDetail: (payload) => set({ detail: payload }),
  closeDetail: () => set({ detail: null }),

  filtersOpen: true,
  toggleFilters: () => set((state) => ({ filtersOpen: !state.filtersOpen })),
  setFiltersOpen: (open) => set({ filtersOpen: open }),

  isSidebarOpen: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  closeSidebar: () => set({ isSidebarOpen: false }),

  isShareModalOpen: false,
  openShareModal: () => set({ isShareModalOpen: true }),
  closeShareModal: () => set({ isShareModalOpen: false }),

  toasts: [],
  pushToast: (message, variant = 'info') => {
    const id = `toast-${++toastCounter}`;
    set((state) => ({ toasts: [...state.toasts, { id, message, variant }] }));
    setTimeout(() => get().dismissToast(id), TOAST_TIMEOUT);
  },
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clearToasts: () => set({ toasts: [] }),
}));
