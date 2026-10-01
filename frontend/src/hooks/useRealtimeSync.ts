import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';
import { queryKeys } from '../lib/queryClient';
import { applyTaskRemoval, applyTaskUpsert } from '../lib/taskCache';
import {
  SOCKET_EVENTS,
  type CollabEventPayload,
  type TaskDeletedPayload,
  type TaskEventPayload,
} from '../types/socket';

// Prefer an explicit socket URL, then fall back to the API URL so the socket
// still works in production where VITE_SOCKET_URL may not be set.
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || window.location.origin;

/** Sharing events that predate the task events and still drive refetches. */
const COLLAB_EVENTS = [
  'share-invited',
  'share-accepted',
  'share-declined',
  'share-removed',
  'shared-lists-changed',
  'shared-task-updated',
  'shared-task-deleted',
];

/**
 * Keeps the app in step with changes made anywhere - another tab of the same
 * account, or a collaborator on a shared board.
 *
 * Task events are applied straight to the React Query cache (no refetch), while
 * sharing events keep the original invalidate-everything behaviour.
 */
export const useRealtimeSync = (): void => {
  const token = useAuthStore((state) => state.token);
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();
  const setStatus = useSocketStore((state) => state.setStatus);
  const startSync = useSocketStore((state) => state.startSync);

  // Distinguishes the first connect (nothing to catch up on) from a reconnect
  // (events were missed while the socket was down, so refetch to fill the gap).
  const hasConnected = useRef(false);

  useEffect(() => {
    if (!token || !userId) return;

    setStatus('connecting');

    const socket: Socket = io(SOCKET_URL, {
      // The server verifies this during the handshake and joins the room.
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
    });

    const onConnect = () => {
      setStatus('connected');

      if (hasConnected.current) {
        // Missed events while offline: reconcile with the server.
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.shares.all });
        startSync();
      }
      hasConnected.current = true;
    };

    const onDisconnect = () => setStatus('disconnected');

    const onConnectError = (error: Error) => {
      setStatus('disconnected');
      // A rejected token will never become valid by retrying, so stop instead
      // of hammering the server; the next sign-in remounts this hook.
      if (/unauthorized/i.test(error.message)) {
        socket.io.opts.reconnection = false;
      }
    };

    /** Apply a task create/update/move to the cache without refetching. */
    const onTaskEvent = (payload: TaskEventPayload) => {
      if (!payload?.task?.id) return;
      applyTaskUpsert(queryClient, payload.task);
      // Our own change is already on screen; only flag changes from elsewhere.
      if (payload.actorId !== userId) startSync();
    };

    const onTaskDeleted = (payload: TaskDeletedPayload) => {
      if (!payload?.taskId) return;
      applyTaskRemoval(queryClient, payload.taskId);
      if (payload.actorId !== userId) startSync();
    };

    const onCollabEvent = (payload?: CollabEventPayload) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shares.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      if (payload?.by?.id !== userId) startSync();
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on(SOCKET_EVENTS.taskCreate, onTaskEvent);
    socket.on(SOCKET_EVENTS.taskUpdate, onTaskEvent);
    socket.on(SOCKET_EVENTS.taskMove, onTaskEvent);
    socket.on(SOCKET_EVENTS.taskDelete, onTaskDeleted);
    COLLAB_EVENTS.forEach((event) => socket.on(event, onCollabEvent));

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off(SOCKET_EVENTS.taskCreate, onTaskEvent);
      socket.off(SOCKET_EVENTS.taskUpdate, onTaskEvent);
      socket.off(SOCKET_EVENTS.taskMove, onTaskEvent);
      socket.off(SOCKET_EVENTS.taskDelete, onTaskDeleted);
      COLLAB_EVENTS.forEach((event) => socket.off(event, onCollabEvent));
      socket.disconnect();
      hasConnected.current = false;
    };
  }, [token, userId, queryClient, setStatus, startSync]);
};