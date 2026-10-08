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

/** Phase 1.2 - team boards & permissions. */
export type TeamRole = 'admin' | 'member' | 'viewer';

export const TEAM_ROLES: TeamRole[] = ['admin', 'member', 'viewer'];

export interface Workspace {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  /** The caller's own role (or 'admin' for the owner), if any. */
export interface Workspace {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  /** The caller's own role (or 'admin' for the owner), if any. */
  my_role?: TeamRole | null;
  member_count?: number;
}

export interface WorkspaceMember {
  my_role?: TeamRole | null;
  member_count?: number;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: TeamRole;
  created_at: string;
  name?: string | null;
  email?: string;
  avatar_url?: string | null;
}

export interface BoardMember {
  board_id: string;
  user_id: string;
  role: TeamRole;
  created_at: string;
  name?: string | null;
  email?: string;
  avatar_url?: string | null;
}

export interface CreateWorkspaceInput {
  name?: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
}

export interface SetMemberRoleInput {
  role?: TeamRole;
  email?: string;
}


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
