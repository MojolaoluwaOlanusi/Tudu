import { create } from 'zustand';
import type { ConnectionStatus } from '../types/socket';

/** How long the "Syncing" pill stays visible after a remote change. */
const SYNC_FLASH_MS = 1200;

/**
 * Live connection state for the real-time sync indicator.
 *
 * Kept outside React so a burst of socket events writes to one place instead of
 * re-rendering every subscriber, and deliberately *not* persisted - a reload
 * should always start from a genuinely unknown connection state.
 */
interface SocketStore {
  status: ConnectionStatus;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  setStatus: (status: ConnectionStatus) => void;
  /** Flash the indicator. Restarts the timer so a burst reads as one sync. */
  startSync: () => void;
}

let flashTimer: ReturnType<typeof setTimeout> | null = null;

export const useSocketStore = create<SocketStore>()((set) => ({
  status: 'disconnected',
  isSyncing: false,
  lastSyncedAt: null,

  setStatus: (status) => set({ status }),

  startSync: () => {
    if (flashTimer) clearTimeout(flashTimer);
    set({ isSyncing: true, lastSyncedAt: Date.now() });
    flashTimer = setTimeout(() => {
      set({ isSyncing: false });
      flashTimer = null;
    }, SYNC_FLASH_MS);
  },
}));

export const selectConnectionStatus = (state: SocketStore) => state.status;
export const selectIsSyncing = (state: SocketStore) => state.isSyncing;