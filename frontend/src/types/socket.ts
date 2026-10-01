import { Task } from './task';

/** Task events pushed by the server. Mirrors backend/src/types/socket.ts. */
export const SOCKET_EVENTS = {
  taskCreate: 'task:create',
  taskUpdate: 'task:update',
  taskMove: 'task:move',
  taskDelete: 'task:delete',
} as const;

export type TaskSocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

/** Sent with every task event so a client can recognise its own echo. */
export interface TaskEventPayload {
  task: Task;
  actorId: string;
}

export interface TaskDeletedPayload {
  taskId: string;
  actorId: string;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

/** Payload shapes of the pre-existing sharing events. */
export interface CollabEventPayload {
  shareId?: string;
  by?: { id?: string };
}