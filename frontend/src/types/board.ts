/** Board & column definitions (Phase 1.1). Mirrors `backend/src/types/board.ts`. */
export type Stage = 'todo' | 'doing' | 'done';

export const STAGES: Stage[] = ['todo', 'doing', 'done'];

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
  task_count?: number;
  over_wip_limit?: boolean;
}

export interface CreateColumnInput {
  name?: string;
  stage?: Stage;
  color?: string;
  wip_limit?: number | null;
}

export interface UpdateColumnInput extends CreateColumnInput {}

/**
 * The three classic columns, used whenever the board API has not answered yet
 * (or the backend predates this phase). Kept identical to what the server
 * seeds so the board never visibly changes shape while loading.
 */
export const FALLBACK_COLUMNS: { status: Stage; title: string }[] = [
  { status: 'todo', title: 'To-do' },
  { status: 'doing', title: 'Doing' },
  { status: 'done', title: 'Done' },
];
