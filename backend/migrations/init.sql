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


-- =====================================================================
-- Phase 4.12 - celebrations.
--
-- Adds the celebrations flag to the notifications JSONB bag. Defaults
-- to true: a fresh user should see the little green celebration on their
-- first finished task. || keeps any existing keys untouched, so this is
-- safe on a database that already has reminders.
-- =====================================================================
UPDATE users SET notifications = '{"reminders": false, "celebrations": true}'::jsonb || COALESCE(notifications, '{}'::jsonb) WHERE notifications IS NULL OR NOT (notifications ? 'celebrations');


-- =====================================================================
-- Phase 5.1 - Paystack subscriptions and billing.
--
-- Plans live in Paystack; these tables mirror the local view of a
-- subscription so entitlement checks never depend on a live HTTP call.
-- payments.reference is UNIQUE so a retried webhook cannot double-count.
-- All amounts are stored in NGN kobo; the display currency is a
-- frontend concern and never touches these tables.
-- =====================================================================
CREATE TABLE IF NOT EXISTS plans (
  code VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  interval VARCHAR(20) NOT NULL CHECK (interval IN ('monthly', 'yearly')),
  amount_kobo BIGINT NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
  ai_credits INTEGER NOT NULL DEFAULT 100,
  paystack_plan_code VARCHAR(64),
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_code VARCHAR(64) NOT NULL REFERENCES plans(code),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'past_due', 'cancelled')),
  paystack_subscription_code VARCHAR(64),
  paystack_customer_code VARCHAR(64),
  paystack_email_token VARCHAR(64),
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Only one active subscription per user.
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_one_active
  ON subscriptions(user_id)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reference VARCHAR(128) NOT NULL UNIQUE,
  amount_kobo BIGINT NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
  status VARCHAR(20) NOT NULL,
  channel VARCHAR(40),
  purpose VARCHAR(40) NOT NULL DEFAULT 'subscription',
  raw JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);

CREATE TABLE IF NOT EXISTS ai_credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason VARCHAR(60) NOT NULL,
  ref_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_credit_ledger_user ON ai_credit_ledger(user_id);

INSERT INTO plans (code, name, interval, amount_kobo, ai_credits)
VALUES
  ('pro_monthly', 'Tudu Pro', 'monthly', 750000, 100),
  ('pro_yearly',  'Tudu Pro', 'yearly',  7500000, 1200)
ON CONFLICT (code) DO NOTHING;


-- =====================================================================
-- Phase 5.4 - self-hosting licenses.
--
-- One row per license ever issued. A customer may re-issue after a
-- hardware change; the old row stays for audit. Only the current row
-- for a given customer is treated as active.
--
-- fingerprint is the SHA-256 hex of the machine identifiers, so no raw
-- hardware details leave the customer server. The signed blob is stored
-- verbatim so support can re-send a lost license without re-signing.
-- =====================================================================
CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fingerprint VARCHAR(128) NOT NULL,
  tier VARCHAR(20) NOT NULL DEFAULT 'pro'
    CHECK (tier IN ('pro', 'enterprise')),
  signed_blob TEXT NOT NULL,
  issued_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  revoked_at TIMESTAMP,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_licenses_user_id ON licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_licenses_fingerprint ON licenses(fingerprint);


-- =====================================================================
-- Phase 5.5 - browser push notifications.
--
-- One row per browser subscription. A user with three devices has three
-- rows; sending iterates all of them. The endpoint is the identifying
-- key: a browser rotating its subscription produces a new endpoint, and
-- the old row is pruned the first time it 404s or 410s.
-- =====================================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP DEFAULT NOW(),
  failed_count INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

-- The notifications JSONB gains a push flag. Merge rather than replace
-- so reminders, celebrations and last_sent_at survive.
UPDATE users SET notifications = '{"push": false}'::jsonb || COALESCE(notifications, '{}'::jsonb) WHERE notifications IS NULL OR NOT (notifications ? 'push');


-- =====================================================================
-- Phase 5.6 - template marketplace.
--
-- Users publish boards as templates. The definition column snapshots
-- the columns and example cards, so the template stays intact even if
-- the source board is later edited or deleted.
-- =====================================================================
CREATE TABLE IF NOT EXISTS marketplace_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL DEFAULT 'General',
  definition JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'approved'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  install_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_marketplace_templates_author ON marketplace_templates(author_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_templates_status ON marketplace_templates(status);

CREATE TABLE IF NOT EXISTS template_installs (
  template_id UUID NOT NULL REFERENCES marketplace_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  installed_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (template_id, user_id)
);


-- =====================================================================
-- Phase 5.6b - paid templates with Paystack subaccount payouts.
--
-- A publisher_profile holds the bank details Paystack needs to pay a
-- user for their sold templates. The subaccount_code is created once,
-- on first save; later saves replace it (and Paystack keeps the old one
-- around as an inactive record).
--
-- template_purchases tracks each attempted buy of a paid template.
-- The (template_id, buyer_id) unique key prevents accidental double
-- purchases. Refunded rows are kept for audit - the status flips to
-- "refunded" and refunded_at is set.
-- =====================================================================
CREATE TABLE IF NOT EXISTS publisher_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  business_name VARCHAR(255) NOT NULL,
  bank_code VARCHAR(20) NOT NULL,
  bank_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(20) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  subaccount_code VARCHAR(64) NOT NULL,
  payout_status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS template_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES marketplace_templates(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reference VARCHAR(128) NOT NULL UNIQUE,
  amount_kobo BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  refunded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (template_id, buyer_id)
);
CREATE INDEX IF NOT EXISTS idx_template_purchases_buyer ON template_purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_template_purchases_template ON template_purchases(template_id);

ALTER TABLE marketplace_templates ADD COLUMN IF NOT EXISTS price_kobo BIGINT NOT NULL DEFAULT 0;


-- =====================================================================
-- Phase 5.6c - Refund fixes, board cleanup, and rentals.
-- =====================================================================
ALTER TABLE marketplace_templates ADD COLUMN IF NOT EXISTS rental_days INTEGER NOT NULL DEFAULT 0;
ALTER TABLE template_purchases ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES boards(id) ON DELETE SET NULL;
ALTER TABLE template_purchases ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;


-- =====================================================================
-- Phase 5.6d - Marketplace sync, versioning, and rentals.
-- =====================================================================
ALTER TABLE marketplace_templates ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE template_purchases ADD COLUMN IF NOT EXISTS version_bought INTEGER NOT NULL DEFAULT 1;
ALTER TABLE template_purchases ADD COLUMN IF NOT EXISTS price_paid_kobo BIGINT NOT NULL DEFAULT 0;
ALTER TABLE template_purchases ADD COLUMN IF NOT EXISTS rental_days_paid INTEGER NOT NULL DEFAULT 0;


-- =====================================================================
-- Phase 5.7 - GitHub Integration.
-- =====================================================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS short_id SERIAL UNIQUE;

CREATE TABLE IF NOT EXISTS github_integrations (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS github_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  repo_full_name VARCHAR(255) NOT NULL,
  pr_opened_column_id UUID NOT NULL REFERENCES board_columns(id) ON DELETE CASCADE,
  pr_merged_column_id UUID NOT NULL REFERENCES board_columns(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_github_mappings_repo ON github_mappings(repo_full_name);


-- =====================================================================
-- Phase 5.7 fix - github_mappings ownership and unique key.
--
-- The original 5.7 migration created github_mappings without a user_id
-- column and without a unique constraint. Every save went through
-- ON CONFLICT (repo_full_name), which had no constraint to attach to,
-- so Postgres returned "there is no unique or exclusion constraint
-- matching the ON CONFLICT specification" and the request 500'd.
--
-- This migration:
--   * adds user_id (backfilled from the board owner),
--   * adds a unique per-user key on (user_id, repo_full_name),
--   * adds github_login to github_integrations so the UI can say
--     "Connected as @octocat" without an extra API call.
-- =====================================================================
ALTER TABLE github_integrations ADD COLUMN IF NOT EXISTS github_login VARCHAR(255);

ALTER TABLE github_mappings ADD COLUMN IF NOT EXISTS user_id UUID;
UPDATE github_mappings m
   SET user_id = b.user_id
  FROM boards b
 WHERE m.board_id = b.id AND m.user_id IS NULL;
DELETE FROM github_mappings WHERE user_id IS NULL;
ALTER TABLE github_mappings ALTER COLUMN user_id SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE github_mappings ADD CONSTRAINT github_mappings_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP INDEX IF EXISTS idx_github_mappings_repo;
CREATE UNIQUE INDEX IF NOT EXISTS idx_github_mappings_user_repo
  ON github_mappings(user_id, repo_full_name);


-- =====================================================================
-- Phase 5.8 - Slack integration.
--
-- One row per Tudu user who has installed the Slack app. team_id is
-- UNIQUE because the slash command arrives with only a team_id and must
-- resolve to exactly one Tudu account; installing from a second account
-- transfers ownership of the team instead of creating an ambiguous row.
--
-- The bot token is stored as-is (TEXT), same posture as the GitHub
-- integration: a database leak already exposes everything else, and
-- encrypting at rest needs a key-management story that has not been
-- built yet. Noted as a known trade-off, not an oversight.
-- =====================================================================
CREATE TABLE IF NOT EXISTS slack_integrations (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  team_id VARCHAR(64) NOT NULL,
  team_name VARCHAR(255) NOT NULL,
  bot_user_id VARCHAR(64),
  access_token TEXT NOT NULL,
  channel_id VARCHAR(64),
  channel_name VARCHAR(255),
  default_board_id UUID REFERENCES boards(id) ON DELETE SET NULL,
  notify_assignments BOOLEAN NOT NULL DEFAULT TRUE,
  notify_due BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_slack_integrations_team
  ON slack_integrations(team_id);


-- =====================================================================
-- Phase 5.9 - public write API and outbound webhooks.
--
-- webhook_deliveries is the transactional outbox: every task mutation
-- writes a row here in the same transaction as the mutation itself,
-- so a process crash between the DB write and the HTTP send cannot
-- lose the event. A background worker drains the table.
--
-- status:
--   pending   - queued, waiting for next_attempt_at
--   success   - 2xx response received
--   failed    - attempted, not yet exhausted (still retried)
--   dead      - 6 attempts done, needs manual retry from the UI
-- =====================================================================
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  description VARCHAR(255),
  secret VARCHAR(64) NOT NULL,
  events TEXT[] NOT NULL DEFAULT ARRAY['task.created', 'task.updated', 'task.moved', 'task.deleted']::text[],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_user ON webhook_endpoints(user_id);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event_type VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed', 'dead')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_attempt_at TIMESTAMP,
  last_response_status INTEGER,
  last_response_body TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_pending
  ON webhook_deliveries(status, next_attempt_at)
  WHERE status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint
  ON webhook_deliveries(endpoint_id, created_at DESC);


-- =====================================================================
-- Phase 5.12 - time tracking.
--
-- One row per worked interval. A running timer has ended_at = NULL.
-- A partial unique index enforces one running timer per user at the
-- DB level, so a race between two tabs cannot create two.
--
-- task_id is ON DELETE SET NULL: deleting a task must not destroy time
-- that was already worked against it. The row survives, but the title
-- becomes null in the UI.
-- =====================================================================
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  description TEXT,
  billable BOOLEAN NOT NULL DEFAULT FALSE,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP,
  duration_seconds INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_started ON time_entries(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_task ON time_entries(task_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_time_entries_one_active ON time_entries(user_id) WHERE ended_at IS NULL;
