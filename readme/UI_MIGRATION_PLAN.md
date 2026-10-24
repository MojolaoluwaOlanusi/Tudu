# Tudu UI migration plan — match the mockup exactly

## 1. Context

Two repos:

1. **Production app (`tudu`)** — real backend, real auth, real data, TypeScript, tests, every feature in the README.
2. **Mockup (`tudu-ui-mockup`)** — React + Vite mockup, JSX, stale data, no backend. The visual spec.

Goal: rebuild the production app's UI so it looks like the mockup, while every production feature keeps working.

## 2. Non-negotiables

- Backend must not be modified unless a small endpoint tweak is unavoidable. It should not be.
- Every existing feature must still work: auth, tasks, subtasks, boards, columns, workspaces, sharing, Pomodoro, stats, analytics, AI breakdown (free + HD), time tracking, templates, marketplace, GitHub/Slack, webhooks, push, billing, license, PWA, offline queue, undo, onboarding, bulk actions, command palette, shortcuts.
- TypeScript on both sides. No `allowJs` creep.
- Every step must type-check (`npm run build` in `frontend`), pass unit + integration tests, and pass Playwright e2e where the step touches routed pages.
- No feature gets removed. Modal vs panel is presentation only.
- Do not port `tudu-mock-tier` localStorage, the Ctrl+Shift+E session-expiry demo, or the Paystack *mock* modal. Those are mockup-only.

## 3. Approach

Three layers to move:

1. **Presentation** — swap layouts, restyle components, adopt the mockup's exact Tailwind classes. ~80% of the diff.
2. **Composition** — how pages compose sections (e.g. mockup's `AppHome` puts Recent Activity at the bottom; production puts it in the sidebar).
3. **Behaviour** — modals vs side panels. The mockup uses a slide-in `DetailPanel` for task/column edit; production uses modals. Convert to a side panel to match, keeping the same form components and mutations under the hood.

The mockup already uses the production tokens (`bg-surface`, `text-ink`, `border-line`, `bg-brand-subtle`, `font-handwritten`, `brush-stroke`, `glass`). This is a systematic restyle, not a rewrite.

## 4. Branching, commit, PR

One branch per step, from `main`:

```pwsh
git fetch origin
git checkout main
git pull --ff-only origin main
git checkout -b feat/ui-<step>-<slug>
# ... apply the step's edits ...
git add -A
git commit -m "ui(<scope>): <what>"
git push -u origin feat/ui-<step>-<slug>
Open a PR from the branch into main. Reviewer confirms before the next step. No step merges with a red test suite.
```

## 5. Testing gates (every step)

```pwsh
cd backend && npm run test:unit

cd backend && npm run test:integration

cd frontend && npm test -- --run

cd frontend && npm run build

cd frontend && npm run test:e2e (only when routed pages change)
```

## 6. The steps

**Step 1 — Foundation (tokens, brand utilities, density, Wordmark, shortcuts parity)**

Why first: everything else reads from these.

frontend/src/index.css — audit the token set against the mockup's index.css (light + dark, --r-* present).

frontend/src/styles/brand.css — overwrite with the mockup's .brush-stroke + .glass + [data-spotlight] recipe.

frontend/src/styles/density.css — port the compact rules (currently gated on [data-density="compact"] [data-app-shell]).

frontend/src/components/common/Wordmark.tsx — verify theme-aware PNG behaviour (already close).

frontend/src/lib/density.ts — new: getDensity, applyDensity, toggleDensity (port from mockup).

frontend/src/hooks/useKeyboardShortcuts.ts — add Ctrl+Shift+D (toggle density). Mockup's Ctrl+Shift+E is skipped (mockup-only).

frontend/src/main.tsx — apply theme + density at boot.

frontend/src/App.tsx — ensure data-app-shell is on the shell (already present) and data-main wraps the outlet.

Backend: none. Tests: existing shortcut test.

**Step 2 — App shell: Topbar, Sidebar, DetailPanel**

Why second: every page renders inside the new shell.

New:

frontend/src/components/app/Topbar.tsx — mockup layout (h-14, SyncDot, PomodoroPill, TimerPill, ThemeToggle, Settings/Help icon buttons, ProfilePill, Logout). Keep production controls: NotificationSettings, ApiTokens, Webhooks, TourButton, upgrade/pro chip, integrations link, avatar. Settings button routes to /settings/account (Step 6).

frontend/src/components/app/Sidebar.tsx — collapsible; BoardList grouped by workspace; CollapsibleSection for Invitations, Shared with me, Shared by me; Recent-activity jump link. Pulls from existing endpoints (/api/boards, /api/workspaces/invites, /api/shared-lists, /api/share).

frontend/src/components/app/BoardList.tsx

frontend/src/components/app/SharedRow.tsx

frontend/src/components/app/CollapsibleSection.tsx

frontend/src/components/app/DetailPanel.tsx — right-side slide-in; hosts TaskDetail or ColumnSettings.

frontend/src/components/app/TaskDetail.tsx — port of mockup's TaskDetail. Same updateTask, subtasks, activity, startPomodoro, startTimer hooks as the current TaskForm/TaskCard.

frontend/src/components/app/ColumnSettings.tsx — port. Same useUpdateColumn, useDeleteColumn, createColumn.

Modified:

frontend/src/App.tsx — shell becomes Topbar + Sidebar + <Outlet> + DetailPanel. Add data-main wrapper. Remove SharedListsSidebar from the shell.

frontend/src/store/uiStore.ts — add detail: { type: 'task' | 'column'; id: string } | null, openDetail, closeDetail.

frontend/src/components/layout/Header.tsx — retire; replaced by Topbar.

Backend: none.

Tests: topbar.test.tsx, sidebar.test.tsx, detailPanel.test.tsx; update headerControls.test.tsx → topbar.test.tsx.

**Step 3 — List view (AppHome)**

frontend/src/components/tasks/TaskList.tsx — adopt mockup's structure: heading + count, Filters toggle, + New task, search row, task list, Recent Activity at the bottom (#recent-activity).

frontend/src/components/tasks/TaskCard.tsx — restyle: rounded card, chips, inline expandable subtasks + editor, Start 25m + Start timer, Activity collapsible, status dropdown.

frontend/src/components/tasks/EmptyState.tsx — verify classes.

frontend/src/components/tasks/SortDropdown.tsx, SortDirectionToggle.tsx — restyle.

frontend/src/components/tasks/FilterPanel.tsx — extracted from current inline panel.

frontend/src/components/tasks/BulkActionBar.tsx — restyle to mockup's floating bar.

frontend/src/components/activity/RecentActivity.tsx — move to bottom of AppHome.

Backend: none.

Tests: update taskList.test.tsx, TaskCard.test.tsx.

**Step 4 — Board view**

frontend/src/components/kanban/BoardView.tsx — new page composing BoardColumn + BoardCard + ColumnSettings. Keep logic.ts.

frontend/src/components/kanban/BoardCard.tsx — new (port of mockup). Wraps the existing KanbanCardBody visual.

frontend/src/components/kanban/BoardColumn.tsx — port. Column-header drag via native HTML5 drag; keep dnd-kit for cards.

frontend/src/components/kanban/KanbanBoard.tsx — retire; re-export BoardView so deep imports still resolve.

frontend/src/components/kanban/KanbanCard.tsx — keep KanbanCardBody for DragOverlay; restyle.

frontend/src/components/kanban/ColumnManager.tsx — replaced by ColumnSettings panel; retire after Step 2 lands.

frontend/src/components/kanban/BoardsModal.tsx — restyle.

Backend: none.

Tests: update kanbanCard.test.tsx; kanbanDragDrop.test.ts unchanged (logic still used); add boardView.test.tsx smoke.

**Step 5 — Stats + Analytics**

frontend/src/components/pomodoro/PomodoroStats.tsx — mockup's StatsView layout: metric cards with icons, 7-day bar chart, "Where the time went", "Recent sessions", and below it the Pro-gated Time-tracking card when the time.tracking feature is on.

frontend/src/components/analytics/AnalyticsDashboard.tsx — mockup's tabs (Personal / Team), metric cards, chart cards.

frontend/src/components/analytics/TeamAnalyticsView.tsx — mockup's team layout.

frontend/src/components/app/charts/Charts.tsx — port mockup's SVG BarChart, PieChart, LineChart. Use these in Personal + Team analytics. Chart.js stays a dependency but is no longer imported in these views.

Backend: none.

Tests: update pomodoroStats.test.tsx, analyticsDashboard.test.tsx, teamAnalytics.test.tsx (DOM changed).

**Step 6 — Settings pages (routes, not modals)**

New:

frontend/src/pages/app/AppSettings.tsx — left-nav layout.

frontend/src/pages/app/settings/primitives.tsx — PageHeader, Section, Field, ToggleRow, Avatar, Pill.

frontend/src/pages/app/settings/SettingsAccount.tsx

.../SettingsNotifications.tsx — wire useNotificationPreferences, useUpdateNotifications, usePushNotifications.

.../SettingsAppearance.tsx — wire applyTheme, applyDensity.

.../SettingsIntegrations.tsx — wire integrationService.

.../SettingsWorkspace.tsx — wire useWorkspaces, useWorkspaceMembers, useInviteMember, useSetMemberRole, useRemoveMember.

.../SettingsBilling.tsx — move current routes/BillingSettings.tsx content in, restyle.

.../SettingsLicense.tsx — move current routes/LicenseSettings.tsx content in, restyle.

.../SettingsApi.tsx — wire useApiTokens.

.../SettingsWebhooks.tsx — wire useWebhooks.

Modified:

frontend/src/App.tsx — add /settings/* routes; /settings redirects to /settings/account.

Topbar settings button → /settings/account.

Retire: ApiTokensModal.tsx, WebhooksModal.tsx, NotificationSettingsModal.tsx (their content moves into the pages; no dead code left behind).

Backend: none.

Tests: one smoke test per settings page (mocked hooks); update headerControls.test.tsx to assert routes.

**Step 7 — Auth + Pricing**

frontend/src/components/auth/Login.tsx — align copy and layout to mockup. Add mode prop and read it from ?mode=signup.

frontend/src/App.tsx — add /signup route.

frontend/src/routes/Pricing.tsx — restyle to mockup's PricingPage; keep Paystack inline popup; add ?from=app back header.

Tests: update login.test.tsx.

**Step 8 — Landing page**

Diff each of frontend/src/components/landing/* against the mockup's corresponding file; align classes, copy and layout.

Hero.tsx — mockup includes LiveBoardHero inline (as <div id="hero-board">). Keep production's "Try the demo" behaviour (real demo account) — do not switch to the mockup's /demo link if it breaks the e2e contract.

Keep <h2 className="sr-only">Kanban that just works.</h2> in Landing.tsx. It is the existing Playwright contract. The mockup does not have it; we keep it invisible.

Tests: landingFinale.test.tsx and e2e/landing.spec.ts must pass.

**Step 9 — Chrome: palette, shortcut help, toasts, undo, offline, install**

CommandPalette.tsx — align groups, icons, keyboard handling (behaviour already matches).

ShortcutHelp.tsx — align groups/copy.

ToastContainer.tsx — top-center, per-variant icons, glass background.

UndoToast.tsx — pill + shrinking progress bar.

OfflineIndicator.tsx — pill.

InstallPrompt.tsx — small pill bottom-center.

**Step 10 — Marketing pages**

Port the mockup's pages as real routes.

New:

frontend/src/components/marketing/MarketingShell.tsx

frontend/src/components/marketing/Prose.tsx

frontend/src/pages/marketing/DocsPage.tsx

.../ChangelogPage.tsx

.../HelpPage.tsx

.../ContactPage.tsx

.../BlogPage.tsx

.../CommunityPage.tsx

.../StatusPage.tsx

.../LegalPage.tsx

frontend/src/lib/docsData.ts (typed port of mockup docsData.js)

Retire ComingSoon.tsx usage for /docs, /webhooks, /changelog, /help, /contact, /blog, /community, /status, /privacy, /terms, /solutions/*. Keep ComingSoon for /demo only.

**Step 11 — Onboarding, sharing, marketplace, publisher**

OnboardingPrompt.tsx, ProductTour.tsx — restyle cards + copy.

ShareModal.tsx, ShareInvites.tsx, SharedWithMeSection.tsx, SharedListView.tsx — restyle.

MarketplacePicker, PublishTemplateModal, EditTemplateModal, PurchasesList — restyle.

PublisherSettings — fold into /settings/billing (already is).

**Step 12 — Final QA**

Full test run, e2e, visual diff check against the mockup.

Update readme/VISUAL_SYSTEM.md and readme/UI.md to reflect the new component tree.

Delete retired files only in the PR where their replacement lands.

## 7. Files retired (per step, not before)

frontend/src/components/layout/Header.tsx — replaced by Topbar (Step 2).

frontend/src/components/kanban/KanbanBoard.tsx — replaced by BoardView (Step 4).

frontend/src/components/kanban/ColumnManager.tsx — replaced by ColumnSettings panel (Step 4).

frontend/src/components/settings/ApiTokensModal.tsx — replaced by SettingsApi page (Step 6).

frontend/src/components/settings/WebhooksModal.tsx — replaced by SettingsWebhooks page (Step 6).

frontend/src/components/settings/NotificationSettingsModal.tsx — replaced by SettingsNotifications page (Step 6).

frontend/src/components/landing/ComingSoon.tsx — kept only for /demo (Step 10).

## 8. Feasibility review

Yes, this is achievable. The mockup was clearly built from the production tokens: index.css is nearly identical, the Tailwind class vocabulary matches, and the landing section list is the same. This is a systematic restyle, not a from-scratch rewrite.

Where it's genuinely hard:

DetailPanel vs modals. Tasks today open the modal TaskForm. The mockup uses a persistent right-hand TaskDetail panel. The form fields and mutations are the same, so the move is mechanical — but the open/close state has to move into uiStore.detail. Budget 2 days, not a half-day.

Sidebar with real data. The mockup's sidebar is decorative. Wiring it needs four parallel React Query calls on every shell mount. All four endpoints exist.

Settings modals → routes. Mechanical, but every entry point (Topbar buttons, deep links) has to be updated.

Chart library choice. The mockup's SVG charts are part of the visual spec. Replacing Chart.js in Personal + Team analytics changes DOM structure — tests that assert data-testid="bar-chart" need updates.

Landing exactness. The copy and layout will differ slightly in places. This is a visual diff at the end, not logic.

What will not change: backend, data model, auth flows, test framework, TypeScript strictness.

What will change: layout of every page, many file names (new files under components/app/, pages/app/settings/, pages/marketing/), which components are modals vs panels, and some class names in index.css (verify no dark-mode contrast regressions).

Estimated effort: 10–15 focused working days across 12 PRs. Most of it is visual diff and test updates, not novel code.

## 9. Risks and mitigations

|-- Risk  |--	Mitigation
A step breaks e2e because a heading/label moved	Run Playwright per PR; update the spec only when the copy change is genuinely intended.
Dark mode contrast regresses somewhere	darkPalette.test.ts already pins the palette; add a contrast assertion where a new component introduces a coloured text on dark surface.
A feature subtly breaks (bulk select, drag-multi-move, subtask inline editor)	Add at least one test per feature touched, even when it "looks" unchanged.
File sprawl confuses imports	One PR per step, retired files removed in the same PR, no _v2 / _new suffixes.
Backend drift	No backend edits in this migration. Any that become unavoidable go in their own PR with their own tests.
|--   |--

## 10. Recommendation

Proceed. Start with Step 1 — it is pure audit and safe. Step 2 is the largest single step (the shell). Everything after is smaller and mechanical.

Wait for confirmation at the end of every step before starting the next.
