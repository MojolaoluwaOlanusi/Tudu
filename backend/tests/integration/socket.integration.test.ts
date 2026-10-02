import { io as ioClient, type Socket } from 'socket.io-client';
import request from 'supertest';
import type { AddressInfo } from 'net';
import app from '../../src/app';
import { createRealtimeServer } from '../../src/socketServer';
import { registerUser, destroyUser, auth, type TestUser } from './helpers';

/**
 * Real-time socket behaviour: the handshake is authenticated from the JWT, the
 * room is derived from the token rather than client input, and task mutations
 * are broadcast only to the owning user.
 */
describe('realtime sockets', () => {
  let owner: TestUser;
  let stranger: TestUser;
  let httpServer: ReturnType<typeof createRealtimeServer>['httpServer'];
  let ioServer: ReturnType<typeof createRealtimeServer>['io'];
  let url: string;

  beforeAll(async () => {
    owner = await registerUser('socket-owner');
    stranger = await registerUser('socket-stranger');

    const server = createRealtimeServer(app);
    httpServer = server.httpServer;
    ioServer = server.io;

    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const { port } = httpServer.address() as AddressInfo;
    url = `http://localhost:${port}`;
  });

  afterAll(async () => {
    ioServer.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    await destroyUser(owner);
    await destroyUser(stranger);
  });

  interface Connection {
    socket: Socket;
    /** Resolves with the handshake payload. */
    ready: Promise<{ userId: string; connectedAt: string }>;
  }

  /**
   * Opens a socket and resolves once connected (or rejects on refusal).
   *
   * The `socket:ready` listener is registered before the handshake starts,
   * because the server emits it the instant the connection is accepted - by
   * the time a 'connect' handler runs, the event has usually already gone.
   */
  const connect = (token?: string): Promise<Connection> =>
    new Promise((resolve, reject) => {
      const socket = ioClient(url, {
        auth: token ? { token } : {},
        transports: ['websocket'],
        reconnection: false,
        forceNew: true,
      });

      let settleReady: (value: { userId: string; connectedAt: string }) => void = () => {};
      const ready = new Promise<{ userId: string; connectedAt: string }>((res) => {
        settleReady = res;
      });
      socket.on('socket:ready', (payload) => settleReady(payload));

      socket.on('connect', () => resolve({ socket, ready }));
      socket.on('connect_error', (err) => {
        socket.close();
        reject(err);
      });
    });

  /** Resolves with the first payload for `event`, or null after a timeout. */
    const waitFor = <T>(socket: Socket, event: string, ms = 3000): Promise<T | null> =>
    new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), ms);
      socket.once(event, (payload: T) => {
        clearTimeout(timer);
        resolve(payload);
      });
    });

  describe('handshake authentication', () => {
    it('accepts a valid token and announces the user', async () => {
      const { socket, ready } = await connect(owner.token);

      const announcement = await ready;
      expect(announcement.userId).toBe(owner.id);

      socket.close();
    });

    it('refuses a connection with no token', async () => {
      await expect(connect()).rejects.toThrow(/no token supplied/i);
    });

    it('refuses a connection with a bogus token', async () => {
      await expect(connect('not-a-real-token')).rejects.toThrow(/invalid or expired/i);
    });

    it('refuses a token signed with the wrong secret', async () => {
      // A structurally valid JWT that this server did not issue.
      const forged = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        'eyJ1c2VySWQiOiJhZG1pbiIsImVtYWlsIjoiZXZpbEBleGFtcGxlLmNvbSJ9',
        'bm90LXRoZS1yaWdodC1zaWduYXR1cmU',
      ].join('.');

      await expect(connect(forged)).rejects.toThrow();
    });
  });

  describe('task broadcasts', () => {
    it('delivers a create event to the owner', async () => {
      const { socket, ready } = await connect(owner.token);
      // Wait for the handshake to finish before mutating anything.
      await ready;

      const received = waitFor<{ title?: string }>(socket, 'task:create');

      const created = await request(app)
        .post('/api/tasks')
        .set(auth(owner))
        .send({ title: 'Broadcast me' });

      const payload = await received;
      expect(payload).not.toBeNull();
      expect(JSON.stringify(payload)).toContain('Broadcast me');
      expect(created.status).toBe(201);

      socket.close();
    });

    /**
     * The room comes from the verified token, so another user must never see
     * these events even though they are connected to the same server.
     */
    it('never leaks another user\'s events', async () => {
      const { socket: listener, ready } = await connect(stranger.token);
      await ready;

      let leaked: unknown = null;
      listener.on('task:create', (payload) => {
        leaked = payload;
      });

      await request(app)
        .post('/api/tasks')
        .set(auth(owner))
        .send({ title: 'Private to the owner' });

      // Give any stray broadcast a chance to arrive before asserting absence.
      await new Promise((resolve) => setTimeout(resolve, 1000));

      expect(leaked).toBeNull();
      listener.close();
    });
  });
});