import type { Server } from 'socket.io';

/**
 * Small bridge so controllers can push real-time events without importing
 * the Socket.io server (which would create a circular dependency).
 */
let io: Server | null = null;

export const setIO = (server: Server): void => {
  io = server;
};

/** Emit to every socket a user has open (they join `user-<id>` on connect). */
export const emitToUser = (userId: string, event: string, payload: unknown): void => {
  io?.to(`user-${userId}`).emit(event, payload);
};