import type { Server } from 'socket.io';
import { userRoom } from '../types/socket';

/**
 * Small bridge so controllers can push real-time events without importing
 * the Socket.io server (which would create a circular dependency).
 */
let io: Server | null = null;

export const setIO = (server: Server): void => {
  io = server;
};

export const getIO = (): Server | null => io;

/**
 * The number of distinct users with at least one open socket right now.
 *
 * Kept module-level (like `io`) so the public stats endpoint can read it
 * without importing the socket server. Updated by socketServer.ts on every
 * connect and disconnect. `connectionsByUser` is keyed by user id, so
 * `size` counts distinct users, not sockets.
 */
let activeUserCount = 0;

export const setActiveUserCount = (n: number): void => {
  activeUserCount = n < 0 ? 0 : Math.floor(n);
};

export const getActiveUserCount = (): number => activeUserCount;

/** Emit to every socket a user has open (they join `user-<id>` on connect). */
export const emitToUser = (userId: string, event: string, payload: unknown): void => {
  if (!userId) return;
  io?.to(userRoom(userId)).emit(event, payload);
};

/**
 * Emit once to each of several users. Socket.io rooms would do this anyway,
 * but de-duplicating here keeps a task owner who is also a collaborator from
 * receiving the same payload twice.
 */
export const emitToUsers = (
  userIds: Iterable<string>,
  event: string,
  payload: unknown
): void => {
  if (!io) return;
  const seen = new Set<string>();
  for (const userId of userIds) {
    if (!userId || seen.has(userId)) continue;
    seen.add(userId);
    io.to(userRoom(userId)).emit(event, payload);
  }
};