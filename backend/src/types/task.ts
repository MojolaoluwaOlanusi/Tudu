export type Category = 'work' | 'personal' | 'study';
export type Priority = 'low' | 'medium' | 'high';
export type Status = 'todo' | 'doing' | 'done';

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

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category?: Category;
  priority?: Priority;
  due_date?: string;
  status: Status;
  created_at: string;
  updated_at: string;
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

/** A single "move this card to that column" instruction. */
export interface StatusChange {
  id: string;
  status: Status;
}

export interface BatchStatusUpdateInput {
  updates: StatusChange[];
}
