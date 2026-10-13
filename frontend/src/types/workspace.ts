import type { BoardRole } from './board';

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  role: BoardRole;
  member_count: number;
  created_at: string;
  /** Only returned when a workspace is created: its first board. */
  board_id?: string;
}

export interface WorkspaceMember {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  role: BoardRole;
  status: 'pending' | 'accepted';
  created_at: string;
}

export interface WorkspaceInvite {
  workspace_id: string;
  workspace_name: string;
  role: BoardRole;
  created_at: string;
  inviter_id: string | null;
  inviter_name: string | null;
  inviter_email: string | null;
  inviter_avatar: string | null;
}