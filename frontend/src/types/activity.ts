export type ActivityAction =
  | 'task_created'
  | 'task_updated'
  | 'task_moved'
  | 'task_completed'
  | 'task_deleted'
  | 'subtask_created'
  | 'subtask_updated'
  | 'subtask_completed'
  | 'subtask_deleted'
  | 'list_shared'
  | 'share_accepted'
  | 'share_declined';

export interface ActivityDetails {
  title?: string;
  from?: string;
  to?: string;
  fields?: string[];
  taskCount?: number;
  email?: string;
  permissions?: string;
  subtaskTitle?: string;
}

export interface Activity {
  id: string;
  user_id: string;
  task_id: string | null;
  action: ActivityAction;
  details: ActivityDetails | null;
  created_at: string;
  task_title?: string | null;
}

export interface PagedActivity {
  items: Activity[];
  total: number;
}