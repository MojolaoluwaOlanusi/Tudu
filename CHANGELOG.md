# Changelog

All notable changes to Tudu are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**About versioning:** Tudu's public development started 2026-09-30. No
GitHub release tags have been created yet. The entries below group merged
work by development milestone so a reader can follow the narrative.
Every date comes from the merge commit for that milestone. When tags are
created, this file will switch to listing actual versions per tag and
the milestone labels will disappear.

## [Unreleased]

### Added

- GitHub Actions CI (backend + frontend jobs, Postgres 16 service container)
- Dependabot for backend, frontend, and GitHub Actions
- AGPL-3.0 LICENSE at repo root
- CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md, SUPPORT.md
- PULL_REQUEST_TEMPLATE.md
- .github/ISSUE_TEMPLATE/ (bug_report, feature_request, docs_request, config.yml)
- Docs pages: SELF_HOSTING, MARKETPLACE, API_AND_WEBHOOKS, ENTERPRISE,
  LAUNCH_AND_GROWTH, LAUNCH_TIMING

### Fixed

- Sidebar "Shared with me" rows navigated to `#/shared/:id` (ignored by
  BrowserRouter) and users stayed on the dashboard. Replaced with `<Link>`.
- `window.confirm` replaced with a themed ConfirmDialog across 17 call
  sites. No more unstyled, thread-blocking dialogs and no more
  inconsistent copy on destructive actions.
- Deep-linking to a protected route while signed out dropped the target
  after sign-in. Destination is now remembered in sessionStorage and
  consumed after both email and OAuth login.
- `SettingsIntegrations` inferred the webhook URL from
  `window.location.origin.replace('5173', '5000')`, which produced a
  broken port on any deployed domain. Now reads `VITE_API_URL`.
- `TaskCard.copyId()` reported success even when the clipboard write
  failed.
- Unknown `/docs/:slug` rendered the docs index under the wrong URL. Now
  renders a 404.
- OAuth strategies threw "OAuth2Strategy requires a clientID option" at
  import time when credentials were unset, crashing every backend test
  suite and any self-hosted install without OAuth. Now registered
  conditionally; `/auth/google` and `/auth/github` return 503 when
  unconfigured, and the login screen hides those buttons.
- Mobile: docs sidebar was hidden below md (no way to reach other pages);
  ShareModal could clip its Send button; SharedListView had no exit at
  the top; 30-bar analytics charts rendered as hairlines; Topbar had no
  board switcher below lg.

### Changed

- Landing page honesty pass. Removed fictional testimonials (Amaka /
  Tunde / Chioma) and their fabricated "500+ Teams / 12,000+ Tasks /
  NGN 45k Paid" metrics. Replaced the fake "Trusted by Paystack,
  Flutterwave, Kuda..." logo strip with a "Built with" strip naming the
  actual stack. Removed the false "Migrate from Trello in 1 click"
  claim (no import exists yet; see FUTURE_WORK). Replaced the wrong
  "AI breakdown (100 / mo)" Free-tier claim (Free users are not
  metered) with plain "AI breakdown". Softened "offline-first" to
  "offline-capable" to match what actually works (offline reads, queued
  writes). Softened unsubstantiated ProblemSection numbers.
- `readme/` folder removed. FUTURE_WORK.md, UI.md, VISUAL_SYSTEM.md
  moved to `docs/`.

## [2026-10-24 .. 2026-10-28] — Launch-ready

### Added

- GitHub Actions CI workflow
- Dependabot
- License, community health files, issue templates, PR template
- Docs pages (SELF_HOSTING, MARKETPLACE, API_AND_WEBHOOKS, ENTERPRISE,
  LAUNCH_AND_GROWTH, LAUNCH_TIMING)
- Per-page meta for `/privacy` and `/terms` (Google OAuth verification)

### Fixed

- JWT expiry: log the user out instead of leaving a dead SPA session
- Mobile stats horizontal overflow
- Dynamic-import stale chunk recovery
- Mobile settings navigation (every tab reachable below md)
- Mobile docs navigation (sidebar was hidden)
- Sidebar recent-activity arrow stuck pointing up
- `ConfirmDialog` replacing 17 `window.confirm` sites
- Sidebar shared-list links
- Auth destination preservation
- Docs 404
- Production webhook URL
- `copyId` truthfulness
- Mobile: ShareModal, SharedListView, BarChart, docs nav, board switcher
- OAuth strategies registered only when credentials are set
- Hide OAuth buttons when backend reports them unavailable

### Changed

- readme/ merged into docs/

## [2026-10-24 .. 2026-10-26] — UI overhaul

### Changed

- Every page restyled to the mockup's visual system
- New app shell: Topbar, collapsible Sidebar, slide-in DetailPanel
- List view, Board view, Stats, Analytics restyled
- Settings moved from modals to routed pages under `/settings/*`
- Login split into two-column layout; `/signup` route added
- Landing page rebuilt with mockup composition (Navbar, MegaMenu,
  MobileMenu, Hero with inline LiveBoardHero, LogoStrip,
  ProblemSection, 16-tile BentoGrid, HowItWorks, UnderTheHood,
  TierGating, PricingSection, Changelog, SocialProof, FinalCTA,
  Footer)
- Marketing pages added: `/docs`, `/help`, `/contact`, `/blog`,
  `/community`, `/status`, `/privacy`, `/terms`, `/solutions/*`
- Dark palette swapped to the mockup's cool near-black family
- SVG chart primitives replace Chart.js in personal + team analytics
- Chrome restyled: command palette, shortcut help, toasts, undo pill,
  offline pill, install prompt

### Fixed

- Kanban drag-and-drop failing after the first move
- Pomodoro timer stalling in background tabs; finish alerts added
- Wordmark colour inversion in dark mode
- Confetti never firing (context value captured as null)

## [2026-10-22] — Pro: offline queue, team analytics, time tracking

### Added

- Offline mutation queue with IndexedDB
- Batch operations queued when offline
- Conflict resolution UI
- Optimistic UI with rollback on network error
- Team analytics (per-member completion, burndown, per-board progress)
- Time tracking: start/stop, manual entries, billable, weekly reports

### Fixed

- Suppress error toasts for operations that were queued
- Fail fast on dead network; refresh the offline pill instantly

## [2026-10-21] — Pro: marketplace, GitHub, Slack, webhooks

### Added

- Template marketplace: publish, install, version, sync
- Paid templates with Paystack subaccount payouts
- Rentals, 14-day refund window, VAT-aware pricing
- GitHub integration: OAuth flow, repo mapping, PR-opened / PR-merged
  column moves
- GitHub webhook HMAC-SHA256 signature verification with per-user
  secrets
- Slack integration: OAuth, per-user channel, `/tudu create` slash
  command, signed requests with 5-minute replay window
- Public write API under `/api/v1` with Zod validation
- Outbound webhooks: `task.created` / `task.updated` / `task.moved` /
  `task.deleted`
- Standard Webhooks signature, exponential retry, dead-letter requeue
- Webhook management UI

### Fixed

- Allow re-buying refunded templates; add template deletion
- Webhooks fire from every task mutation
- GitHub webhook signature verified BEFORE ignoring events without a
  task id (was an auth bypass on unrelated payloads)

## [2026-10-16] — Pro: Paystack billing, tier gating, self-hosting license, push

### Added

- Paystack subscriptions (Pro monthly / yearly)
- Server-side entitlement check (never trusted from the client)
- Tier gating: `requireFeature` middleware + `FeatureGate` component
- HD AI breakdown (12 steps) for Pro
- AI credit ledger with atomic check-and-debit
- Self-hosting license: Ed25519 signer (issuer side), offline verifier
  (consumer side), self-service portal
- License banner for unlicensed self-hosted instances
- Browser push notifications via VAPID

### Fixed

- Show current tier in the header
- Pricing page checkmark rendering

## [2026-10-13 .. 2026-10-14] — Free tier complete

### Added

- Marketing landing page and public demo (creates a seeded throwaway
  account)
- Onboarding wizard v2 with template picker
- Power filters: `@me`, `@email`, `#work`, `priority:high`,
  `due:overdue|today|week`, `is:open|completed`, `column:Name`, plus
  free text
- GitHub-style chip UI in the query bar
- Enhanced sorting (created_at, updated_at, due_date, title, priority,
  assignee, category) with direction toggle; persists across devices
- Undo for soft-deleted tasks (10-second window)
- Bulk actions on the List view (mark done, mark todo, delete)
- Keyboard shortcuts: `n`, `/`, `?`, `g`+`l/b/s/a`, `Esc`, Cmd/Ctrl+K
- Command palette
- PWA icons and manifest
- Built-in board templates: Personal, Team Sprint, Content Calendar,
  Bug Tracker, Student, Freelancer, Blank
- Public read-only REST API under `/api/v1` with personal access tokens
  (SHA-256 + pepper hash, revocation)
- Rate limit: 100 req/min per user on `/api/v1`
- Due-date reminders via Resend, triggered by a daily cron
- Celebrations with per-user opt-out; respects prefers-reduced-motion

### Fixed

- API tokens modal reachable on short viewports

### Reverted

- PWA window controls overlay (shipped and reverted same day)

## [2026-10-08 .. 2026-10-12] — Custom boards and team features

### Added

- Custom boards (UUID ids) and custom columns per board
- Board columns carry a stage (todo/doing/done); task.status mirrors the
  column's stage via a database trigger
- WIP limits (soft: displayed and checked server-side on move)
- Column drag reorder
- Workspaces with admin / member / viewer roles
- Invitations with pending / accepted lifecycle
- Board integrity trigger: every task lives on exactly one board, in a
  column whose stage equals its status
- Assignee on tasks with role-based validation
- Multi-card drag via `/api/tasks/batch`

### Fixed

- Migration script idempotency
- Header optimization for small viewports
- Column color picker preview

## [2026-10-06] — Pomodoro and drag-drop fixes

### Fixed

- Pomodoro timer stalling in background tabs
- Finish alerts (10-second alarm, notification, tab title, vibration,
  toast)
- Kanban drag-and-drop failing after the first move
- Simplified Pomodoro timer in the header; hid tour button during
  sessions

## [2026-10-02] — Analytics, branding, tests, onboarding

### Added

- Analytics dashboard with Chart.js: overview, completed-tasks trends,
  time-spent by category, priority distribution
- CSV and JSON export, with spreadsheet-formula escaping on
  user-supplied titles
- Brush-stroke UI polish; wordmark PNG with theme-aware swap
- Jest (backend) and Vitest + Playwright (frontend) test suites
- 18-step guided product tour with spotlight and self-navigation
- Vercel Web Analytics

### Fixed

- Confetti never fired because the context value was captured as null
- Page scrolling sideways on mobile
- E2E duplicate task cards and non-determinism

## [2026-10-01] — Email auth, dark mode, core features

### Added

- Email + password auth with bcrypt (schema updated to accept it
  alongside OAuth)
- Dark/light theme with a design system (tokens + `dark` class)
- React Query for server state, Zustand for client state
- Kanban board with drag and drop (`@dnd-kit`)
- Subtasks with progress
- List sharing by email (invite, accept, decline)
- Activity log (per task, per user)
- Real-time sync via Socket.io (per-user room derived from a verified
  JWT; no client-supplied room)
- Natural language parsing (chrono-node + hashtag/keyword rules)
- AI task breakdown (Gemini / Groq / Ollama over plain HTTP; no vendor
  SDK)
- Pomodoro timer with focus stats (background-safe wall-clock countdown)

### Fixed

- Frontend OAuth redirect wildcard route
- TaskForm pre-population when editing
- Header crowding on small screens
- Rate limiting in production
- Shared list invitations reachable, editable, and real-time
- Activity timestamps
- Subtask visibility on shared tasks
- Pagination for shared lists

## [2026-09-30] — Initial release

### Added

- Project structure for a PERN stack todo app
- Google and GitHub OAuth (Passport)
- Core task CRUD
- Due dates and overdue logic
- Search and filters

[Unreleased]: https://github.com/MojolaoluwaOlanusi/Tudu/compare/main...HEAD