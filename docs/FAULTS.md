# Enterprise documentation autopsy

Last audited against codebase: 2026-10-10. Source files: 196 files checked. Truth source: `backend/migrations/init.sql` + `backend/package.json` + `frontend/package.json` + route files. **`schema.prisma` does not exist.**

Enterprise-named / enterprise-content markdown found by `grep -i enterprise --include="*.md"`:

| File | Hits |
|---|---|
| `./ENTERPRISE_ROADMAP.md` | The entire 1207-line document |
| `./README.md` | **0** (root README is not an "enterprise" doc; it still contains stale/false claims — appendix) |

There is no `ENTERPRISE_README.md`. The fake spec is `ENTERPRISE_ROADMAP.md`.

**Verdict:** Treat this file as a **spec sheet that was never implemented as written**. Several Phase 1 *ideas* exist in a different shape. Almost every SQL snippet, path, env var, and ✅ competitive claim is false relative to this repo.

Severity legend:

- **CRITICAL LIE** — states Tudu has / uses something that is not in schema, routes, or package.json
- **FALSE SCHEMA** — SQL in the doc does not match `init.sql`
- **FALSE API** — endpoint does not exist as a file/mount
- **STALE CURRENT-STATE** — "Current:" line is already wrong about *this* codebase
- **UNBUILT SPEC** — labelled as a plan but written as drop-in code; still not in the repo
- **PARTIAL** — related code exists; the document's version is still wrong

---

## ENTERPRISE_ROADMAP.md

### False current-state and competitive ✅ claims

**[FAULT #1]** Location: `./ENTERPRISE_ROADMAP.md:27-29`  
Claims: Phase 1.1 Status **"Current - Fixed columns (To-do/Doing/Done)"**; Target customizable columns.  
Truth: Custom columns **are implemented**. Tables `boards` + `board_columns` exist in `init.sql`. Routes in `backend/src/routes/boards.ts`. UI: `ColumnManager.tsx`, `BoardSelector.tsx`.  
Severity: STALE CURRENT-STATE (the "current" line is a lie about this tree)

**[FAULT #2]** Location: `./ENTERPRISE_ROADMAP.md:32-54`  
Claims: New tables `boards` (`board_id SERIAL`), `columns` (`column_id SERIAL`), `ALTER TABLE todo`, `DROP COLUMN status`.  
Truth: Real schema is UUID `boards.id`, table name **`board_columns` not `columns`**, table **`tasks` not `todo`**. `tasks.status` was **explicitly kept** (`init.sql` comments even name this roadmap as the thing that would break analytics if followed).  
Severity: FALSE SCHEMA / CRITICAL LIE if treated as the real DB

**[FAULT #3]** Location: `./ENTERPRISE_ROADMAP.md:56-62`  
Claims: APIs `POST /boards`, `GET /boards`, `POST /boards/:id/columns`, `PUT /columns/:id`, `DELETE /columns/:id`, `PUT /columns/reorder`.  
Truth: Real mounts are **`/api/boards`** and **`/api/columns`**. Unprefixed `/boards` is not registered in `app.ts`.  
Severity: FALSE API (prefix + implied public surface)

**[FAULT #4]** Location: `./ENTERPRISE_ROADMAP.md:74-76`  
Claims: Phase 1.2 Status **"Current - Share via email only"**; Target full workspace RBAC.  
Truth: Share-by-email **still exists** (`shared_lists`). Workspace tables + `/api/workspaces` **also exist**. Board-level invite `POST /boards/:id/invite` **MISSING**. `board_members` has **no INSERT**. `MembersPanel.tsx` is a stub ("backend not wired").  
Severity: STALE CURRENT-STATE + PARTIAL

**[FAULT #5]** Location: `./ENTERPRISE_ROADMAP.md:79-104`  
Claims: `workspaces.workspace_id SERIAL`, `users(user_id)`, `todo.assignee_id INTEGER`, `joined_at` on workspace_members.  
Truth: UUID `id` / `owner_id`. Users PK is `users.id`. Assignee is `tasks.assignee_id UUID`. `workspace_members` has `created_at`, not `joined_at`.  
Severity: FALSE SCHEMA

**[FAULT #6]** Location: `./ENTERPRISE_ROADMAP.md:116-123`  
Claims: `POST /workspaces`, `GET /workspaces`, `POST /workspaces/:id/invite`, `POST /workspaces/:id/members/:id/role`, `DELETE /workspaces/:id/members/:id`, `POST /boards/:id/invite`, `PUT /todos/:id/assign`.  
Truth: Workspaces live under **`/api/workspaces`**. Role update is **`PATCH` not POST**. Assign is **`PUT /api/tasks/:id/assign`**, not `/todos`. `POST /boards/:id/invite` **does not exist** (grep invite in board routes = 0).  
Severity: FALSE API

**[FAULT #7]** Location: `./ENTERPRISE_ROADMAP.md:125-130`  
Claims: Frontend has member management panel, assignee dropdown, role badge, **board invite link generator**.  
Truth: `MembersPanel.tsx` renders placeholder copy. `MemberBadge.tsx` exists. No invite-link generator file. Assignee API exists; no dedicated assignee dropdown component filename found as specified.  
Severity: CRITICAL LIE for invite-link + member management UI

**[FAULT #8]** Location: `./ENTERPRISE_ROADMAP.md:136-201`  
Claims: Power filters `@me`, `@john`, `due:overdue`, `column:doing`; query builder on table `todo`; `GET /todos?filters=...&sort=...`; `GET /columns/:id/stats`.  
Truth: `getAllTasks` only accepts `status|category|priority|search`. Grep `@me` / `due:overdue` in ts/tsx = no filter parser. `GET /columns/:id/stats` MISSING. Table `todo` MISSING.  
Severity: UNBUILT SPEC / FALSE API / CRITICAL LIE if marked shipped

**[FAULT #9]** Location: `./ENTERPRISE_ROADMAP.md:1081-1087` **MVP Launch checklist**  
Claims: ✅ Custom columns, ✅ Team permissions, ✅ Power filters, ✅ PWA, ✅ Onboarding tour, ✅ GitHub SEO.  
Truth:

- Custom columns: **yes, different schema** (PARTIAL — checklist oversells completeness)
- Team permissions: **API partial; board_members unused; UI stub**
- Power filters: **NO**
- PWA: **NO** (`vite-plugin-pwa` not in package.json; no service worker; no pwa-192/512 png)
- Onboarding tour: **YES** (custom components; not `react-joyride`)
- GitHub SEO: root README is a long internal setup doc, **not** the badge/demo-GIF/comparison README the roadmap sketches. No `demo.gif` in inventory.

Severity: CRITICAL LIE (treats unbuilt items as done)

**[FAULT #10]** Location: `./ENTERPRISE_ROADMAP.md:1096-1111` competitive table  
Claims Tudu has ✅: Mobile PWA offline, Custom Columns, Team Permissions, GitHub Integration, WIP Limits, Keyboard Shortcuts, Mobile Safari. SAML/Audit "Planned".  
Truth:

- PWA offline: **NO**
- GitHub Integration (PR webhooks / `github_mappings`): **NO**. Only GitHub **OAuth login**.
- Keyboard shortcuts table (C, Space, Cmd+K, etc.): **NO** command palette. Tour `?` button is not this matrix.
- WIP limits: **field + badge exist**; "prevent moving if at limit" not verified as a hard server reject in the batch mover — display-only `over_wip_limit` flag.
- GitHub Integration ✅ vs OAuth-only is a **CRITICAL LIE**

Severity: CRITICAL LIE

---

### Phase 2 — integrations (0% in repo)

**[FAULT #11]** Location: `./ENTERPRISE_ROADMAP.md:217-237`  
Claims: tables `integrations`, `github_mappings`.  
Truth: neither table in `init.sql`. Grep `github_mappings` in sql/ts = 0.  
Severity: FALSE SCHEMA

**[FAULT #12]** Location: `./ENTERPRISE_ROADMAP.md:241-256`  
Claims: `POST /webhooks/github` with PR open/merge card moves.  
Truth: no `webhooks` route file. `app.ts` has no `/webhooks`.  
Severity: FALSE API

**[FAULT #13]** Location: `./ENTERPRISE_ROADMAP.md:270-291`  
Claims: `POST /slack/command`, Slack webhook notifications, axios to Slack.  
Truth: no slack route. `axios` is a **frontend** dependency, not backend. No Slack OAuth.  
Severity: FALSE API

**[FAULT #14]** Location: `./ENTERPRISE_ROADMAP.md:304-337`  
Claims: Zod `CreateTaskSchema`, `POST /api/v1/tasks`, OpenAPI at `/api/docs`, API keys, webhook subscriptions, 100 req/min per user.  
Truth: `zod` is in backend package.json and **never imported**. No `/api/v1`. No swagger. No API-key table. Rate limit in `app.ts` is IP-based failed-request limiter, not 100/min per user on v1.  
Severity: CRITICAL LIE / FALSE API

---

### Phase 3 — resilience (mostly unbuilt)

**[FAULT #15]** Location: `./ENTERPRISE_ROADMAP.md:346-376`  
Claims: Service Worker `sync` event, IndexedDB `offlineQueue`.  
Truth: no service worker file. Grep IndexedDB / `offlineQueue` in src = 0. `SyncIndicator` is Socket.io connection state, not an offline queue.  
Severity: UNBUILT SPEC

**[FAULT #16]** Location: `./ENTERPRISE_ROADMAP.md:382-417`  
Claims: 10s undo after delete, Ctrl+Z, undo history panel.  
Truth: no `undoStack`. Delete is hard delete via API.  
Severity: UNBUILT SPEC

**[FAULT #17]** Location: `./ENTERPRISE_ROADMAP.md:421-442`  
Claims: `PUT /todos/bulk` updating `todo` by `todo_id`.  
Truth: Real bulk is `PATCH /api/tasks/batch` (status/column move). Multi-select drag exists on Kanban. No archive. No `/todos/bulk`.  
Severity: FALSE API + FALSE SCHEMA; PARTIAL for multi-move only

---

### Phase 4 — PWA / push (0%)

**[FAULT #18]** Location: `./ENTERPRISE_ROADMAP.md:449-508`  
Claims: `VitePWA` in vite.config, `favicon.svg`, `wordmark.svg`, `pwa-192x192.png`, `pwa-512x512.png`, cache `https://api.tudu.app`.  
Truth: `frontend/vite.config.ts` has `@vitejs/plugin-react` only. Assets are **png** wordmarks, not svg. No pwa icons in `frontend/public/`. No `api.tudu.app` in code.  
Severity: CRITICAL LIE if read as current; UNBUILT SPEC as plan

**[FAULT #19]** Location: `./ENTERPRISE_ROADMAP.md:514-548`  
Claims: `import cron from 'node-cron'`; daily 9am push; `todo_id`; service worker `push`.  
Truth: `node-cron` unused. No web-push. Task PK is `id` not `todo_id`.  
Severity: FALSE API / unused dependency dressed as a feature

Env vars claimed: none extra besides implied push keys — **MISSING**.

---

### Phase 5 — "Enterprise Features" (0%)

**[FAULT #20]** Location: `./ENTERPRISE_ROADMAP.md:557-575`  
Claims: `import { saml } from 'node-saml'`; `SAML_ENTRY_POINT`, `SAML_ISSUER`, `SAML_CERT`; `POST /auth/saml`.  
Truth: `node-saml` not in package.json. Env vars not in `.env.example`. Route MISSING. Grep `saml` in ts = 0.  
Severity: CRITICAL LIE / FALSE API

**[FAULT #21]** Location: `./ENTERPRISE_ROADMAP.md:587-607`  
Claims: table `audit_log` with `log_id SERIAL`, `old_values`/`new_values`, `GET /audit-log`, `GET /audit-log/export?format=csv`.  
Truth: Existing table is **`activity_log`** (UUID, task-scoped `action` + `details` JSONB). No `audit_log`. No `/audit-log` routes. Analytics CSV export is **personal metrics**, not compliance audit. Grep `audit_log` in sql = 0.  
Severity: CRITICAL LIE / FALSE SCHEMA / FALSE API

**[FAULT #22]** Location: `./ENTERPRISE_ROADMAP.md:618-644`  
Claims: `board_templates` table; template gallery; public templates.  
Truth: table MISSING. No `/templates` frontend route (`App.tsx` has 6 routes, none templates).  
Severity: UNBUILT SPEC

---

### Phase 6 — analytics/time (wrong schema; product analytics exist)

**[FAULT #23]** Location: `./ENTERPRISE_ROADMAP.md:657-668`  
Claims: `CREATE MATERIALIZED VIEW task_metrics` from `todo` with `completed` / `completed_at`.  
Truth: No materialized views in `init.sql`. `tasks` has `status`, not `completed` boolean. No `completed_at` column (root README even admits this and uses `activity_log`).  
Severity: FALSE SCHEMA

**[FAULT #24]** Location: `./ENTERPRISE_ROADMAP.md:671-683`  
Claims: burndown, team member performance, PDF export, share analytics link.  
Truth: Chart.js dashboard exists for **the signed-in user**: overview / completed-tasks / time-spent. No PDF. No shareable analytics link. No burndown.  
Severity: PARTIAL (personal charts exist) / CRITICAL LIE for team/PDF/burndown

**[FAULT #25]** Location: `./ENTERPRISE_ROADMAP.md:689-716`  
Claims: `time_entries` table, billable hours, `todos(todo_id)`.  
Truth: Only `pomodoro_sessions`. No `time_entries`.  
Severity: FALSE SCHEMA

---

### Phase 7 — UX (mixed)

**[FAULT #26]** Location: `./ENTERPRISE_ROADMAP.md:725-733`  
Claims: Use `react-joyride` or custom; 18-step tour including assign, WIP, advanced filters, shortcuts, export, notifications.  
Truth: Custom tour **exists** (`onboardingSteps.ts`, `ProductTour.tsx`). `react-joyride` **not installed**. Tour does not implement unbuilt features (PWA notifications, power filters, shortcuts overlay).  
Severity: PARTIAL (tour exists) / false library claim

**[FAULT #27]** Location: `./ENTERPRISE_ROADMAP.md:759-782`  
Claims: full keyboard shortcut matrix + command palette.  
Truth: No command palette component. Grep `keydown` shortcuts for `KeyC`/palette not found as this spec. `?` replays tour.  
Severity: UNBUILT SPEC

**[FAULT #28]** Location: `./ENTERPRISE_ROADMAP.md:787-809`  
Claims: `import confetti from 'canvas-confetti'`.  
Truth: Custom `Confetti.tsx` / `ConfettiProvider.tsx`. `canvas-confetti` **not** in package.json.  
Severity: FALSE stack claim; celebration **does** exist

---

### Phase 8–10 — growth pages and ops (not in repo)

**[FAULT #29]** Location: `./ENTERPRISE_ROADMAP.md:828-858`  
Claims: badges, live demo `tudu.app`, `demo.gif`, comparison table in README.  
Truth: Root README is an 855-line internal manual. No `demo.gif` in file inventory. `index.html` title is "Tudu - Your Friendly Todo App", not "Trello Alternative".  
Severity: UNBUILT SPEC / README still not that document

**[FAULT #30]** Location: `./ENTERPRISE_ROADMAP.md:864-917`  
Claims: `/sitemap.xml`, `/og/:boardId`, `/templates/student-kanban`, `/pricing`.  
Truth: Express has `/health` and `/api/*`. Vite SPA routes listed in App.tsx only. No sitemap generator. `sitemap` package not in package.json.  
Severity: FALSE API

**[FAULT #31]** Location: `./ENTERPRISE_ROADMAP.md:1021-1028`  
Claims: referral program, branded share footer, watermark.  
Truth: Sharing is email invite to `shared_lists`. No referral table. No watermark.  
Severity: UNBUILT SPEC

**[FAULT #32]** Location: `./ENTERPRISE_ROADMAP.md:1037-1041`  
Claims: `/changelog` page, `@tudu_app` tweets.  
Truth: No changelog route. No Twitter integration.  
Severity: UNBUILT SPEC

**[FAULT #33]** Location: `./ENTERPRISE_ROADMAP.md:1170-1180`  
Claims: Sentry, UptimeRobot, PostHog/Plausible, daily DB backups, multi-region replication.  
Truth: Only `@vercel/analytics` on the frontend. Grep sentry/posthog/plausible = 0. Backup strategy is not in repo.  
Severity: CRITICAL LIE if read as current ops

**[FAULT #34]** Location: `./ENTERPRISE_ROADMAP.md:1158`  
Claims: "Revenue from team features ($5/user/month)".  
Truth: No Stripe, no plan column on `users`, no billing files.  
Severity: UNBUILT SPEC dressed as a 12-month outcome of *this* codebase

**[FAULT #35]** Location: `./ENTERPRISE_ROADMAP.md:1184-1206`  
Claims: "you have enough to compete now"; "Estimated Time to Full Enterprise: 18 weeks"; "Start with Phase 1.1".  
Truth: Phase 1.1-ish already landed in SQL/UI. Remaining "enterprise" (SSO, audit, SCIM, on-prem, billing) is **0%**. Presenting the SQL samples as implementation copy-paste would **break this database**.  
Severity: CRITICAL LIE as an implementation guide

---

## Env vars claimed vs used

| Claimed | In `.env.example`? | Used in `*.ts`? |
|---|---|---|
| `SAML_ENTRY_POINT` / `SAML_ISSUER` / `SAML_CERT` | NO | NO |
| `DATABASE_URL` … `NODE_ENV` (backend example) | YES | YES |
| Stripe / SCIM / Slack tokens | NO | NO |

---

## Stack claimed vs `package.json`

| Claim | Truth |
|---|---|
| node-saml | NOT a dependency |
| vite-plugin-pwa | NOT a dependency |
| canvas-confetti | NOT a dependency |
| react-joyride | NOT a dependency |
| sitemap | NOT a dependency |
| zod as validation layer | dependency **dead** |
| node-cron for overdue/push | dependency **dead** |
| Prisma / Mongo / AuditLog collection | **does not exist** (user's example lie). Real DB is Postgres + `pg`. |

---

## Appendix — root `README.md` is not enterprise, but it is also wrong

These are not "enterprise" claims; they will poison a rewrite if copied.

**[FAULT #R1]** `README.md:89-97` — "ORM: pg"; "Cron Jobs: node-cron for overdue tasks"; "Validation: Zod".  
Truth: `pg` is a driver, not an ORM. Cron unused. Zod unused.

**[FAULT #R2]** `README.md:114-124` — `backend/src/models/`, `backend/README.md`.  
Truth: both MISSING.

**[FAULT #R3]** `README.md:133` — `collaboration/` components.  
Truth: folder is `sharing/` (+ stub `shared/`).

**[FAULT #R4]** `README.md:284-341` Database Schema — **omits** `boards`, `board_columns`, `workspaces`, `workspace_members`, `board_members`, `tasks.board_id/column_id/assignee_id`, `shared_lists.status`.  
Severity: STALE / incomplete (the opposite of the roadmap: README under-claims what SQL actually has)

**[FAULT #R5]** `README.md:348-349` — `POST /auth/google` and `POST /auth/github`.  
Truth: **GET** (Passport).

**[FAULT #R6]** `README.md:366-367` — `PUT /api/subtasks/:id`, `DELETE /api/subtasks/:id`.  
Truth: nested under `/api/tasks/:taskId/subtasks/:subtaskId` with **PATCH**.

**[FAULT #R7]** README API section never lists `/api/boards`, `/api/columns`, `/api/workspaces`, `PATCH /api/tasks/batch`, `PUT /api/tasks/:id/assign`, `POST /api/share/decline`.  
Those routes **do** exist.

---

## Scoreboard (enterprise doc only)

| Class | Count (approx) |
|---|---|
| Tables/collections claimed in snippets that are not in `init.sql` | `todo`, `columns`, `integrations`, `github_mappings`, `audit_log`, `board_templates`, `time_entries`, `task_metrics` view |
| API prefixes that are not mounted | `/todos`, `/boards` (no /api), `/audit-log`, `/api/v1`, `/webhooks`, `/slack`, `/auth/saml`, `/api/docs` |
| package.json libraries the doc pretends are in use | node-saml, VitePWA, canvas-confetti, react-joyride, live zod/cron |
| Truly implemented overlap | custom columns, some workspace API, WIP field, personal analytics, onboarding, confetti, OAuth GitHub **login** |
| Classic enterprise (SSO, SCIM, audit export, on-prem, billing) | **0 files** |

Do not generate Phase 2–3 rewrites until this truth file is accepted.
