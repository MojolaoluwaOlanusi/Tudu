import { Task } from './task';

/** Every private room a user joins on connect. */
export const userRoom = (userId: string): string => `user-${userId}`;

/** Task events pushed by the server. Kept in one place so both sides agree. */
export const SOCKET_EVENTS = {
  taskCreate: 'task:create',
  taskUpdate: 'task:update',
  taskMove: 'task:move',
  taskDelete: 'task:delete',
} as const;

export type TaskSocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

/** A task row as sent over the socket, including the sub-task counters. */
export interface SocketTask extends Task {
  subtask_count?: number;
  subtasks_completed?: number;
}

/**
 * Every task event carries `actorId` so a client can tell its own echo apart
 * from a genuine change made elsewhere (another tab or a collaborator).
 */
export interface TaskEventPayload {
  task: SocketTask;
  actorId: string;
}

export interface TaskDeletedPayload {
  taskId: string;
  actorId: string;
}

export type TaskEventBody = TaskEventPayload | TaskDeletedPayload;

/** Shape of the data attached to a socket during the authenticated handshake. */
export interface SocketData {
  userId: string;
  email: string;
}

export interface ServerToClientEvents {
  'task:create': (payload: TaskEventPayload) => void;
  'task:update': (payload: TaskEventPayload) => void;
  'task:move': (payload: TaskEventPayload) => void;
  'task:delete': (payload: TaskDeletedPayload) => void;
}