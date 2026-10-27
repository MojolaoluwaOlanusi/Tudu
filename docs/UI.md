# Tudu — UI Component Inventory (Post-Port)

State: after Step 12 (marketing pages, docs, chrome polish).

## Route map (`frontend/src/App.tsx`)

| Path | Component | Auth |
|---|---|---|
| `/` | Landing (marketing) | public |
| `/login` | Login | public |
| `/signup` | Login with `mode="signup"` | public |
| `/auth/callback` | AuthCallback | public |
| `/pricing` | Pricing | public |
| `/billing/callback` | BillingCallback | public |
| `/` (with token) | TaskList (List view) | protected |
| `/board` | KanbanBoard | protected |
| `/stats` | PomodoroStats + TimeLog + WeeklyReport | protected |
| `/analytics` | AnalyticsDashboard (lazy) | protected |
| `/shared/:id` | SharedListView | protected |
| `/settings/account` | SettingsAccount | protected |
| `/settings/notifications` | SettingsNotifications | protected |
| `/settings/appearance` | SettingsAppearance | protected |
| `/settings/templates` | SettingsTemplates | protected |
| `/settings/integrations` | SettingsIntegrations | protected |
| `/settings/workspace` | SettingsWorkspace | protected |
| `/settings/billing` | SettingsBilling | protected |
| `/settings/license` | SettingsLicense | protected |
| `/settings/api` | SettingsApi | protected |
| `/settings/webhooks` | SettingsWebhooks | protected |
| `/demo` | ComingSoon (kept for /demo only) | public |
| `/docs` | DocsPage | public |
| `/docs/:slug` | DocsPage | public |
| `/webhooks` | DocsPage forcedSlug="webhooks" | public |
| `/changelog` | ChangelogPage | public |
| `/help` | HelpPage | public |
| `/contact` | ContactPage | public |
| `/blog` | BlogPage | public |
| `/community` | CommunityPage | public |
| `/status` | StatusPage | public |
| `/privacy` | LegalPage mode="privacy" | public |
| `/terms` | LegalPage mode="terms" | public |
| `/solutions` | Redirect to `/solutions/teams` | public |
| `/solutions/:slug` | SolutionsPage | public |

## Component map

### `components/activity/`

- `ActivityFeed.tsx` — rows of "You {verb} ... - 2 hours ago"
- `RecentActivity.tsx` — recent activity card with task/range filters
  (used in the List view)
- `TaskActivity.tsx` — per-task activity, inline in `TaskCard`

### `components/ai/`

- `AiBreakdownModal.tsx` — portal modal; generate + edit + save subtasks;
  `FeatureGate` for HD
- `CreditBadge.tsx` — remaining-credits pill, Pro-only

### `components/analytics/`

- `AnalyticsDashboard.tsx` — personal/team toggle, metric cards,
  bar/pie/line charts, CSV/JSON export
- `TeamAnalyticsView.tsx` — burndown, per-member table, per-board progress

### `components/app/` — the Shell chrome

- `Topbar.tsx` — primary nav, sync dot, pomodoro pill, timer pill,
  theme toggle, tour, settings link, profile pill, logout
- `Sidebar.tsx` — collapsible; board list, invitations, shared with me,
  shared by me, recent-activity jump
- `SidebarBoardList.tsx` — board rows grouped by workspace
- `SidebarCollapsible.tsx` — the collapsible section header
- `DetailPanel.tsx` — right-hand slide-in for task or column detail
- `TaskDetail.tsx` — TaskDetail body inside `DetailPanel`
- `ColumnSettings.tsx` — column settings inside `DetailPanel`
- `SyncDot.tsx` — small pulsing dot reflecting socket state
- `charts/Charts.tsx` — SVG bar/pie/line primitives used by analytics

### `components/auth/`

- `AuthCallback.tsx` — token to user, redirect
- `Login.tsx` — two-column split, OAuth + email; supports `mode="signup"`
- `OAuthButton.tsx` — Google / GitHub button

### `components/common/` — shared UI

- `BoardSelector.tsx` — grouped board dropdown
- `BulkActionBar.tsx` — floating selection actions
- `CheckPop.tsx` — animated green check
- `CommandPalette.tsx` — Ctrl/Cmd+K, icons per group
- `Confetti.tsx`, `ConfettiProvider.tsx` — celebrations
- `ErrorBoundary.tsx` — top-level error UI
- `FeatureGate.tsx` — entitlement check, delegates to `UpgradePrompt`
- `FilterDropdown.tsx` — labelled select
- `InstallPrompt.tsx` — PWA install banner
- `LicenseBanner.tsx` — self-hosted licensing warning
- `OfflineIndicator.tsx` — offline + sync progress pill
- `ProBadge.tsx` — small "Pro" chip
- `ProtectedRoute.tsx` — auth guard
- `SearchBar.tsx` — input with search icon
- `ShortcutHelp.tsx` — keyboard shortcut dialog
- `Spinner.tsx` — single inline spinner
- `SyncIndicator.tsx` — socket status pill (used by legacy Sidebar rows)
- `ThemeToggle.tsx` — sun/moon toggle
- `ToastContainer.tsx` — top-center toast stack
- `UndoToast.tsx` — bottom-center undo pill (10s window)
- `UpgradePrompt.tsx` — the mockup's `UpgradeCard` pattern
- `Wordmark.tsx` — theme-aware wordmark PNG

### `components/docs/`

- `DocsLayout.tsx` — left sidebar with search + docs list, highlights
  the active doc from the current path

### `components/kanban/`

- `BoardView.tsx` — dnd-kit board, multi-select move, native column drag
- `BoardColumn.tsx` — droppable column, WIP badge
- `BoardCard.tsx` — single card with hover drag handle
- `KanbanCard.tsx` — `KanbanCardBody` (also used inside DragOverlay)
- `BoardsModal.tsx` — create / rename / delete boards (link → templates)
- `BoardTaskForm.tsx` — mounts `TaskForm` on `/board`
- `PublishTemplateModal.tsx` — publish a board as a template
- `TemplateGalleryModal.tsx` — **retired**; replaced by
  `/settings/templates`. Kept in tree only as dead code.
- `logic.ts` — pure board logic (column resolution, move updates)

### `components/landing/`

The marketing page ported in Steps 3–7. Sections in order:

1. `Navbar.tsx` (mega menu + mobile drawer)
2. `Hero.tsx` (now contains `LiveBoardHero` inline)
3. `LogoStrip.tsx`
4. `ProblemSection.tsx`
5. `BentoGrid.tsx` (16 tiles)
6. `HowItWorks.tsx`
7. `UnderTheHood.tsx`
8. `TierGating.tsx`
9. `PricingSection.tsx`
10. `Changelog.tsx`
11. `SocialProof.tsx`
12. `FinalCTA.tsx`
13. `Footer.tsx` (half-in-half-out wordmark)
14. `ComingSoon.tsx` — kept for `/demo` only

### `components/marketing/`

- `MarketingShell.tsx` — Navbar + main + Footer wrapper for public
  marketing pages
- `Prose.tsx` — `H1`, `H2`, `P`, `UL`, `Code`, `Kbd` typographic primitives

### `components/onboarding/`

- `OnboardingPrompt.tsx` — welcome modal (snooze / opt out)
- `OnboardingRoot.tsx` — mounts prompt + tour
- `ProductTour.tsx` — spotlight tour with progress bar
- `TourButton.tsx` — "?" in header
- `Wizard.tsx` — first-run template picker

### `components/pomodoro/`

- `PomodoroRunner.tsx` — headless, one heartbeat for the whole app
- `PomodoroStats.tsx` — `/stats` metric cards + charts
- `PomodoroTimer.tsx`, `PomodoroTimerHeader.tsx` — running timer pill
- `StartPomodoroButton.tsx` — per-task start

### `components/settings/`

- `ConflictResolutionModal.tsx` — merge offline conflicts
- `GitHubWebhookCard.tsx` — payload URL + secret
- `PublisherSettings.tsx` — subaccount for template sales
- `PurchasesList.tsx` — buyer history + refunds

### `components/sharing/`

- `Avatar.tsx`
- `SharedListsSidebar.tsx` — **retired**; Sidebar owns these sections
  now. Kept in tree only as dead code.
- `SharedListView.tsx`
- `SharedWithMeSection.tsx`
- `ShareInvites.tsx`, `ShareInvitesList.tsx`
- `ShareModal.tsx`

### `components/tasks/` — the List view

- `TaskList.tsx` — orchestrator: filters, sort, select mode, bulk
  actions, empty state
- `TaskCard.tsx` — card layout (chips, subtask toggle, activity, timer,
  status select)
- `TaskForm.tsx` — create / edit
- `SmartTaskInput.tsx` — NLP-live title input
- `SubtaskList.tsx` — checklist with progress
- `QueryBar.tsx` — GitHub-style filter chips
- `QueryHelp.tsx` — `?` popover with operator list
- `EmptyState.tsx` — empty + filtered variants
- `SortDropdown.tsx`, `SortDirectionToggle.tsx` — URL-backed sort

### `components/templates/`

- `TemplateCard.tsx`, `TemplatePicker.tsx` — built-in catalogue
- `MarketplacePicker.tsx` — community templates (now shows author
  avatar + name)
- `MarketplaceBuyModal.tsx` — Paystack inline popup
- `EditTemplateModal.tsx` — publisher controls
- `SyncTermsChangedModal.tsx` — re-buy required

### `components/time/`

- `StartTimerButton.tsx` — per-task timer
- `Timer.tsx` — header pill
- `TimeLog.tsx` — recent entries + add
- `WeeklyReport.tsx` — hours-per-day chart

### `components/ui/`

- `BrushButton.tsx` — primary CTA with brush underline

### `components/workspace/`

- `AssigneeChip.tsx`, `WorkspaceInvites.tsx`

### `components/layout/`

- `Header.tsx` — **retired** (replaced by Topbar in Step 2).

### `pages/marketing/`

Public pages. Every one is wrapped in `MarketingShell`.

- `DocsPage.tsx` — `/docs`, `/docs/:slug`, `/webhooks`
- `ChangelogPage.tsx`
- `HelpPage.tsx`
- `ContactPage.tsx` — `mailto:` form, no fake submission
- `BlogPage.tsx`
- `CommunityPage.tsx`
- `StatusPage.tsx`
- `LegalPage.tsx` — `/privacy`, `/terms`
- `SolutionsPage.tsx` — `/solutions/freelancers|teams|enterprise`

### `lib/`

- `docsData.ts` — typed `DOCS` + `DOC_ORDER` + `findDoc` consumed by
  `DocsPage` and `DocsLayout`

## Post-port restyle summary (Steps 8–12)

| Area | Steps | What changed |
|---|---|---|
| Header | 8 | Testids, control set, palette; buttons tighter |
| List view | 9 | Chip tints, `EmptyState` variants, filter a11y |
| Dark palette | 10 | Seven `.dark` values swapped to the mockup's cool near-black family — every screen repaints |
| Marketing | 10 | Real docs / changelog / help / contact / blog / community / status / legal / solutions routes replace `ComingSoon` |
| Board view | 10 | Chip tints, `red-400` for WIP badges, count pill `bg-line-subtle` |
| Stats + Analytics | 11 | Metric card icons, chart primary colour to brand green, subtle range toggles |
| Onboarding + sharing + marketplace | 11 | Brand-tinted emoji badges, avatar pills, brush-stroke CTAs, quieter destructive links |
| Settings + Auth | 12 | Login two-column split, `amber-500` → `amber-400`, `red-500` → `red-400` |
| Shared + AI + misc | 12 | `UpgradePrompt` → mockup's `UpgradeCard` pattern, `ProBadge` compact, AI modal error panel |