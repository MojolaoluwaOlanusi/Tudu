import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app';
import { setIO } from './utils/socket';
import { verifyToken } from './utils/jwt';
import { userRoom, type SocketData } from './types/socket';

dotenv.config();

const PORT = process.env.PORT || 5000;

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

/**
 * Authenticate the handshake before any socket is allowed in.
 *
 * Previously the client asked for a room with `join-user-room <userId>`, which
 * let anyone join anyone else's room and receive their task events. Verifying
 * the JWT here means a socket is bound to its own user from the first frame.
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

/** Live socket count per user, purely so the logs are readable. */
const connectionsByUser = new Map<string, number>();

const trackConnection = (userId: string): number =>
  (connectionsByUser.get(userId) ?? 0) + 1;

const trackDisconnection = (userId: string): number => {
  const next = (connectionsByUser.get(userId) ?? 1) - 1;
  if (next <= 0) {
    connectionsByUser.delete(userId);
    return 0;
  }
  connectionsByUser.set(userId, next);
  return next;
};

io.on('connection', (socket) => {
  const { userId } = socket.data as SocketData;

  // The room is derived from the verified token, never from client input.
  socket.join(userRoom(userId));

  const open = trackConnection(userId);
  console.log(`[socket] connected ${socket.id} user=${userId} (${open} open)`);

  socket.emit('socket:ready', { userId, connectedAt: new Date().toISOString() });

  socket.on('disconnect', (reason) => {
    const remaining = trackDisconnection(userId);
    console.log(`[socket] disconnected ${socket.id} user=${userId} (${reason}, ${remaining} open)`);
  });
});

// Make io available to other modules
export { io };

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
