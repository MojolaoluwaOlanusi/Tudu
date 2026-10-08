import { create } from 'zustand';

/** Which workspace the Kanban is currently showing. */
interface WorkspaceState {
  activeWorkspaceId: string | null;
  setActiveWorkspace: (id: string | null) => void;
  activeBoardId: string | null;
  setActiveBoard: (id: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeWorkspaceId: null,
  setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
  activeBoardId: null,
  setActiveBoard: (id) => set({ activeBoardId: id }),
}));
