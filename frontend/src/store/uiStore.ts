import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface UIState {
  /* ---------------- Modals ---------------- */
  isTaskFormOpen: boolean;
  editingTaskId: string | null;
  openTaskForm: (taskId?: string | null) => void;
  closeTaskForm: () => void;

  /* -------------- Sidebar -------------- */
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;

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
  openTaskForm: (taskId) => set({ isTaskFormOpen: true, editingTaskId: taskId ?? null }),
  closeTaskForm: () => set({ isTaskFormOpen: false, editingTaskId: null }),

  isSidebarOpen: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  closeSidebar: () => set({ isSidebarOpen: false }),

  toasts: [],
  pushToast: (message, variant = 'info') => {
    const id = `toast-${++toastCounter}`;
    set((state) => ({ toasts: [...state.toasts, { id, message, variant }] }));
    // Auto-dismiss after a few seconds.
    setTimeout(() => get().dismissToast(id), TOAST_TIMEOUT);
  },
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
  clearToasts: () => set({ toasts: [] }),
}));
