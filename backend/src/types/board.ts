/**
 * Board & column definitions (Phase 1.1).
 *
 * A column's `stage` is what ties it back to the pre-existing lifecycle: the
 * stage is copied into `tasks.status` on every move, so everything that reads
 * `status` (Kanban grouping, analytics, activity log, filters) keeps working
 * unchanged.
 */
export type Stage = 'todo' | 'doing' | 'done';

export const STAGES: Stage[] = ['todo', 'doing', 'done'];

/** Permitted column accents. Kept to a fixed palette so the UI can trust it. */
export const COLUMN_COLORS = [
  'gray',
  'red',
  'orange',
  'amber',
  'green',
  'teal',
  'blue',
  'violet',
  'pink',
] as const;

export type ColumnColor = (typeof COLUMN_COLORS)[number];

export interface Board {
  id: string;
  user_id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
  /** Number of columns, supplied by `GET /api/boards`. */
  column_count?: number;
}

export interface BoardColumn {
  id: string;
  board_id: string;
  name: string;
  position: number;
  color: ColumnColor;
  stage: Stage;
  wip_limit: number | null;
  created_at: string;
  updated_at: string;
  /** How many cards currently sit here, supplied alongside the column list. */
  task_count?: number;
  /** True when `task_count` is at or over `wip_limit`. */
  over_wip_limit?: boolean;
}

export interface CreateBoardInput {
  name?: string;
}

export interface UpdateBoardInput {
  name?: string;
  position?: number;
}

export interface CreateColumnInput {
  name?: string;
  stage?: Stage;
  color?: string;
  wip_limit?: number | null;
}

export interface UpdateColumnInput {
  name?: string;
  stage?: Stage;
  color?: string;
  wip_limit?: number | null;
}

/** `PUT /api/columns/reorder` - the board's columns in their new order. */
export interface ReorderColumnsInput {
  column_ids: string[];
}
