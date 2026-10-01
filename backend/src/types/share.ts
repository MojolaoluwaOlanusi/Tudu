export type SharePermission = 'read' | 'read_write';
export type ShareStatus = 'pending' | 'accepted' | 'declined';

/** Minimal public profile of a user (never exposes the password hash). */
export interface SharedUser {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
}

export interface SharedList {
  id: string;
  owner_id: string;
  shared_with_user_id: string;
  task_ids: string[];
  permissions: SharePermission;
  status: ShareStatus;
  created_at: string;
  /** Denormalised from the users table for display. */
  owner?: SharedUser;
  shared_with?: SharedUser;
  task_count?: number;
  tasks_completed?: number;
}

export interface SharedListWithTasks extends SharedList {
  tasks: unknown[];
}

export interface CreateShareInput {
  email: string;
  taskIds: string[];
  permissions: SharePermission;
}