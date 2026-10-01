import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { queryKeys } from '../lib/queryClient';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

/** Events the backend emits for collaboration. */
const COLLAB_EVENTS = [
  'share-invited',
  'share-accepted',
  'share-declined',
  'share-removed',
  'shared-lists-changed',
  'shared-task-updated',
];

/**
 * Keeps shared lists in sync in real time.
 * Joins the user's private room and refreshes the relevant caches
 * whenever a collaborator shares, accepts or edits something.
 */
export const useCollaborationSocket = (): void => {
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const socket: Socket = io(SOCKET_URL, { withCredentials: true });
    socket.emit('join-user-room', userId);

    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shares.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    };

    COLLAB_EVENTS.forEach((event) => socket.on(event, refresh));

    return () => {
      COLLAB_EVENTS.forEach((event) => socket.off(event, refresh));
      socket.disconnect();
    };
  }, [userId, queryClient]);
};