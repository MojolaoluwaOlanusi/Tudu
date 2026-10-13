/** Board & column definitions (Phase 1.1). Mirrors `backend/src/types/board.ts`. */
export type Stage = 'todo' | 'doing' | 'done';
export type BoardRole = 'admin' | 'member' | 'viewer';

export const STAGES: Stage[] = ['todo', 'doing', 'done'];

export const COLUMN_COLORS = [
  'gray',
  'red',
  'orange',
  'amber',
  'green',
  'teal',
  'blue',
  'indigo',
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
  column_count?: number;
  task_count?: number;
  /** Set when the board belongs to a workspace (Phase 1.2). */
  workspace_id?: string | null;
  workspace_name?: string | null;
  /** The signed-in user's role on this board (returned by GET /api/boards). */
  role?: BoardRole;
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
  workspace_id?: string | null;
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

export interface ReorderColumnsInput {
  column_ids: string[];
}