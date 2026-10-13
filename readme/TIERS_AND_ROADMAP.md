# Tudu — Tiers, Pricing & Feature Roadmap

**Status:** Draft for review before public launch
**Author:** Tudu Engineering
**Last updated:** 2026-10-13
**Supersedes:** `FREE_TIER_README.md`, `PRO_TIER_README.md`, `ENTERPRISE_README.md`, `PAYMENTS_README.md`, `MONETIZATION_RUNBOOK.md`, `ENTERPRISE_ROADMAP.md` (all kept in the repo as historical context; this file wins)

---

## 0. Purpose

This is the single source of truth for **what ships in which tier, in what order, and how it gets built**.

**North star:** before Tudu is announced publicly, the **Free** and **Pro** tiers must be live and taking money through **Paystack**. Enterprise is a follow-on.

Every feature is numbered so it can be referred to unambiguously in branches, issues, and PRs.

---

## 1. How to read a feature entry

Each feature is written in this shape:

```
### N.N — Feature name
Priority within tier · Effort · Branch
Backend: files created / edited · endpoints · migrations
Frontend: components / hooks / stores
Tests: backend · frontend · e2e
Env: new variables (backend / frontend)
External: services to sign up for, dashboards to visit
Docs: what to update when the feature lands
```

Effort: **XS** (½ day) · **S** (1–2 days) · **M** (3–5 days) · **L** (1–2 weeks) · **XL** (2+ weeks).

---

## 2. Current state (what already exists)

| Area | Status |
|---|---|
| Boards, columns, drag & drop, WIP limits | ✅ shipped |
| Workspaces, roles (admin / member / viewer), invitations | ✅ shipped |
| Task CRUD, subtasks, activity feed, analytics, Pomodoro | ✅ shipped |
| AI task breakdown (Gemini / Groq / Ollama) | ✅ shipped, no metering |
| Real-time sync over Socket.IO | ✅ shipped |
| Sharing (`shared_lists`, personal tasks) | ✅ shipped |
| Auth: email + Google + GitHub | ✅ shipped |
| Confetti & celebrations | ✅ shipped |
| Payments, tier gating, self-host licensing, marketplace | ❌ not started |
| Landing page, public demo | ❌ not started |
| Power filters, offline mode, PWA, push | ❌ not started |
| Integrations (GitHub, Slack, public write API) | ❌ not started |
| Advanced analytics, time tracking | ❌ not started |

---

## 3. Tier overview

| Tier | Price (NGN) | Price (USD eq.) | Who it is for |
|---|---|---|---|
| **Free** | ₦0 | $0 | Solo users evaluating Tudu |
| **Pro** | ₦7,500 / month · ₦75,000 / year | ~$5 / ~$50 | Individuals, freelancers, small teams |
| **Enterprise** | Custom (from ₦450,000 / year) | ~$300 / yr | Teams 20+, regulated orgs, on-prem |

Prices are indicative; confirm in the Paystack dashboard before launch.

---

## 4. FREE TIER

**Goal:** complete enough that a solo user never feels blocked, limited enough that a Pro upgrade is obvious once they work with other people or hit volume.

### 4.1 — Landing page and public demo
**Priority: 1 · Effort: M · Branch:** `feat/free-landing-page`

The deployed app is a client-rendered SPA, so crawlers and first-time visitors see an empty page. Nothing else in this roadmap matters if people can't find Tudu.

- **Backend:** `src/controllers/publicController.ts` (new) — `GET /api/public/stats` (health, uptime), `POST /api/public/demo` (spins up a read-only demo account).
- **Frontend:** `src/routes/Landing.tsx` (new), `src/components/landing/{Hero,Features,Pricing,Footer,FeatureComparison}.tsx` (new). Route `/` in `App.tsx`.
- **Tests:** e2e `frontend/e2e/landing.spec.ts` — hero renders, pricing cards render, "Try the demo" navigates to `/board`.
- **Env:** none new.
- **External:** [Vercel Analytics](https://vercel.com/analytics) (free).
- **Docs:** root `README.md` link.

### 4.2 — Onboarding wizard (v2)
**Priority: 2 · Effort: S · Branch:** `feat/free-onboarding-v2`

First-run wizard: pick a template ("Personal tasks", "Team sprint", "Content calendar"), auto-create the first board with the right columns, seed three example cards. Replaces the current `ProductTour`.

- **Backend:** `src/controllers/onboardingController.ts` (new) — `POST /api/onboarding/seed` with `{ template }`.
- **Frontend:** extend `src/components/onboarding/` with `TemplatePicker.tsx`, `Wizard.tsx`, `TourOverlay.tsx` (react-joyride or custom); `src/data/templates.ts`.
- **Tests:** frontend `src/test/onboardingWizard.test.tsx`.
- **Env:** none.

### 4.3 — Power filters & search
**Priority: 3 · Effort: M · Branch:** `feat/free-power-filters`

Advanced filtering is table stakes for PM work. Today the app only has a search box and three dropdowns.

**Search syntax:**

```
@me            tasks assigned to me
@john          tasks assigned to John
#work          tasks tagged work
due:overdue    overdue
due:today      due today
due:week       due this week
priority:high  high priority
is:completed   completed
is:open        not completed
column:doing   in the "Doing" column
```

- **Backend:** `src/services/taskQueryBuilder.ts` (new) — parses the query string into parameterised SQL. Extend `taskController.getAllTasks` with `?q=` and `?sort=` and `?order=`.
- **Frontend:** `src/components/tasks/QueryBar.tsx` (new), `src/components/tasks/FilterHelp.tsx` (new), `src/components/tasks/SortDropdown.tsx` (new). Saved presets in `filterStore.ts` (extend).
- **Tests:** integration `taskQueryBuilder.integration.test.ts` — every operator; frontend `src/test/queryBar.test.tsx`.
- **Env:** none.

### 4.4 — Sorting options
**Priority: 4 · Effort: XS · Branch:** `feat/free-sorting`

Sort the List view by due date, priority, created date, or alphabetical. Persist per user.

- **Backend:** part of 4.3's query builder.
- **Frontend:** `SortDropdown.tsx` (already planned in 4.3); persist choice in `filterStore.ts`.
- **Tests:** frontend unit test on the store.

### 4.5 — Undo (soft delete)
**Priority: 5 · Effort: S · Branch:** `feat/free-undo`

Ctrl+Z / Cmd+Z for 10 seconds after a delete. Toast offers "Undo".

**Implementation note:** use a **soft-delete column** (`tasks.deleted_at`), not an in-memory Map — an in-memory Map is lost on server restart and cannot be trusted across workers.

- **Backend:** `migrations/init.sql` — add `deleted_at TIMESTAMP NULL` to `tasks` and `board_columns`. All read queries filter `deleted_at IS NULL`. Add `POST /api/tasks/:id/restore`.
- **Frontend:** `src/components/common/UndoToast.tsx` (new), keyboard binding in `useKeyboardShortcuts` (see 4.7).
- **Tests:** integration — delete then restore within 10s succeeds; after 10s (a scheduled purge) fails.
- **Env:** none.

### 4.6 — Bulk actions
**Priority: 6 · Effort: S · Branch:** `feat/free-bulk-actions`

Multi-select on the List and Kanban; bulk move, delete, assign, tag.

- **Backend:** `PATCH /api/tasks/batch` already exists for status. Extend with `DELETE /api/tasks/batch` and `PATCH /api/tasks/batch/assign`.
- **Frontend:** multi-select mode on `TaskCard` and `KanbanCard`; `src/components/tasks/BulkActionBar.tsx` (new).
- **Tests:** integration — bulk delete respects WIP; frontend — select-all logic.

### 4.7 — Keyboard shortcuts
**Priority: 7 · Effort: S · Branch:** `feat/free-keyboard-shortcuts`

| Key | Action |
|---|---|
| `n` | New task |
| `/` | Focus search |
| `?` | Shortcut help |
| `Esc` | Close modal / deselect |
| `g b` | Go to Board |
| `g l` | Go to List |
| `g s` | Go to Stats |
| `1/2/3` | Focus column 1/2/3 |
| `←/→` | Previous / next column |
| `↑/↓` | Previous / next task |
| `Enter` | Edit selected task |
| `Space` | Toggle completion |
| `Ctrl/Cmd + Z` | Undo (4.5) |
| `Ctrl/Cmd + K` | Command palette |

- **Frontend:** `src/hooks/useKeyboardShortcuts.ts` (new), `src/components/common/ShortcutHelp.tsx` (new), `src/components/common/CommandPalette.tsx` (new — fuzzy search over tasks, boards, actions).
- **Tests:** frontend `src/test/shortcuts.test.tsx`, `src/test/commandPalette.test.tsx`.
- **Env:** none.

### 4.8 — PWA (offline read + install)
**Priority: 8 · Effort: S · Branch:** `feat/free-pwa`

Install to home screen; last 50 tasks cached and readable offline. This is where Tudu beats Trello on mobile Safari.

- **Frontend:** `vite-plugin-pwa` in `vite.config.ts`; manifest name `Tudu`, theme `#22c55e`, background white, standalone, icons 192 / 512. Workbox runtime caching: `NetworkFirst` for `/api/*` with 5-minute max age.
- **Assets:** `frontend/public/pwa-192.png`, `frontend/public/pwa-512.png`.
- **Tests:** e2e — install prompt shows, offline page still renders the board.
- **Env:** none.

### 4.9 — Board templates (built-in)
**Priority: 9 · Effort: S · Branch:** `feat/free-templates`

Ships with five built-in templates users can install in one click. (User-published templates live in Pro, §5.6.)

Built-ins:
- **Sprint Board** — Backlog, To Do, In Progress, Code Review, Done
- **Bug Tracker** — New, Triaged, In Progress, QA, Fixed, Deployed
- **Content Calendar** — Ideas, Research, Writing, Editing, Published
- **Student Kanban** — Assignments, In Progress, Review, Submitted
- **Freelancer Projects** — Leads, Proposal, Active, Invoicing, Paid

- **Backend:** seed via `backend/src/data/builtinTemplates.ts`; install endpoint `POST /api/templates/:slug/install`.
- **Frontend:** `src/components/onboarding/TemplateGallery.tsx` (new — reused by 4.2).
- **Tests:** integration — install creates a board with the expected columns.
- **Env:** none.

### 4.10 — Public REST API (read-only, free)
**Priority: 10 · Effort: M · Branch:** `feat/free-public-api`

Issue a personal API token; allow read access to the user's own data.

- **Backend:** `migrations/init.sql` — `api_tokens` (id UUID, user_id, hashed_token, label, last_used_at, created_at). `src/controllers/apiTokenController.ts` (new). `src/middleware/apiToken.ts` (new). OpenAPI spec served at `/api/docs` via `swagger-ui-express` + `zod-to-openapi`. Rate limit **100 req/min per token** (`express-rate-limit` keyed on token hash).
- **Endpoints (v1):** `GET /api/v1/boards`, `GET /api/v1/tasks`, `GET /api/v1/tasks/:id`.
- **Frontend:** `src/components/settings/ApiTokens.tsx` (new).
- **Tests:** integration `apiTokens.integration.test.ts` — token creation, revocation, rate limit, invalid token 401.
- **Env:** `API_TOKEN_HASH_PEPPER` (backend).

### 4.11 — Due-date reminders
**Priority: 11 · Effort: M · Branch:** `feat/free-reminders`

Daily email (or in-app ping) for tasks due today and overdue.

- **Backend:** `src/services/reminderService.ts` (new). Cron on **Render Cron Jobs**, not in-process `node-cron` — Render Cron survives restarts and does not run on every dyno.
- **Frontend:** `src/components/common/RemindersBadge.tsx` (new).
- **Env:** `RESEND_API_KEY`, `REMINDER_FROM_EMAIL`.
- **External:** [Resend](https://resend.com) free tier.

### 4.12 — Confetti & celebrations
**Priority: 12 · Effort: XS · Branch:** `feat/free-celebrations`

Already partially built (task complete). Extend to milestones: 10 tasks, 100 tasks, board cleared, week goal hit, first teammate invited.

- **Frontend:** extend `src/components/common/ConfettiProvider.tsx`.
- **Tests:** frontend snapshot on milestone triggers.

---

## 5. PRO TIER — the launch blocker

Everything in Free, **plus** the features below. Ship in the order listed.

### 5.1 — Paystack integration (the money spine)
**Priority: 1 · Effort: L · Branch:** `feat/pro-paystack-core`

Everything else in Pro depends on this. Build it first.

**Model:** Plans live in Paystack; entitlements live in Postgres. **The webhook is the source of truth; the frontend never decides entitlement.**

- **Backend:**
  - `migrations/init.sql` — new tables:
    - `plans` (code, name, interval, amount_kobo, ai_credits, features JSONB)
    - `subscriptions` (id, user_id, plan_code, status, paystack_subscription_code, paystack_customer_code, current_period_end, cancel_at_period_end)
    - `payments` (id, user_id, reference, amount_kobo, status, raw JSONB, created_at)
    - `ai_credit_ledger` (id, user_id, delta, reason, ref_id, created_at)
  - `src/controllers/billingController.ts` (new): `POST /api/billing/checkout`, `GET /api/billing/subscription`, `POST /api/billing/cancel`, `GET /api/billing/history`.
  - `src/controllers/paystackWebhookController.ts` (new): verify `x-paystack-signature` (HMAC-SHA512 over the **raw** body with `PAYSTACK_SECRET_KEY`); handle `charge.success`, `subscription.create`, `subscription.disable`, `invoice.payment_failed`. **Mount `express.raw({ type: 'application/json' })` on the webhook route before `express.json()`.**
  - `src/services/paystackService.ts` (new).
  - `src/services/entitlementService.ts` (new): `getEntitlements(userId) → { tier, aiCreditsRemaining, features }`.
- **Frontend:** `src/routes/Pricing.tsx`, `src/routes/BillingSettings.tsx`; `src/components/billing/{UpgradeButton,ManageSubscription,InvoiceList}.tsx`; `src/hooks/useEntitlements.ts`.
- **Tests:**
  - `billing.integration.test.ts` — mocked Paystack HTTP; subscription row created on `subscription.create`.
  - `paystackWebhook.test.ts` — signature verification passes on good payload, fails on tamper.
  - `useEntitlements.test.tsx` — correct tier for free / active / past_due.
- **Env (backend):** `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `PAYSTACK_WEBHOOK_SECRET`, `PAYSTACK_PLAN_PRO_MONTHLY`, `PAYSTACK_PLAN_PRO_YEARLY`, `APP_URL`.
- **Env (frontend):** `VITE_PAYSTACK_PUBLIC_KEY`.
- **External:** [Paystack dashboard](https://dashboard.paystack.com), [test cards](https://paystack.com/docs/payments/test-payments/).
- **Docs:** `docs/PAYSTACK.md`.

### 5.2 — Tier gating and feature flags
**Priority: 2 · Effort: M · Branch:** `feat/pro-tier-gating`

- **Backend:** `src/middleware/requireFeature.ts` (new) — 402 with `{ upgrade_url }` when the tier lacks the feature. `src/config/features.ts` (new) — the single flag map.
- **Frontend:** `src/components/common/FeatureGate.tsx` (new) — `<FeatureGate feature="ai.breakdown">{children}</FeatureGate>` renders an upgrade card if not entitled.
- **Tests:** integration middleware test; frontend snapshot for `FeatureGate` in both states.
- **Env:** none.

### 5.3 — Pay-as-you-go AI credits
**Priority: 3 · Effort: M · Branch:** `feat/pro-ai-credits`

- **Model:** Pro includes 100 credits / month. Extra bundles: ₦2,000 for 500 credits, ₦7,000 for 2,000. One AI breakdown = 1 credit.
- **Backend:** `src/services/aiCreditService.ts` (new) — `debit`, `credit`. Wrap `aiController.breakdownTask`; **refund the credit if the provider call fails.** New endpoint `POST /api/billing/ai-credits/checkout`.
- **Frontend:** `src/components/ai/CreditBadge.tsx` in the AI modal.
- **Tests:** integration — debit succeeds, empty balance returns 402, refund on failure.
- **Env:** `PAYSTACK_PLAN_AI_CREDITS_SMALL`, `PAYSTACK_PLAN_AI_CREDITS_LARGE`.

### 5.4 — Self-hosting license
**Priority: 4 · Effort: L · Branch:** `feat/pro-self-host-license`

- **Model:** Ed25519-signed license file. Blob: `{ customer_id, tier, expires_at, features, hardware_fingerprint }`, signed by Tudu's private key (kept only in a small license-issuer service). Offline verification; no phone-home after activation.
- **New service:** `packages/license-issuer` (or separate repo). CLI `tudu-license issue …`, small admin web UI, SQLite store, hardware-bound device IDs, fail-closed on mismatch.
- **Backend:** `src/services/licenseService.ts` (new), `src/middleware/requireLicense.ts` (new).
- **Frontend:** `src/components/settings/License.tsx` (new).
- **Env:** `TUDU_MODE=cloud|self_hosted`, `TUDU_LICENSE_PUBLIC_KEY`.
- **Tests:** unit — signature verify, expiry rejection, fingerprint mismatch.
- **Docs:** `docs/SELF_HOSTING.md`.

### 5.5 — Push notifications
**Priority: 5 · Effort: M · Branch:** `feat/pro-push`

Extends 4.11 with real browser push (Service Worker + VAPID). Click notification → opens the task.

- **Backend:** `src/services/pushService.ts` (new) — sends via `web-push`. Store subscriptions in `push_subscriptions` (endpoint, keys, user_id).
- **Frontend:** service-worker push handler (via `vite-plugin-pwa`), `src/components/settings/NotificationPreferences.tsx` (new).
- **Env:** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
- **External:** generate VAPID keys with `npx web-push generate-vapid-keys`.

### 5.6 — Template marketplace (publish + install)
**Priority: 6 · Effort: L · Branch:** `feat/pro-template-marketplace`

Free users can *install*; Pro users can **publish** and earn credits.

- **Backend:** `templates` (id, author_id, name, description, category, definition JSONB, install_count, is_published, status), `template_installs` (template_id, user_id, installed_at). `src/controllers/templateController.ts` (new). Moderation: `status ∈ {pending, approved, rejected}`.
- **Frontend:** `src/routes/Marketplace.tsx`, `src/components/marketplace/{TemplateCard,TemplatePreview,InstallButton,PublishModal}.tsx`. "Publish as template" action in the board bar.
- **Tests:** integration — install copies columns and example cards, does not copy ownership; publish validation.
- **Env:** none.
- **Docs:** `docs/MARKETPLACE.md`.

### 5.7 — GitHub integration
**Priority: 7 · Effort: M · Branch:** `feat/pro-github`

Auto-move cards on PR events. Create a task from an issue; when a PR merges, move the linked task to the "Merged" column.

- **Backend:**
  - Migrations: `integrations` (id, user_id, type, config JSONB, created_at), `github_mappings` (id, board_id, repo_full_name, target_column_id, pr_merged_column_id).
  - `src/controllers/githubWebhookController.ts` (new) — **verify `X-Hub-Signature-256` (HMAC-SHA256 over the raw body with the integration's webhook secret).** Handle `pull_request.opened`, `pull_request.closed` (merged), `issues.opened`.
  - `src/services/githubService.ts` (new) — OAuth app + repo listing.
- **Frontend:** `src/components/integrations/GitHubConfig.tsx` (new), PR-link chip on task cards.
- **Tests:** `githubWebhook.test.ts` — signature verification, event handling.
- **Env:** `GITHUB_APP_ID`, `GITHUB_APP_SECRET`, `GITHUB_WEBHOOK_SECRET`.
- **Docs:** `docs/GITHUB.md`.

### 5.8 — Slack integration
**Priority: 8 · Effort: S · Branch:** `feat/pro-slack`

Notifications for due dates and assignments; `/tudu create` slash command.

- **Backend:**
  - Migrations: `slack_configs` (user_id, workspace_id, webhook_url, channels JSONB, preferences JSONB).
  - `src/controllers/slackController.ts` (new) — **verify Slack's signing secret (`X-Slack-Signature` + `X-Slack-Request-Timestamp`) on every request.**
  - `src/services/slackService.ts` (new).
- **Frontend:** `src/components/settings/SlackConfig.tsx` (new).
- **Tests:** signature verification test.
- **Env:** `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET`.
- **Docs:** `docs/SLACK.md`.

### 5.9 — Public write API + webhooks
**Priority: 9 · Effort: M · Branch:** `feat/pro-public-write`

Extends 4.10 with write endpoints and webhook subscriptions. Zod-validated bodies.

- **Backend:** `POST /api/v1/tasks`, `PUT /api/v1/tasks/:id`, `DELETE /api/v1/tasks/:id`, `POST /api/v1/webhooks` (subscribe). Webhook delivery: HMAC-signed payloads, retry with backoff (5 attempts, exponential).
- **Frontend:** webhook subscriptions in `src/components/settings/Webhooks.tsx`.
- **Tests:** integration — create task via API key, webhook fires on task create.
- **Env:** `WEBHOOK_SIGNING_SECRET`.

### 5.10 — Offline queue & sync
**Priority: 10 · Effort: M · Branch:** `feat/pro-offline-sync`

Queue actions while offline (Service Worker + IndexedDB), flush on reconnect. Conflict resolution UI.

- **Frontend:** `src/lib/offlineQueue.ts` (new — IndexedDB via `idb`), `useOfflineSync` hook, `src/components/common/OfflineIndicator.tsx`.
- **Backend:** no changes — the existing endpoints handle the replay.
- **Tests:** e2e — go offline, create a task, come online, task appears on the server.
- **Env:** none.

### 5.11 — Advanced analytics (team performance)
**Priority: 11 · Effort: M · Branch:** `feat/pro-team-analytics`

- **Backend:** materialized view `task_metrics` (weekly rollup: tasks created, completed, avg completion hours by user + board). Refresh every 15 min via Render Cron.
- **Frontend:** extend `AnalyticsDashboard.tsx` with a team selector, burndown chart, member leaderboard.
- **Tests:** unit — metric calculations on seeded data.
- **Env:** none.

### 5.12 — Time tracking
**Priority: 12 · Effort: M · Branch:** `feat/pro-time-tracking`

Real time tracking (not just Pomodoro). Manual entries and auto-timer.

- **Backend:** `time_entries` (id, user_id, task_id, started_at, ended_at, duration_seconds, description, billable). `src/controllers/timeController.ts` (new).
- **Frontend:** timer button on cards, `src/components/time/{Timer,TimeLog,WeeklyReport}.tsx`. Integrate with Pomodoro sessions.
- **Tests:** integration — start, stop, report totals.
- **Env:** none.

---

## 6. ENTERPRISE TIER

Everything in Free + Pro, plus the following.

### 6.1 — SSO (SAML 2.0 / OIDC)
**Priority: 1 · Effort: L · Branch:** `feat/ent-sso`
- **Backend:** `src/config/passport.ts` — add `passport-saml` and `openid-client` strategies. `src/controllers/ssoController.ts` (new) — per-workspace IdP metadata.
- **Migrations:** `sso_configs` (workspace_id, provider, metadata_url, client_id, client_secret_encrypted, enabled).
- **Env:** `SSO_ENCRYPTION_KEY` (32 bytes; encrypts client secrets at rest).
- **External:** [Okta Developer](https://developer.okta.com), [Azure AD free tier](https://azure.microsoft.com/en-us/free/), [Google Workspace trial](https://workspace.google.com).
- **Docs:** `docs/SSO_SETUP.md`.

### 6.2 — Audit log export
**Priority: 2 · Effort: M · Branch:** `feat/ent-audit-export`
- Reuse `activity_log`. Add `GET /api/workspaces/:id/audit.csv?from=&to=` (streamed).
- Frontend: export button in workspace settings; timeline view.
- Retention: 24 months (configurable).
- **Env:** none.

### 6.3 — Bulk user provisioning (SCIM)
**Priority: 3 · Effort: L · Branch:** `feat/ent-scim`
- `src/controllers/scimController.ts` (new) — `/scim/v2/Users`, `/scim/v2/Groups`. Bearer token per workspace.
- **Docs:** `docs/SCIM.md`.

### 6.4 — On-prem deployment package
**Priority: 4 · Effort: L · Branch:** `feat/ent-onprem`
- Docker Compose + Helm chart. Bundled Postgres. Air-gapped install via a signed tarball.
- Uses 5.4 (self-host license) at boot.
- **Docs:** `docs/ON_PREM.md`.

### 6.5 — Dedicated support & SLA
**Priority: 5 · Effort: XS · Branch:** `feat/ent-sla`
- Not code: support portal, escalation contact, status page.
- **External:** [Instatus](https://instatus.com) or [Better Stack](https://betterstack.com).

### 6.6 — Custom domain & white-label
**Priority: 6 · Effort: M · Branch:** `feat/ent-white-label`
- Custom domain for the workspace's Tudu URL, replace the wordmark with the workspace logo, remove "Powered by Tudu".
- **Backend:** `workspaces.branding` JSONB (logo_url, primary_color, custom_domain). Domain verification via TXT record.
- **Env:** none beyond existing.
- **Docs:** `docs/WHITE_LABEL.md`.

### 6.7 — Data residency & export
**Priority: 7 · Effort: M · Branch:** `feat/ent-data-residency`
- Region-pinned Neon branches (EU / US / Africa). Full workspace export as a signed JSON archive.
- **Docs:** `docs/DATA_RESIDENCY.md`.

---

## 7. Payment strategy (Paystack)

### 7.1 Why Paystack
You are Nigerian; Paystack is the default. It handles cards and **direct debit** (a Paystack-specific Nigerian rail), has a clean REST API, and supports both recurring plans and one-off charges.

### 7.2 Products to create in the Paystack dashboard

| Product | Type | Amount (kobo) | Interval |
|---|---|---|---|
| Tudu Pro Monthly | Plan | 750,000 | monthly |
| Tudu Pro Yearly | Plan | 7,500,000 | annually |
| AI Credits — Small | One-off | 200,000 | — |
| AI Credits — Large | One-off | 700,000 | — |

Note **kobo**: 750,000 kobo = ₦7,500.

### 7.3 Webhook flow
1. User clicks **Upgrade** → `POST /api/billing/checkout` → backend calls `POST /transaction/initialize` → frontend redirects.
2. User pays on Paystack's page → redirect to `APP_URL/billing/callback?reference=…`.
3. Paystack also POSTs to your webhook. Handler:
   - Verify HMAC signature.
   - Insert `payments` row.
   - On `subscription.create`, write `subscriptions` row.
   - On `invoice.payment_failed`, set `status = 'past_due'`, email the user.
4. `entitlementService` reads from `subscriptions` — never from the frontend.

**Never trust the redirect.** The webhook is the source of truth.

### 7.4 Testing
- Test cards: `4084 0840 8408 4081`, CVV `408`, any future expiry.
- Tunnel with [ngrok](https://ngrok.com) or [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/).

### 7.5 Refunds and dunning
- Refunds via the Paystack dashboard for now.
- Dunning: Paystack retries automatically; on final failure, downgrade to Free.

---

## 8. Feature flag registry

`backend/src/config/features.ts`:

```ts
export const FEATURES = {
  'ai.breakdown':           { free: true,  pro: true,  enterprise: true, metered: true },
  'ai.breakdown.hd':        { free: false, pro: true,  enterprise: true },
  'filters.power':          { free: true,  pro: true,  enterprise: true },
  'bulk.actions':           { free: true,  pro: true,  enterprise: true },
  'undo.softDelete':        { free: true,  pro: true,  enterprise: true },
  'pwa.install':            { free: true,  pro: true,  enterprise: true },
  'templates.builtin':      { free: true,  pro: true,  enterprise: true },
  'templates.publish':      { free: false, pro: true,  enterprise: true },
  'api.public.read':        { free: true,  pro: true,  enterprise: true },
  'api.public.write':       { free: false, pro: true,  enterprise: true },
  'api.webhooks':           { free: false, pro: true,  enterprise: true },
  'integrations.github':    { free: false, pro: true,  enterprise: true },
  'integrations.slack':     { free: false, pro: true,  enterprise: true },
  'push.notifications':     { free: false, pro: true,  enterprise: true },
  'offline.sync':           { free: false, pro: true,  enterprise: true },
  'analytics.team':         { free: false, pro: true,  enterprise: true },
  'time.tracking':          { free: false, pro: true,  enterprise: true },
  'selfHost.license':       { free: false, pro: true,  enterprise: true },
  'sso.saml':               { free: false, pro: false, enterprise: true },
  'scim.provisioning':      { free: false, pro: false, enterprise: true },
  'audit.export':           { free: false, pro: false, enterprise: true },
  'whitelabel.customDomain':{ free: false, pro: false, enterprise: true },
  'data.residency':         { free: false, pro: false, enterprise: true },
} as const;
```

---

## 9. Branch strategy

| Tier | Branch prefix | Example |
|---|---|---|
| Free | `feat/free-*` | `feat/free-power-filters` |
| Pro | `feat/pro-*` | `feat/pro-paystack-core` |
| Enterprise | `feat/ent-*` | `feat/ent-sso` |

**Rules:** one feature per branch; rebase on `main` before PR; every PR includes tests; migrations append-only and idempotent; deploy order always **migrate → backend → frontend**.

---

## 10. Environment variables master list

### Backend (`backend/.env`)
```
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=7d
SESSION_SECRET=
FRONTEND_URL=
PORT=5000
NODE_ENV=development
AI_PROVIDER=gemini
GEMINI_API_KEY=
GROQ_API_KEY=
OLLAMA_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=
# Pro / Enterprise
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
PAYSTACK_WEBHOOK_SECRET=
PAYSTACK_PLAN_PRO_MONTHLY=
PAYSTACK_PLAN_PRO_YEARLY=
PAYSTACK_PLAN_AI_CREDITS_SMALL=
PAYSTACK_PLAN_AI_CREDITS_LARGE=
APP_URL=
RESEND_API_KEY=
REMINDER_FROM_EMAIL=
API_TOKEN_HASH_PEPPER=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:support@tudu.app
GITHUB_APP_ID=
GITHUB_APP_SECRET=
GITHUB_WEBHOOK_SECRET=
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_SIGNING_SECRET=
WEBHOOK_SIGNING_SECRET=
TUDU_MODE=cloud
TUDU_LICENSE_PUBLIC_KEY=
SSO_ENCRYPTION_KEY=
```

### Frontend (`frontend/.env`)
```
VITE_API_URL=
VITE_SOCKET_URL=
VITE_PAYSTACK_PUBLIC_KEY=
```

---

## 11. External services to sign up for

| Service | Use | Tier we need |
|---|---|---|
| [Paystack](https://paystack.com) | Payments | Live, verified Nigerian business |
| [Neon](https://neon.tech) | Postgres | Already in use |
| [Render](https://render.com) | Backend + Cron | Already in use |
| [Vercel](https://vercel.com) | Frontend | Already in use |
| [Resend](https://resend.com) | Transactional email | Free tier |
| [Google AI Studio](https://aistudio.google.com/apikey) | Gemini API | Free tier |
| [Groq](https://console.groq.com) | Groq API | Free tier |
| [ngrok](https://ngrok.com) / [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) | Local webhook testing | Free |
| [Instatus](https://instatus.com) / [Better Stack](https://betterstack.com) | Status page | Free |
| [Okta Developer](https://developer.okta.com) | SSO testing | Free |
| [Sentry](https://sentry.io) | Error tracking | Free tier |
| [PostHog](https://posthog.com) / [Plausible](https://plausible.io) | Product analytics | Free tier |
| [UptimeRobot](https://uptimerobot.com) | Uptime monitoring | Free |

---

## 12. Migration & rollback rules

- Every migration is **idempotent** (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DO $$ ... EXCEPTION WHEN duplicate_object`).
- Never edit a migration that has run against production. Add a new one.
- Rollback for additive changes is always a **forward** migration: `DROP COLUMN`, `DROP TABLE`, `DROP FUNCTION` in a fresh migration file.
- Migration runs **first**; the backend that depends on it goes out **second**.

---

## 13. Launch & Growth Playbook

Not product features — this is the go-to-market plan for the Free + Pro launch. It lives here so it ships alongside the code that makes it possible.

### 13.1 — GitHub repo as landing page
**Effort: S**
- Add a demo GIF (10s: drag → AI → Pomodoro) at the top of `README.md`.
- Comparison table vs Trello / Jira / Linear / Monday.
- Badges: build status, license, stars.
- Topics: `pern-stack`, `kanban`, `pomodoro`, `ai-todo`, `productivity`, `self-hosted`.

### 13.2 — Vercel SEO
**Effort: S**
- Generate `sitemap.xml` and `robots.txt` at build time.
- Per-route meta tags (title, description, OG image) via `react-helmet-async` or the app's own meta component.
- OG image endpoint `/og/:boardId` for shared boards.

### 13.3 — Template SEO pages
**Effort: S**
- `/templates/student-kanban`, `/templates/freelancer-pomodoro`, `/templates/developer-sprint`, `/templates/content-calendar`.
- Each: description, benefits, screenshot, "Use this template" CTA, related templates.

### 13.4 — Reddit launch
**Effort: S**
- r/SideProject, r/webdev, r/pernstack, r/productivity. Each with a tailored title and a Loom video.

### 13.5 — Product Hunt launch
**Effort: S**
- Launch Tue–Thu, 12:01am PST. Tags: Productivity, Task Management, Kanban, PWA, AI. First comment ready; five prepared responses for likely questions.

### 13.6 — Developer community posts
**Effort: S**
- Dev.to and Hashnode articles: "How I built a real-time Kanban with Socket.io + dnd-kit", "Building an AI-powered Kanban with the PERN stack".

### 13.7 — Directory listings
**Effort: S**
- AlternativeTo, Uneed, SaaS Hub, There's An AI For That. Each with screenshots, pricing, and competitor comparison.

### 13.8 — In-app viral loops
**Effort: S**
- Share-board footer "Built with Tudu — try free".
- Referral: invite 3 friends, unlock a month of Pro.
- Template installs credit the author and link back.

### 13.9 — Changelog & feedback
**Effort: XS**
- `/changelog` page; in-app "What's new" modal; public roadmap; in-app feedback button; monthly feature voting.

---

## 14. Pre-launch checklist (Free + Pro)

Before announcing Tudu:

- [ ] 4.1 Landing page live, indexed by Google.
- [ ] 4.3 Power filters shipped.
- [ ] 4.7 Keyboard shortcuts shipped.
- [ ] 4.8 PWA installable and passes Lighthouse PWA audit.
- [ ] 5.1 Paystack flow works end-to-end on **test** keys, then on **live** keys with a real card.
- [ ] 5.2 `FeatureGate` hides Pro features on Free.
- [ ] 5.3 AI credits debit and refund; a bundle purchase succeeds with a test card.
- [ ] 5.4 You can issue a self-host license and run Tudu locally with it.
- [ ] Migrations run clean on a fresh Neon branch.
- [ ] `docs/PAYSTACK.md`, `docs/SELF_HOSTING.md`, `docs/GITHUB.md`, `docs/SLACK.md` written.
- [ ] Support email address monitored.
- [ ] Terms of Service and Privacy Policy published (Paystack requires these).
- [ ] Uptime monitor live; alert email configured.
- [ ] Sentry (or equivalent) capturing frontend and backend errors.

---

## 15. Order of work

The critical path is **5.1 → 5.2 → 5.3**, with **4.1** running in parallel.

```
Week 1     → 5.1 Paystack core
Week 2     → 5.2 Tier gating  +  4.1 Landing page
Week 3     → 5.3 AI credits  +  4.3 Power filters
Week 4     → 4.4 Sorting  +  4.5 Undo  +  4.7 Shortcuts
Week 5     → 5.4 Self-host license  +  4.2 Onboarding v2
Week 6     → 5.6 Marketplace  +  4.9 Built-in templates  +  5.10 Offline sync
Week 7     → 5.7 GitHub  +  5.8 Slack  +  5.9 Public write API  +  4.10 Public read API
Week 8     → 5.11 Team analytics  +  5.12 Time tracking  +  4.8 PWA  +  5.5 Push
Week 9     → §13 launch playbook. Announce.
Week 10+   → Enterprise (6.x).
```

Roughly two months to the public launch, matching the original roadmap's "8 weeks to MVP" estimate — but with payments, self-hosting, and integrations folded in, because those are what turn a free tool into a business.

---

## 16. Decisions I made that you may want to flip

| Decision | Where to change |
|---|---|
| Pro is ₦7,500/month, ₦75,000/year | Paystack dashboard; `plans` seed |
| Pro includes 100 AI credits/month | `plans.ai_credits` seed |
| One AI breakdown = 1 credit | `aiCreditService.debit` call site |
| Self-host license uses Ed25519 + hardware fingerprint | `licenseService.ts` |
| Marketplace publication requires admin moderation | `templateController.publish` |
| Enterprise starts at ₦450,000/year | Sales process, not code |
| Free tier gets read-only public API | `features.ts` |
| Free tier gets built-in templates; publishing is Pro | `features.ts` |
| Undo uses soft-delete column, not in-memory Map | `tasks.deleted_at` migration |
| Cron on Render Cron Jobs, not in-process | `backend/render.yaml` |
| Webhook signature verification mandatory for all integrations | `*.webhookController.ts` |

Nothing in this document is locked. Flag anything you disagree with and the affected section gets rewritten before we start coding.

---

## 17. What to build first

**5.1 — Paystack core.** Everything else in Pro depends on it, and it is the single thing standing between Tudu and revenue. When you're ready, say the word and we start on the migration, the webhook controller, and the `entitlementService`.