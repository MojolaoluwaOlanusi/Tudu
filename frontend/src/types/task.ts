export type Category = 'work' | 'personal' | 'study';
export type Priority = 'low' | 'medium' | 'high';
export type Status = 'todo' | 'doing' | 'done';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category?: Category;
  priority?: Priority;
  due_date?: string;
  status: Status;
  /** Board/column placement. Null for tasks that predate custom columns. */
  board_id?: string | null;
  column_id?: string | null;
  created_at: string;
  updated_at: string;
  /** Sub-task progress, supplied by the backend. */
  subtask_count?: number;
  subtasks_completed?: number;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  category?: Category;
  priority?: Priority;
  due_date?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  category?: Category;
  priority?: Priority;
  due_date?: string;
  status?: Status;
}

export interface TaskFilters {
  status?: Status;
  category?: Category;
  priority?: Priority;
  search?: string;
}

/**
 * A single "move this card to that column" instruction.
 *
 * `column_id` is optional so the status dropdown and older cached payloads
 * keep working; when present the backend derives `status` from the column's
 * stage, so the two can never drift apart.
 */
export interface StatusChange {
  id: string;
  status: Status;
  column_id?: string | null;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

export interface CreateSubtaskInput {
  title: string;
  completed?: boolean;
}

export interface UpdateSubtaskInput {
  title?: string;
  completed?: boolean;
}
