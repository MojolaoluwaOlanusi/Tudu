# Tudu — UI Component Inventory (Post-Port)

State: after Step 13.

## Route map (`frontend/src/App.tsx`)

| Path | Component | Auth |
|---|---|---|
| `/` | Landing (marketing) | public |
| `/login` | Login | public |
| `/auth/callback` | AuthCallback | public |
| `/` (with token) | TaskList (List view) | protected |
| `/board` | KanbanBoard | protected |
| `/stats` | PomodoroStats + TimeLog + WeeklyReport | protected |
| `/analytics` | AnalyticsDashboard (lazy) | protected |
| `/settings/account` | (via settings modals) | protected |
| `/settings/license` | LicenseSettings | protected |
| `/settings/integrations` | IntegrationsSettings | protected |
| `/settings/billing` | BillingSettings | protected |
| `/pricing` | Pricing | public |
| `/billing/callback` | BillingCallback | public |
| `/shared/:id` | SharedListView | protected |
| `/webhooks` | Docs stub | public |

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

### `components/auth/`

- `AuthCallback.tsx` — token to user, redirect
- `Login.tsx` — two-column split, OAuth + email
- `OAuthButton.tsx` — Google / GitHub button

### `components/common/` — shared UI

- `BoardSelector.tsx`, `WorkspaceSwitcher.tsx` — board / workspace dropdowns
- `BulkActionBar.tsx` — floating selection actions
- `CheckPop.tsx` — animated green check
- `CommandPalette.tsx` — Cmd+K
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
- `SyncIndicator.tsx` — socket status pill
- `ThemeToggle.tsx` — sun/moon toggle
- `ToastContainer.tsx` — top-center toast stack
- `UndoToast.tsx` — bottom-center undo pill (10s window)
- `UpgradePrompt.tsx` — the mockup's `UpgradeCard` pattern (see
  `VISUAL_SYSTEM.md`)
- `Wordmark.tsx` — theme-aware wordmark PNG

### `components/kanban/`

- `KanbanBoard.tsx` — dnd-kit board, multi-select move
- `KanbanColumn.tsx` — droppable column, WIP badge
- `KanbanCard.tsx` — sortable card, drag handle, `AssigneeChip`,
  subtask progress
- `ColumnManager.tsx` — create / rename / reorder / delete columns
- `BoardsModal.tsx` — create / rename / delete boards
- `BoardTaskForm.tsx` — mounts `TaskForm` on `/board`
- `PublishTemplateModal.tsx`, `TemplateGalleryModal.tsx` — marketplace
- `logic.ts` — pure board logic (column resolution, move updates)

### `components/landing/`

The marketing page ported in Steps 3–7. Sections in order:

1. `Navbar.tsx` (mega menu + mobile drawer)
2. `Hero.tsx`
3. `LiveBoardHero.tsx`
4. `LogoStrip.tsx`
5. `ProblemSection.tsx`
6. `BentoGrid.tsx` (16 tiles)
7. `HowItWorks.tsx`
8. `UnderTheHood.tsx`
9. `TierGating.tsx`
10. `PricingSection.tsx`
11. `Changelog.tsx`
12. `SocialProof.tsx`
13. `FinalCTA.tsx`
14. `Footer.tsx` (half-in-half-out wordmark)

### `components/layout/`

- `Header.tsx` — sticky header, nav tabs, theme toggle, sync,
  notifications, API tokens, webhooks, tour, avatar, logout

### `components/onboarding/`

- `OnboardingPrompt.tsx` — welcome modal (snooze / opt out)
- `OnboardingRoot.tsx` — mounts prompt + tour
- `ProductTour.tsx` — spotlight tour, 18 steps
- `TourButton.tsx` — "?" in header
- `Wizard.tsx` — first-run template picker

### `components/pomodoro/`

- `PomodoroRunner.tsx` — headless, one heartbeat for the whole app
- `PomodoroStats.tsx` — `/stats` metric cards + charts
- `PomodoroTimer.tsx`, `PomodoroTimerHeader.tsx` — running timer pill
- `StartPomodoroButton.tsx` — per-task start

### `components/settings/`

- `ApiTokensModal.tsx` — token list + create (plaintext once) + revoke
- `WebhooksModal.tsx` — endpoint list + deliveries + retry
- `NotificationSettingsModal.tsx` — reminders, celebrations, push
- `ConflictResolutionModal.tsx` — merge offline conflicts
- `GitHubWebhookCard.tsx` — payload URL + secret
- `PublisherSettings.tsx` — subaccount for template sales
- `PurchasesList.tsx` — buyer history + refunds

### `components/sharing/`

- `Avatar.tsx`, `SharedListsSidebar.tsx`, `SharedListView.tsx`,
  `SharedWithMeSection.tsx`, `ShareInvites.tsx`, `ShareModal.tsx`

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
- `MarketplacePicker.tsx` — community templates
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

- `AssigneeChip.tsx`, `TeamModal.tsx`, `WorkspaceInvites.tsx`

## Post-port restyle summary (Steps 8–13)

| Area | Steps | What changed |
|---|---|---|
| Header | 8 | Testids, control set, palette; buttons tighter |
| List view | 9 | Chip tints, `EmptyState` variants, filter a11y |
| Dark palette | 10 | Seven `.dark` values swapped to the mockup's cool near-black family — every screen repaints |
| Board view | 10 | Chip tints, `red-400` for WIP badges, count pill `bg-line-subtle` |
| Stats + Analytics | 11 | Metric card icons, chart primary colour to brand green, subtle range toggles |
| Settings + Auth | 12 | Login two-column split, `amber-500` -> `amber-400`, `red-500` -> `red-400` |
| Shared + AI + misc | 13 | `UpgradePrompt` -> mockup's `UpgradeCard` pattern, `ProBadge` compact, AI modal error panel |
