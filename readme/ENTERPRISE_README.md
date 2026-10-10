Last audited against codebase: 2026-10-10. Source files: 196 files checked. Truth source: schema.prisma (MISSING — real schema is `backend/migrations/init.sql`) + `backend/package.json` + `frontend/package.json`.

# Tudu Enterprise — truthful spec

**Previous enterprise write-up (`ENTERPRISE_ROADMAP.md`) was incorrect.** It mixed invented SERIAL/`todo` SQL, unprefixed `/todos` APIs, and a competitive table that marked PWA, GitHub integrations, and keyboard palettes as shipped.

This document is a spec based on the **actual codebase as of 2026-10-10**.

**Enterprise features implemented: 0%.**

What *does* exist is a personal/small-team PERN Kanban. Custom columns, a workspace API, and `activity_log` are **not** SSO, SCIM, or compliance audit. Do not quote `ENTERPRISE_ROADMAP.md` as the schema.

---

## What Enterprise SHOULD be (PLANNED, NOT BUILT)

| Capability | Status | Notes |
|---|---|---|
| SAML / OIDC SSO | NOT BUILT | Auth today: Passport Google/GitHub + email JWT. `node-saml` not in package.json. No `SAML_*` env. |
| SCIM 2.0 provisioning | NOT BUILT | No SCIM routes. |
| Compliance audit log + export | NOT BUILT | `activity_log` is per-user task actions, not `old_values`/`new_values`/board-scoped audit. No `/audit-log`. |
| RBAC beyond admin/member/viewer | PARTIAL product RBAC, not EE | `workspace_members.role` CHECK (`admin`,`member`,`viewer`). `board_members` table **unread for writes**. `MembersPanel` stub. |
| Guest / domain capture | NOT BUILT | |
| On-prem / air-gap package | NOT BUILT | No Docker. No `/ee`. |
| Customer-managed keys | NOT BUILT | |
| SLA / dedicated support | process | Not code |
| IdP-initiated login, ACS URL | NOT BUILT | |

```mermaid
flowchart TB
  subgraph built [Built today]
    oauth[Google GitHub email]
    boards[UUID boards + board_columns]
    ws[workspaces API]
    act[activity_log]
  end
  subgraph planned [PLANNED NOT BUILT]
    saml[SAML SSO]
    scim[SCIM]
    audit[audit_events]
    ee[/ee private tree]
  end
  built -.-> planned
```

---

## CORRECT current schema (from `init.sql`, not Prisma)

Prisma: **MISSING**. Copy-paste of what is actually migrated:

```sql
-- CURRENT (shipped)
users (id UUID, email, name, password, provider, provider_id, avatar_url, created_at, updated_at)
tasks (id UUID, user_id, title, description, category, priority, due_date, status, created_at, updated_at,
       board_id, column_id, assignee_id)
subtasks (id UUID, task_id, title, completed, timestamps)
activity_log (id UUID, user_id, task_id, action, details JSONB, created_at)
shared_lists (id UUID, owner_id, shared_with_user_id, task_ids UUID[], permissions, status, created_at)
pomodoro_sessions (id UUID, user_id, task_id, duration, completed_at, created_at)
boards (id UUID, user_id, name, position, workspace_id, timestamps)
board_columns (id UUID, board_id, name, position, color, stage, wip_limit, timestamps)
workspaces (id UUID, owner_id, name, timestamps)
workspace_members (workspace_id, user_id, role admin|member|viewer, created_at)
board_members (board_id, user_id, role, created_at)  -- no writer in controllers
```

IDs are UUID. Task table is `tasks`. Status was **not** dropped. There is no table `todo`, `audit_log`, `integrations`, `board_templates`, `time_entries`.

---

## PROPOSED enterprise schema (NOT MIGRATED)

Label every statement `// PROPOSED`. Do not run this as if it were `init.sql`.

```sql
-- // PROPOSED — not in this repo

ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(20) NOT NULL DEFAULT 'free';
-- plan: free | pro | enterprise

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  owner_id UUID REFERENCES users(id),
  sso_domain VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_members (
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member',
  PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS sso_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- 'saml' | 'oidc'
  entry_point TEXT,
  issuer TEXT,
  cert TEXT,
  client_id TEXT,
  client_secret TEXT
);

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  board_id UUID REFERENCES boards(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip INET,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scim_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

Proposed routes (NONE of these files exist):

- `POST /auth/saml` / `GET /auth/saml/callback`
- `GET /api/audit-events?from=&to=&board_id=`
- `GET /api/audit-events/export?format=csv`
- ` /scim/v2/Users` CRUD

---

## Folder structure that DOES NOT EXIST YET

Keep AGPL (or current ISC — **no root LICENSE file today**) on the public tree. Put enterprise in a **private** `/ee` that is not published to the public GitHub clone.

```
/ee/                          # MISSING
  /sso/                       # SAML/OIDC strategies
  /scim/
  /audit/
  /licensing/                 # license file verify for on-prem
  /admin/                     # org admin APIs
```

Do not invent these as if they were listed in `.audit/all_files.txt`. They are not.

On-prem: Docker image **MISSING**. Need `docker-compose.yml` + `backend/migrations/init.sql` before any enterprise customer can self-host.

---

## What not to claim

Anything absent from `.audit/TRUTH.md` is not built: Stripe, Prisma, Mongo AuditLog collections, `/api/v1`, node-cron jobs, PWA, `ENTERPRISE_ROADMAP.md` SERIAL schemas.

SAML/Audit in the old competitive table were marked “Planned” — that part was honest. The ✅ on GitHub Integration, Mobile PWA, Keyboard Shortcuts for Tudu were not.
