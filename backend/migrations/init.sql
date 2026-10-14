-- Users table for OAuth and email authentication
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  password VARCHAR(255),
  provider VARCHAR(50),
  provider_id VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Backfill columns for databases created before email/password auth existed.
-- (CREATE TABLE IF NOT EXISTS never alters an already-existing table.)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  category VARCHAR(50) CHECK (category IN ('work', 'personal', 'study')),
  priority VARCHAR(50) CHECK (priority IN ('low', 'medium', 'high')),
  due_date TIMESTAMP,
  status VARCHAR(50) DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Subtasks table
CREATE TABLE IF NOT EXISTS subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Activity log table
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  action VARCHAR(100),
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Shared lists table
CREATE TABLE IF NOT EXISTS shared_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  task_ids UUID[],
  permissions VARCHAR(50) DEFAULT 'read_write',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Invitation lifecycle for shared lists (pending -> accepted / declined).
-- (CREATE TABLE IF NOT EXISTS never alters an already-existing table.)
ALTER TABLE shared_lists ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending';

-- Pomodoro sessions table
CREATE TABLE IF NOT EXISTS pomodoro_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  duration INTEGER NOT NULL,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_task_id ON activity_log(task_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_shared_lists_owner_id ON shared_lists(owner_id);
CREATE INDEX IF NOT EXISTS idx_shared_lists_shared_with_user_id ON shared_lists(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_id ON pomodoro_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_task_id ON pomodoro_sessions(task_id);

-- ---------------------------------------------------------------------------
-- Phase 1.1 - Custom columns & board flexibility
--
-- Board & column definitions are purely additive: `tasks.status` is left
-- exactly as it was and stays the source of truth for the lifecycle, because
-- it carries a CHECK constraint and is read by the Kanban grouping, the
-- analytics aggregates, the activity log and the status filters. Dropping it
-- (as ENTERPRISE_ROADMAP.md suggests) would break all of those, so instead:
--
--   * every column belongs to a *stage* ('todo' | 'doing' | 'done'),
--   * `tasks.column_id` records which column a card sits in,
--   * `tasks.status` mirrors that column's stage.
--
-- A task with `column_id IS NULL` (every task that existed before this
-- migration) is still placed by its status, so nothing needs backfilling and
-- the board looks identical until a user edits their columns.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- `column` is a SQL keyword, hence the qualified table name.
CREATE TABLE IF NOT EXISTS board_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  color VARCHAR(30) NOT NULL DEFAULT 'gray',
  stage VARCHAR(20) NOT NULL DEFAULT 'todo' CHECK (stage IN ('todo', 'doing', 'done')),
  wip_limit INTEGER CHECK (wip_limit IS NULL OR wip_limit >= 1),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ON DELETE SET NULL rather than CASCADE: deleting a column must never take
-- tasks (and everything cascading from them) with it.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES boards(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS column_id UUID REFERENCES board_columns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_boards_user_id ON boards(user_id);
CREATE INDEX IF NOT EXISTS idx_board_columns_board_id ON board_columns(board_id);
CREATE INDEX IF NOT EXISTS idx_board_columns_position ON board_columns(board_id, position);
CREATE INDEX IF NOT EXISTS idx_tasks_board_id ON tasks(board_id);
CREATE INDEX IF NOT EXISTS idx_tasks_column_id ON tasks(column_id);


-- ---------------------------------------------------------------------------
-- Pre-flight for Phase 1.1b. The backfill below filters boards by workspace_id,
-- but that column is otherwise created by the 1.2 section further down. Creating
-- workspaces and adding the columns here (idempotently) makes this file safe on
-- a fresh database.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workspaces (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255) NOT NULL,
  owner_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE boards ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE tasks  ADD COLUMN IF NOT EXISTS assignee_id UUID;

-- =====================================================================
-- Phase 1.1b - board integrity.
-- Every task belongs to exactly one board and sits in a column of that board
-- whose stage equals tasks.status. A trigger enforces it for EVERY code path
-- (createTask, updateTask, updateSharedTask, drag & drop, batch moves), so no
-- controller has to remember to keep column_id in step with status.
-- Idempotent like the rest of this file: safe to run on every `npm run migrate`.
-- =====================================================================
CREATE OR REPLACE FUNCTION tasks_sync_board_column() RETURNS trigger AS $$
DECLARE
  v_stage  TEXT;
  v_board  UUID;
  v_status TEXT;
  v_column UUID;
BEGIN
  -- 1. An explicitly chosen column wins: it decides the board and the status.
  IF NEW.column_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.column_id IS DISTINCT FROM OLD.column_id) THEN
    SELECT stage, board_id INTO v_stage, v_board
      FROM board_columns WHERE id = NEW.column_id;
    IF v_stage IS NOT NULL THEN
      NEW.status := v_stage;
      NEW.board_id := v_board;
      RETURN NEW;
    END IF;
  END IF;

  -- 2. No board yet: use the owner's first board (the one ensureDefaultBoard returns).
  IF NEW.board_id IS NULL THEN
    SELECT id INTO NEW.board_id FROM boards
     WHERE user_id = NEW.user_id AND workspace_id IS NULL
     ORDER BY position ASC, created_at ASC
     LIMIT 1;
  END IF;
  IF NEW.board_id IS NULL THEN
    RETURN NEW;  -- the user has no board yet; ensureDefaultBoard adopts the task later
  END IF;

  -- 3. Status changed (or column missing / on another board): re-home the card
  --    to the first column on its board that carries its status.
  v_status := COALESCE(NEW.status, 'todo');
  IF NEW.column_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM board_columns
                     WHERE id = NEW.column_id
                       AND board_id = NEW.board_id
                       AND stage = v_status) THEN
    SELECT id INTO v_column FROM board_columns
     WHERE board_id = NEW.board_id AND stage = v_status
     ORDER BY position ASC
     LIMIT 1;
    NEW.column_id := v_column;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tasks_sync_board_column ON tasks;
CREATE TRIGGER trg_tasks_sync_board_column
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION tasks_sync_board_column();

-- Backfill (no-op once everything is consistent).
-- 1) A card sitting in a column belongs to that column's board.
UPDATE tasks t SET board_id = bc.board_id
  FROM board_columns bc
 WHERE t.column_id = bc.id AND t.board_id IS DISTINCT FROM bc.board_id;

-- 2) A card with no board goes to its owner's first board.
UPDATE tasks t SET board_id = b.id
  FROM (SELECT DISTINCT ON (user_id) id, user_id
          FROM boards
         WHERE workspace_id IS NULL
         ORDER BY user_id, position ASC, created_at ASC) b
 WHERE t.board_id IS NULL AND t.user_id = b.user_id;

-- 3) Where column and status disagree, status wins (it is what the List view and
--    analytics already show). `SET status = status` fires the trigger, which
--    moves the card to the right column without touching updated_at.
UPDATE tasks SET status = status
 WHERE board_id IS NOT NULL
   AND (column_id IS NULL
        OR NOT EXISTS (SELECT 1 FROM board_columns bc
                        WHERE bc.id = tasks.column_id
                          AND bc.board_id = tasks.board_id
                          AND bc.stage = COALESCE(tasks.status, 'todo')));

-- =====================================================================
-- Phase 1.2 - team boards and permissions.
-- A board is either personal (workspace_id IS NULL, only its creator has access)
-- or belongs to one workspace (every accepted member gets their workspace role).
-- =====================================================================
CREATE TABLE IF NOT EXISTS workspaces (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255) NOT NULL,
  owner_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Same invitation lifecycle as shared_lists: pending -> accepted (a decline deletes the row).
CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         VARCHAR(20) NOT NULL DEFAULT 'member'
               CHECK (role IN ('admin', 'member', 'viewer')),
  status       VARCHAR(20) NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'accepted')),
  invited_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);

DO $$ BEGIN
  ALTER TABLE boards ADD CONSTRAINT boards_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_boards_workspace_id ON boards(workspace_id);

DO $$ BEGIN
  ALTER TABLE tasks ADD CONSTRAINT tasks_assignee_id_fkey
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);

-- The user's role on a board: 'admin' | 'member' | 'viewer', or NULL for no access.
-- A creator is admin only of PERSONAL boards; on a workspace board everyone
-- (creator included) gets their workspace role, so leaving a workspace ends access.
CREATE OR REPLACE FUNCTION get_board_role(p_user UUID, p_board UUID) RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT 'admin'::text FROM boards
      WHERE id = p_board AND user_id = p_user AND workspace_id IS NULL),
    (SELECT wm.role::text
       FROM boards b
       JOIN workspace_members wm ON wm.workspace_id = b.workspace_id
      WHERE b.id = p_board AND wm.user_id = p_user AND wm.status = 'accepted')
  );
$$ LANGUAGE sql STABLE;


-- =====================================================================
-- Phase 4.4 — per-user preferences.
-- A JSONB bag so adding a new preference (theme, default view, ...) never
-- needs another migration. Today the only keys are default_sort and
-- default_order.
-- =====================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;


-- =====================================================================
-- Phase 4.5 — soft delete for tasks.
--
-- Deleting a task sets `deleted_at`; every read filters it out. An undo
-- clears the column, which is what makes a 10-second undo window possible
-- without holding a copy of the row in application memory. A separate
-- retention job may later hard-delete rows whose deleted_at is older than
-- the retention window; when it does, restore stops finding them.
-- =====================================================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);


-- =====================================================================
-- Phase 4.10 - personal access tokens for the public read-only API.
--
-- Only the hash is stored; the plaintext is shown to the user once and
-- then forgotten. `token_prefix` keeps a short, non-secret fragment so a
-- user can tell two tokens apart in the UI without being shown the secret.
-- =====================================================================
CREATE TABLE IF NOT EXISTS api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label VARCHAR(255) NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  token_prefix VARCHAR(24) NOT NULL,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_api_tokens_user_id ON api_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_api_tokens_hash ON api_tokens(token_hash);


-- =====================================================================
-- Phase 4.11 - due-date reminders.
--
-- A JSONB bag of notification preferences, so adding a new kind of
-- reminder (mentions, assignments, weekly digest) never needs another
-- migration. Last-sent tracking lives on the user so we do not email
-- the same person twice in a day even if the cron runs more than once.
-- =====================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications JSONB DEFAULT '{"reminders": false, "last_sent_at": null}'::jsonb;
