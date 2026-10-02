import { createServer, type Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import type { Application } from 'express';
import { setIO } from './utils/socket';
import { verifyToken } from './utils/jwt';
import { userRoom, type SocketData } from './types/socket';

export interface RealtimeServer {
  httpServer: HttpServer;
  io: Server;
}

/**
 * Builds the HTTP + Socket.io server.
 *
 * Split out of server.ts and deliberately does *not* listen on a port, so
 * tests can drive it on an ephemeral port (or not at all) instead of colliding
 * with a dev server already bound to 5000.
 */
export const createRealtimeServer = (app: Application): RealtimeServer => {
  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
    // Detect a dead connection (laptop asleep, network drop) reasonably quickly
    // instead of waiting for the browser's own timeout.
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  // Let controllers emit real-time events without importing `io` directly.
  setIO(io);

  /** Live socket count per user, purely so the logs are readable. */
  const connectionsByUser = new Map<string, number>();

  /**
   * Authenticate the handshake before any socket is allowed in.
   *
   * Previously the client asked for a room with `join-user-room <userId>`,
   * which let anyone join anyone else's room and receive their task events.
   * Verifying the JWT here means a socket is bound to its own user from the
   * first frame.
   */
  io.use((socket, next) => {
    const handshake = socket.handshake;
    const authToken = handshake.auth?.token;
    const header = handshake.headers.authorization;
    const queryToken = handshake.query?.token;

    const token =
      (typeof authToken === 'string' && authToken) ||
      (typeof header === 'string' ? header.replace(/^Bearer\s+/i, '') : '') ||
      (typeof queryToken === 'string' ? queryToken : '');

    if (!token) {
      return next(new Error('Unauthorized: no token supplied'));
    }

    try {
      const decoded = verifyToken(token);
      socket.data.userId = decoded.userId;
      socket.data.email = decoded.email;
      return next();
    } catch {
      return next(new Error('Unauthorized: invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const { userId } = socket.data as SocketData;

    // The room is derived from the verified token, never from client input.
    socket.join(userRoom(userId));

    const open = (connectionsByUser.get(userId) ?? 0) + 1;
    connectionsByUser.set(userId, open);
    console.log(`[socket] connected ${socket.id} user=${userId} (${open} open)`);

    socket.emit('socket:ready', { userId, connectedAt: new Date().toISOString() });

    socket.on('disconnect', (reason) => {
      const next = (connectionsByUser.get(userId) ?? 1) - 1;
      if (next <= 0) {
        connectionsByUser.delete(userId);
      } else {
        connectionsByUser.set(userId, next);
      }
      console.log(
        `[socket] disconnected ${socket.id} user=${userId} (${reason}, ${Math.max(next, 0)} open)`
      );
    });
  });

  return { httpServer, io };
};

export default createRealtimeServer;