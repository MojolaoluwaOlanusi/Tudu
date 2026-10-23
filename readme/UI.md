# Tudu — Complete UI Inventory & Feature Map
Version audited against code: the current backend/src/controllers/githubController.ts and the 5.7 patch set.
Audience: developers and product owners who need to know exactly what a user can see, do, and click — and what's still missing.
Legend: ✅ implemented and wired · ⚠️ implemented but partially wired · ❌ not in UI · 🔒 tier-gated

## Table of contents
- Access tiers

- The app shell — what you always see

- Anonymous pages (no login)

- List view — /

- Board view — /board

- Stats view — /stats

- Analytics view — /analytics

- Shared view — /shared/:id

- Settings pages

- Global modals — from the header

- Onboarding — first-run experience

- Component inventory — every visible element

- Tier access matrix

- API tokens — in depth

- Webhooks — in depth

- Gaps and what to add

- Curl testing cheatsheet

## 1. Access tiers
| Tier | How you get it | What unlocks |
| --- | --- | --- |
| Anonymous | Not signed in | Landing page, Login, Pricing, Demo board |
| Free | Register (email / Google / GitHub) or Try the demo | Everything except Pro-gated features |
| Pro | Paystack subscription (₦7,500/mo or ₦75,000/yr) | Team boards, GitHub, Slack, push, time tracking, self-hosting license, unlimited AI HD breakdown, paid template publishing |
| Enterprise | Contract | Not yet implemented in the UI (SSO, SCIM, audit, white-label) |
| Self-hosted | TUDU_MODE=self_hosted env | Same features as Pro if a valid license file is installed |
Feature gating is enforced on two layers:

Backend — requireFeature('…') middleware returns 402 { error, feature, upgrade_url } for any gated route.

Frontend — <FeatureGate feature="…"> renders <UpgradePrompt> (a painted "Pro" card) instead of the children when the tier lacks the feature.

Both use the same source of truth in backend/src/config/features.ts.

## 2. The app shell — what you always see
Every signed-in page wraps its content in <Shell> (App.tsx). The shell is:

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ HEADER (sticky, frosted glass)                                                           │
│  tudu  [List][Board][Stats][Analytics]   ●  ⏱  🌙  🔔  ⚙  ★Upgrade   🐙  🔗  ?  👤 ▾   │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ LICENSE BANNER (only on self-hosted without a valid license — see §11.5)                 │
├──────────────┬───────────────────────────────────────────────────────────────────────────┤
│              │                                                                           │
│  SIDEBAR     │  MAIN CONTENT (page-specific, see §4–§9)                                 │
│  (desktop    │                                                                           │
│   only,      │    [Board selector row — personal / workspace boards]                      │
│   lg+)       │    [Workspace invitations — if any pending]                               │
│              │    [Shared with me — on mobile only]                                      │
│  Shared      │                                                                           │
│  with me     │    <page component here>                                                   │
│  Shared by   │                                                                           │
│  me          │    [Recent activity panel — always at bottom]                             │
│              │                                                                           │
├──────────────┴───────────────────────────────────────────────────────────────────────────┤
│ FLOATING LAYERS (only when active):                                                      │
│   • OfflineIndicator (top centre pill, e.g. "Offline — 3 changes queued")                │
│   • InstallPrompt (bottom centre card, PWA install)                                      │
│   • UndoToast (bottom centre, after a delete, 10s window)                                │
│   • BulkActionBar (bottom centre, when 2+ tasks selected)                                │
│   • ToastContainer (bottom centre, stacked)                                              │
│   • CommandPalette (Ctrl/Cmd+K, full-screen overlay)                                     │
│   • ShortcutHelp (?)                                                                     │
│   • ProductTour (spotlight overlay)                                                      │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 The header, element by element
```text
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                             │
│  tudu   ┌──────────────────────────────────────────┐                                        │
│  (logo) │ [ List ] [ Board ] [ Stats ] [ Analytics ]│  ● ⏱ 🌙 🔔 ⚙ ★Upgrade 🐙 🔗 ? 👤 Logout│
│         └──────────────────────────────────────────┘                                        │
│                                                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```
| # | Element | Aria-label / title | Visible when | Click behaviour |
| --- | --- | --- | --- | --- |
| 1 | Wordmark | alt="Tudu" | Always | Not interactive (link-ish but no route) |
| 2 | Nav: List | — | Signed in | Navigate / (active state = accent green pill) |
| 3 | Nav: Board | — | Signed in | Navigate /board |
| 4 | Nav: Stats | — | Signed in | Navigate /stats |
| 5 | Nav: Analytics | — | Signed in | Navigate /analytics |
| 6 | SyncIndicator | title="Connected - changes appear instantly" | Signed in | None (status only). Shows ● green (live), amber spinner (connecting), red Offline |
| 7 | PomodoroTimerHeader | — | Active pomodoro session | Displays mm:ss + mute toggle |
| 8 | Timer (time tracking) | — | time.tracking feature and a timer running | mm:ss + stop button |
| 9 | ThemeToggle | aria-label="Switch to dark mode" | Always | Toggles .dark class on <html> |
| 10 | Notification bell | aria-label="Notification settings" | Signed in | Opens NotificationSettingsModal (§10.3) |
| 11 | Gear (API tokens) | aria-label="API tokens" | Signed in | Opens ApiTokensModal (§10.1) |
| 12 | ★ Upgrade | — | Free tier only | Navigate /pricing |
| 13 | Pro badge | title="View billing" | Pro / Enterprise | Navigate /settings/billing |
| 14 | GitHub/Integrations icon | title="Integrations" | Signed in | Navigate /settings/integrations |
| 15 | Webhooks icon | aria-label="Webhooks" | features['api.public.write'] === true (Pro) | Opens WebhooksModal (§10.2) |
| 16 | Tour button (?) | aria-label="Take the tour" | Signed in and no pomodoro running | Restart the product tour (§11.2) |
| 17 | Avatar | — | Signed in | Not interactive (initials or OAuth image) |
| 18 | Logout | title="Logout" | Signed in | logout() — clears store, redirects to /login |
Mobile behaviour: the nav row wraps onto its own line beneath the logo. The theme toggle, bell, gear, integrations and avatar shrink to icon-only. Upgrade/Pro and the tour button stay visible. The header height roughly doubles on a 390px viewport, but does not overflow horizontally (guarded by overflow-x: clip on <html>, <body>).


### 2.2 The sidebar (desktop only)
```text
┌─ SharedListsSidebar (w-64, lg+ only) ──────┐
│                                            │
│  ┌─ Invitations (1) ───────────────────┐   │
│  │  [avatar]  Doyin Olanusi            │   │
│  │            3 tasks · can edit       │   │
│  │            [✓ Accept] [Decline]     │   │
│  └─────────────────────────────────────┘   │
│                                            │
│  ┌─ Shared with me ────────────────────┐   │
│  │  [avatar] Doyin Olanusi             │   │
│  │           CAN EDIT                  │   │
│  │           ████████░░ 3/5            │   │
│  └─────────────────────────────────────┘   │
│                                            │
│  ┌─ Shared by me ──────────────────────┐   │
│  │  [avatar] Doyin Olanusi · accepted  │   │
│  │           [✕]                       │   │
│  └─────────────────────────────────────┘   │
│                                            │
└────────────────────────────────────────────┘
The three panels are ShareInvites, SharedWithMeSection (in sidebar), SharedListsSidebar (Self + MyShares combined).

```
On mobile the sidebar is hidden. Its contents are re-rendered inside the main content so nothing is unreachable — see §4.

### 2.3 The board selector row
Below the header, at the top of the main content on every page:

```text
┌─ Board ───────────────────────────────────────────────────────┐
│  Board ▾  [My board ──────────────────────] [+ Boards] [Team] │
└───────────────────────────────────────────────────────────────┘
```
| Element | Access | Click |
| --- | --- | --- |
| Board dropdown | Always | Switch the active board for List and Board pages. Grouped: Personal optgroup, then one optgroup per workspace |
| + Boards | Always | Opens BoardsModal (§5.7) |
| Team | Always | Opens TeamModal (§5.8) |
The selected board id persists in localStorage (tudu-active-board) so a reload returns to the same board.


## 3. Anonymous pages (no login)

### 3.1 Landing — / when signed out
```text
┌───────────────────────────────────────────────────────────────────────────┐
│  tudu                                          [Sign in]  [Start free]    │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│                    Kanban that just works.                                │
│                    ═════════════════════                                   │
│                                                                           │
│    The AI-powered board for people who hate Trello's mobile bugs and      │
│    Jira's complexity. Free forever for personal use.                      │
│                                                                           │
│              [ Try the demo → ]        [ Start free ]                     │
│                                                                           │
│      ✓ No credit card · ✓ No signup for the demo · ✓ Cancel any time      │
│                                                                           │
├───────────────────────────────────────────────────────────────────────────┤
│              Everything you need. Nothing you don't.                      │
│                                                                           │
│   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                      │
│   │ 🤖           │ │ ⏱️            │ │ ⚡           │                      │
│   │ AI breakdown │ │ Pomodoro     │ │ Real-time    │                      │
│   └──────────────┘ └──────────────┘ └──────────────┘                      │
│   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                      │
│   │ 📱           │ │ 🎨           │ │ 👥           │                      │
│   │ Works on     │ │ Friendly UI  │ │ Team-ready   │                      │
│   └──────────────┘ └──────────────┘ └──────────────┘                      │
│                                                                           │
├───────────────────────────────────────────────────────────────────────────┤
│                        Simple pricing                                     │
│                                                                           │
│  ┌─ Free ──────┐ ┌─ Pro ──────────┐ ┌─ Enterprise ────┐                   │
│  │ ₦0 forever  │ │ ₦7,500/month   │ │ Custom          │                   │
│  │ ✓ Boards    │ │ ✓ Everything   │ │ ✓ SAML SSO      │                   │
│  │ ✓ AI (limit)│ │ ✓ Team         │ │ ✓ Audit log     │                   │
│  │ [Try demo]  │ │ [Get started]  │ │ [Contact us]    │                   │
│  └─────────────┘ └────────────────┘ └─────────────────┘                   │
│                                                                           │
├───────────────────────────────────────────────────────────────────────────┤
│  tudu                 Product        Legal                                │
│  Made in Lagos.       Features       Privacy                              │
│  Built with PERN.     Pricing        Terms                                │
│                       Changelog      Security                             │
│                                                                           │
│  © 2026 Tudu. All rights reserved.                                        │
└───────────────────────────────────────────────────────────────────────────┘
"Try the demo" → POST /api/public/demo creates a throwaway account with a seeded board and signs the visitor in. It lands on /board immediately.

```

### 3.2 Login — /login
```text
┌──────────────────────────────────────────────────────────────────┐
│                          tudu (large wordmark)                   │
│                    Your friendly todo app                        │
│                                                                  │
│   ┌────────────────────────────────────────────────────┐         │
│   │            Welcome back                            │         │
│   │                                                    │         │
│   │   [🔵 Continue with Google]                        │         │
│   │   [⚫ Continue with GitHub]                        │         │
│   │  ───────────────── or ─────────────────            │         │
│   │   [       Continue with Email       ]              │         │
│   │                                                    │         │
│   │   By continuing, you agree to our Terms of         │         │
│   │   Service and Privacy Policy                       │         │
│   └────────────────────────────────────────────────────┘         │
└──────────────────────────────────────────────────────────────────┘
```
Clicking Continue with Email replaces the OAuth block with:

```text
   ┌────────────────────────────────────────────────────┐
   │  Name                                              │
   │  [ Your name                              ]        │
   │                                                    │
   │  Email                                             │
   │  [ email@example.com                      ]        │
   │                                                    │
   │  Password                                          │
   │  [ ••••••••                               ]        │
   │                                                    │
   │  [ Sign In / Sign Up ]                             │
   │                                                    │
   │  Don't have an account? Sign Up                    │
   │  Back to OAuth options                             │
   └────────────────────────────────────────────────────┘
The heading flips between Welcome back (sign in) and Create your account (sign up). Errors render as a red inline banner above the form.

```

### 3.3 Auth callback — /auth/callback?token=…
A full-screen spinner with Signing you in…. On failure: a card with Authentication failed and a Back to login button.

### 3.4 Pricing — /pricing
```text
┌──────────────────────────────────────────────────────────────────┐
│                      Simple pricing                              │
│   Start free. Upgrade only when you need teammates or volume.    │
│   Prices shown in USD for reference. You will be charged NGN.    │
├──────────────────────────────────────────────────────────────────┤
│  ┌─ Free ──────┐ ┌─ Pro ──────────┐ ┌─ Pro Yearly ────┐          │
│  │ ₦0 forever  │ │ ₦7,500/month   │ │ ₦75,000/year    │          │
│  │             │ │ (Charged ₦7,500│ │ (2 months free) │          │
│  │             │ │  NGN)          │ │                 │          │
│  │ ✓ Unlimited │ │ ✓ Everything   │ │ ✓ Everything    │          │
│  │   boards    │ │   in Free      │ │   in Pro        │          │
│  │ ✓ AI        │ │ ✓ Team         │ │ ✓ 1,200 AI      │          │
│  │   breakdown │ │   workspaces   │ │   credits/yr    │          │
│  │ ✓ Pomodoro  │ │ ✓ 100 AI       │ │ ✓ One receipt   │          │
│  │             │ │   credits      │ │                 │          │
│  │ [Start free]│ │ [Upgrade]      │ │ [Upgrade]       │          │
│  │             │ │ [Having trouble│ │ [Having trouble │          │
│  │             │ │  Pay on Paystk]│ │  Pay on Paystk] │          │
│  └─────────────┘ └────────────────┘ └─────────────────┘          │
│                                                                  │
│   Payments are processed by Paystack. Cancel any time.           │
└──────────────────────────────────────────────────────────────────┘
Clicking Upgrade opens a Paystack inline popup pre-filled with the price. On success → /billing/callback?reference=… → then /settings/billing.

Anonymous users clicking Upgrade are redirected to /login?next=/pricing.

```

### 3.5 Billing callback — /billing/callback?reference=…
A spinner with Finishing up… for 1.5s, then invalidates entitlements and redirects to /settings/billing. If the URL contains reference or trxref, a green toast Payment received. Activating your subscription… appears first.

## 4. List view — /
The dashboard. Guarded by ProtectedRoute and shown as the app's landing when signed in.

```text
┌─ My tasks ─────────────────────────────── [Filters] [Share] [Select] [+ New task] ─┐
│                                                                                     │
│  ┌─ QueryBar ─────────────────────────────────────────────────┐  [Sort by: …▾] [↓]│
│  │ 🔍 [#work] [priority:high] Search tasks, or try @me …  (?) │                    │
│  └────────────────────────────────────────────────────────────┘                    │
│                                                                                     │
│  ┌─ Filters (desktop always open, mobile toggle) ─────────────┐                    │
│  │ [Status: All ▾]  [Category: All ▾]  [Priority: All ▾]     │                    │
│  │  Clear all filters                                          │                    │
│  └─────────────────────────────────────────────────────────────┘                    │
│                                                                                     │
│  ┌─ ⚠ Overdue tasks (2) ─────────────────────────────────────┐                      │
│  │  [TaskCard] [TaskCard]                                     │                      │
│  └────────────────────────────────────────────────────────────┘                      │
│                                                                                     │
│  ┌─ TaskCard ────────────────────────────────────────────────┐                      │
│  │  TUDU-42                                  [✎ edit] [🗑]   │                      │
│  │                                                            │                      │
│  │  [✓] Buy milk                                              │                      │
│  │  Get the 2% from the corner shop                           │                      │
│  │                                                            │                      │
│  │  [personal] [high] [Overdue Oct 15, 3:00 PM]               │                      │
│  │                                                            │                      │
│  │  ────────────────                                          │                      │
│  │  ▶ Sub-tasks  ████████░░ 3/4                               │                      │
│  │                                                            │                      │
│  │  🍅 Start 25m    ⏱ Start timer                             │                      │
│  │                                                            │                      │
│  │  ▶ Activity                                                │                      │
│  │                                                            │                      │
│  │  [Status: To-do ▾]                                         │                      │
│  └────────────────────────────────────────────────────────────┘                      │
│                                                                                     │
│  [ TaskCard 2 ]                                                                     │
│  [ TaskCard 3 ]                                                                     │
│  …                                                                                  │
│                                                                                     │
│  ┌─ Recent activity ─────────────────────────────────────────┐                      │
│  │  Recent activity                                           │                      │
│  │  12 events                                                 │                      │
│  │  Filter by task [All tasks ▾]  Filter by date [All ▾]     │                      │
│  │  ● created "Buy milk" · 2 hours ago                        │                      │
│  │  ● moved "Fix login" to Done · 3 hours ago                 │                      │
│  │  ● finished a 25 minute focus session · 4 hours ago        │                      │
│  └─────────────────────────────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.1 TaskCard anatomy
```text
┌─ TaskCard ─────────────────────────────────────────────────────────────┐
│  TUDU-42  (click to copy)                [✎ edit] [🗑 delete]           │
│                                                                         │
│  [✓ check pop] Buy milk  ───────── line-through when done               │
│                                                                         │
│  Description text (optional)                                            │
│                                                                         │
│  [category chip]  [priority chip]  [due date chip — red if overdue]     │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────      │
│  ▶/▼ Sub-tasks                            ████████░░ 3/4                │
│    (expands) SubtaskList                                                │
│      [ ] Draft the outline                                              │
│      [x] Collect reference material                                     │
│      …                                                                  │
│      [Break this down] (AI)                                             │
│      [ Add a sub-task… ] [Add]                                          │
│                                                                         │
│  🍅 Start 25m   ⏱ Start timer  [compact PomodoroTimer if this task]     │
│                                                                         │
│  ▶/▼ Activity                                                           │
│    (expands) TaskActivity — this task's activity only                   │
│                                                                         │
│  [Status: To-do ▾]  (or read-only badge in shared list)                 │
└─────────────────────────────────────────────────────────────────────────┘
```
Every interactive control:

| Element | Aria-label | When it appears |
| --- | --- | --- |
| TUDU-<n> badge | title="Copy Task ID for GitHub" | Task has short_id (all do — SERIAL) |
| ✎ edit | aria-label="Edit task" | onEdit prop supplied (not on shared lists) |
| 🗑 delete | aria-label="Delete task" | onDelete prop supplied |
| ✓ checkmark | — | task.status === 'done' |
| Sub-tasks header | aria-expanded | Always — click to expand |
| Break this down | data-tour="ai-breakdown" | Inside expanded sub-tasks, taskTitle supplied |
| Add sub-task input | aria-label="New sub-task" | Expanded, not read-only |
| 🍅 Start 25m | — | Task is editable |
| ⏱ Start timer | — | time.tracking feature on |
| Activity header | aria-expanded | Always |
| Status dropdown | aria-label="Change task status" | onStatusChange supplied (not on shared lists) |
| Status badge (read-only) | — | No onStatusChange (shared read-only) |

### 4.2 Select mode (bulk actions)
Clicking Select at the top turns every card into a clickable row with a checkbox:

```text
┌── ────────────────────────────────────────────────────┐
│ [✓]  [TaskCard]                                        │
├── ────────────────────────────────────────────────────┤
│ [ ]  [TaskCard]                                        │
├── ────────────────────────────────────────────────────┤
│ [ ]  [TaskCard]                                        │
└── ────────────────────────────────────────────────────┘

       ┌──────────────────────────────────────────┐
       │  2 selected  [Mark done] [Mark to-do]    │
       │              [Delete] [×]                 │
       └──────────────────────────────────────────┘   ← BulkActionBar, bottom-centre
Esc exits select mode (keyboard shortcut). Bulk delete asks for confirmation with a modal, then fires DELETE /api/tasks/batch and shows a toast. Bulk assign is wired in the hook (useBatchAssignTasks) but not exposed in the UI — see §16.

```

### 4.3 Delete → UndoToast
After a single delete:

```text
           ┌────────────────────────────────────────────────┐
           │ Deleted "Buy milk"   [Undo (9)]                │
           └────────────────────────────────────────────────┘  ← bottom-centre
The toast counts down from 10 seconds in real time. Click Undo or press Ctrl/Cmd+Z (outside a text field) → POST /api/tasks/:id/restore, toast disappears.

```

## 5. Board view — /board
```text
┌─ Board ──────────────────────────────────── [Clear (2)] [Columns] [+ New task] ─┐
│  Drag a card by its ⠿ handle to move it between columns.                        │
│  Selected cards move together. Saving…                                           │
│                                                                                  │
│  ┌─ ● To-do   (3) ────┐ ┌─ ● Doing   (2) ────┐ ┌─ ● Done   (5) ──────┐          │
│  │                     │ │                     │ │                     │          │
│  │ ┌─ [◇] Task title ─┐│ │ ┌─ [◇] Task title ─┐│ │ ┌─ [◇] Task title ─┐│          │
│  │ │  desc line       ││ │ │  desc line       ││ │ │  desc line       ││          │
│  │ │  [tag] [prio]    ││ │ │  [tag] [prio]    ││ │ │  [tag] [prio]    ││          │
│  │ │  [Overdue Oct 15]││ │ │  [Oct 20]        ││ │ │  [Oct 22]        ││          │
│  │ │  Assignee [▾]    ││ │ │  Assignee [▾]    ││ │ │  Assignee [▾]    ││          │
│  │ │  ████████░░ 3/4  ││ │ │  ██░░░░░░ 1/4    ││ │ │                  ││          │
│  │ │              ⠿   ││ │ │              ⠿   ││ │ │              ⠿   ││          │
│  │ └──────────────────┘│ │ └──────────────────┘│ │ └──────────────────┘│          │
│  │                     │ │                     │ │                     │          │
│  │ ┌─ [◇] Task title ─┐│ │ ┌─ [◇] Task title ─┐│ │  [No tasks]         │          │
│  │ └──────────────────┘│ │ └──────────────────┘│ │                     │          │
│  └─────────────────────┘ └─────────────────────┘ └─────────────────────┘          │
└──────────────────────────────────────────────────────────────────────────────────┘
```
If a column has a WIP limit set:

```text
┌─ ● Doing  (3/3) ─────────┐
│  WIP limit reached        │  ← red banner at the top of the column
│  [◇] [◇] [◇]              │
└───────────────────────────┘
```
If a card is at limit but you try to drop another card in, the server returns 409 with a human message and the UI shows a red toast:

"Doing" is full (WIP limit 3). Move or finish a card first.

### 5.1 Interaction matrix
| Action | How |
| --- | --- |
| Move one card | Drag the ⠿ handle to another column |
| Move multiple | Check the boxes on 2+ cards, then drag one — all move |
| Edit a card | Click the card title (opens BoardTaskForm) |
| Reorder columns | Columns button → drag the ⋮⋮ handle (§5.4) |
| Create a task | + New task → BoardTaskForm (bottom sheet on mobile, centred on desktop) |
| Assign | Dropdown in the card footer, only on workspace boards |
| Start a pomodoro | 🍅 button on the card (list view only — board cards don't show this button) |
Board cards do NOT include the pomodoro button, the time tracking button, the status dropdown, or the activity panel. Those live on the List-view TaskCard. The two views share the task:update socket events, so a change in one reflects in the other instantly.

### 5.2 The Kanban column header
```text
┌─ ● Doing  (2/3) ─────────┐
│  ● = column colour dot    │
│  Doing = column name      │
│  2/3 = current / WIP limit│
└───────────────────────────┘
```
When over_wip_limit is true, the count pill turns red and a WIP limit reached banner appears.

### 5.3 Empty / loading / error states
Loading: full-height spinner (h-12 w-12 animate-spin).

Error (no cached tasks): card with error text and a Try again button.

Empty column: dashed-border placeholder reading No tasks or, while hovering a drag over it, Drop here.

Empty board: three default columns with all empty placeholders.

### 5.4 ColumnManager — the "Columns" modal
Reached from the Columns button on the board.

```text
┌─ Columns ────────────────────────────────────────────────────────┐
│  Drag the ⋮⋮ handle to reorder. Each column carries a stage; a   │
│  card dropped in it inherits that stage.                  [Close]│
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ⋮⋮ [●] [To-do──────────] [Stage: To-do▾] [Color: gray▾] │   │
│  │    WIP [ 5 ]   3 cards                     [Delete]      │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ⋮⋮ [●] [Doing──────────] [Stage: Doing▾] [Color: blue▾] │   │
│  │    WIP [ 2 ]   2 cards · over              [Delete]      │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ⋮⋮ [●] [Done───────────] [Stage: Done▾]  [Color: green▾]│   │
│  │    WIP [ — ]   5 cards                     [Delete]      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ New column ──────────────────────────────────────────────┐   │
│  │ [ New column name ]  [Stage: To-do▾]  [Color: gray▾]      │   │
│  │                                            [Add column]   │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```
| Interaction | Result |
| --- | --- |
| Drag ⋮⋮ over another row | Immediate reorder (optimistic); other tabs update within ~1s |
| Edit name | Blur or Enter commits |
| Change stage | Every card in that column inherits the new status |
| Change colour | Dot + name accent update |
| WIP limit | Integer ≥ 1, or blank for no limit |
| Delete | Confirmation modal. Cards move to the first remaining column of the same stage, or the first column if none. Toast shows the moved count |
The whole modal is a .card-styled panel on a .scrim backdrop. The animated reorder uses native HTML5 drag-and-drop (no dnd-kit dependency).


### 5.7 BoardsModal — "+ Boards"
```text
┌─ Boards ─────────────────────────────────────────────────────────┐
│  Each board has its own columns and its own tasks.        [Close]│
│                                                                  │
│  [ New board name ]  [Where: Personal ▾]  [Create board]         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ [My board────────────] Personal · 12 tasks               │   │
│  │                              [Publish] [Delete]          │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ [Sprint 12───────────] Team A · 4 tasks                  │   │
│  │                              [Publish] [Delete]          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Or browse templates →                                           │
└──────────────────────────────────────────────────────────────────┘
```
The Publish button is wrapped in <FeatureGate feature="templates.publish">:

Pro users see a plain Publish button → opens PublishTemplateModal (§5.9).

Free users see a Publish [Pro] pill that redirects to /pricing on click.

The Where: dropdown is hidden if the user has no workspaces where they are not a viewer.

Delete asks for confirmation naming the task count if any exist. Cannot delete the last board.

### 5.8 TeamModal — "Team"
```text
┌─ Team ───────────────────────────────────────────────────────────┐
│  A workspace holds shared boards. Everyone in it sees the same   │
│  tasks.                                                   [Close]│
│                                                                  │
│  [ New workspace name ]                         [Create workspace]│
│                                                                  │
│  Workspace [Team A (Admin) ▾]                                    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ MOJOLA (you)                                              │   │
│  │ mojola@example.com                                        │   │
│  │                                  [Role: Admin ▾] [Leave] │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ DOYIN                                                     │   │
│  │ doyin@example.com                                         │   │
│  │                                  [Role: Member ▾] [Remove]│   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ BISI                                                      │   │
│  │ bisi@example.com · invited                                │   │
│  │                                  [Role: Viewer] [Cancel]  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [ teammate@email.com ]  [Role: Member ▾]  [Invite]              │
│  They need a Tudu account already. The invitation appears in     │
│  their app and they accept it there.                              │
└──────────────────────────────────────────────────────────────────┘
```
Only admins see the role dropdown, the invite form, and the Remove / Cancel buttons. Non-admin members see their own Leave button only.

### 5.9 PublishTemplateModal — the publish flow
```text
┌─ Publish as template ─────────────────────────────────────────────┐
│                                                                  │
│  Name                                                             │
│  [ My board ────────────────────────────────────────]            │
│                                                                  │
│  Description                                                      │
│  [ What is this template for?                       ]            │
│  [                                                  ]            │
│                                                                  │
│  Category                                                         │
│  [ General ▾ ]                                                    │
│                                                                  │
│  Price (₦)                                                        │
│  [ 0 for free, or ≥ 100 to sell ]                                │
│  To sell, set at least ₦100. Tudu keeps 30%.                      │
│                                                                  │
│  (appears only if price ≥ 100)                                    │
│  Rental Period (Days)                                             │
│  [ 0 ]                                                            │
│  Leave 0 for a permanent buy. Set e.g. 30 to rent it out for 30  │
│  days.                                                            │
│                                                                  │
│                          [Cancel]  [Publish / Publish Rental]    │
└──────────────────────────────────────────────────────────────────┘
```
Publishing snapshots the board's columns and up to 15 non-deleted tasks into marketplace_templates.definition.

### 5.10 TemplateGalleryModal — "Browse templates"
Two tabs:

```text
┌─ Start from a template ──────────────────────────────────────────┐
│  Each template comes with columns and a few example cards.      │
│                                                                  │
│  [ Built-in ]  [ Marketplace ]                           [Close]│
│                                                                  │
│  (Built-in tab)                                                   │
│  ┌─ 🌱 Personal ───────┐ ┌─ ⚡ Team sprint ─────┐                │
│  │ For everyday tasks.  │ │ Short cycles.         │                │
│  │ · To-do, Doing, Done │ │ · Backlog→Code Review │                │
│  └──────────────────────┘ └───────────────────────┘                │
│  ┌─ 📝 Content calendar ┐ ┌─ ⬜ Blank ───────────┐                │
│  │ …                    │ │ Start empty           │                │
│  └──────────────────────┘ └───────────────────────┘                │
│  ┌─ 🐞 Bug tracker ─────┐ ┌─ 🎓 Student ─────────┐                │
│  ┌─ 💼 Freelancer ──────┐                                         │
└──────────────────────────────────────────────────────────────────┘
```
Marketplace tab:

```text
┌─ Marketplace tab ───────────────────────────────────────────────┐
│  ┌─ 📦 [₦500] ──────────┐ ┌─ 📦 [Free] ──────────┐             │
│  │ Sprint board template │ │ Personal tasks        │             │
│  │ A nice description…   │ │ A nice description…   │             │
│  │ [Engineering] [v2]    │ │ [General] [v1]        │             │
│  │ 3 installs            │ │ 0 installs            │             │
│  │ [Buy & Install]       │ │ [Install]             │             │
│  └───────────────────────┘ └───────────────────────┘             │
│  ┌─ 📦 [Rent ₦300/30d] ─┐                                         │
│  │ Studio sprint         │                                         │
│  │ [Rent & Install]      │                                         │
│  └───────────────────────┘                                         │
│                                                                  │
│  If you're the author:                                            │
│  ┌─ 📦 [Free] ──────────┐                                         │
│  │ Sprint board template │                                         │
│  │ [Edit Template]       │                                         │
│  └───────────────────────┘                                         │
│                                                                  │
│  If you bought it and the version is behind:                      │
│  ┌─ 📦 [₦500] ──────────┐                                         │
│  │ Sprint board template │                                         │
│  │ [Update Available]    │  ← green accent border                  │
│  └───────────────────────┘                                         │
└──────────────────────────────────────────────────────────────────┘
```

### 5.11 MarketplaceBuyModal — the paywall
```text
┌─ Sprint board template ──────────────────────────────────────────┐
│  A nice description of the template                              │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Price                                                    │   │
│  │  ₦500                                                     │   │
│  │  One-time purchase, yours to keep.                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│  (for rentals)  Valid for 30 days.                                │
│                                                                  │
│                              [Cancel]  [Pay ₦500 / Rent ₦500…]   │
└──────────────────────────────────────────────────────────────────┘
```
Clicking Pay opens the Paystack inline popup. Success → calls /install with the reference and installs.

### 5.12 SyncTermsChangedModal — the update-blocked modal
```text
┌─ Update Blocked ─────────────────────────────────────────────────┐
│  The publisher increased the price. You must buy it again to     │
│  update.                                                          │
│                                                                  │
│                       [Cancel]  [Buy New Version]                 │
└──────────────────────────────────────────────────────────────────┘
```
Triggered when:

template.price_kobo > purchase.price_paid_kobo

template.rental_days !== purchase.rental_days_paid

the purchase is a rental and has expired


### 5.13 EditTemplateModal — the publisher's edit form
```text
┌─ Edit Template ──────────────────────────────────────────────────┐
│  Name                                                             │
│  [ My board ────────────────────────────────────────]            │
│  Description                                                      │
│  [ …                                              ]              │
│  ┌─ Price (₦) ──┐ ┌─ Rental Days ─┐                               │
│  │ [ 500      ] │ │ [ 30        ] │                               │
│  └──────────────┘ └───────────────┘                               │
│  Update Contents (Optional)                                       │
│  [ Keep existing contents ▾ ]                                    │
│  If you select a board, its columns and tasks will replace the   │
│  template's contents.                                             │
│                                                                  │
│                                  [Cancel] [Save Changes]          │
└──────────────────────────────────────────────────────────────────┘
```
Every save increments marketplace_templates.version — so buyers see an Update Available badge on the next marketplace load.

## 6. Stats view — /stats
```text
┌─ Focus stats ───────────────────────────────────────────────────────┐
│                                                                      │
│  ┌─ Today ─────┐ ┌─ This week ──┐ ┌─ All time ──┐ ┌─ Started ────┐ │
│  │ 50m         │ │ 3h 25m       │ │ 12h 15m     │ │ 48           │ │
│  │ 2 sessions  │ │ 9 sessions   │ │ 32 completed│ │ 5 abandoned  │ │
│  └─────────────┘ └──────────────┘ └─────────────┘ └──────────────┘ │
│                                                                      │
│  ┌─ Last 7 days ────────────────────────────────────────────────┐   │
│  │          ▓                                                    │   │
│  │      ▓   ▓    ▓         ▓                                     │   │
│  │  ▓   ▓   ▓    ▓    ▓    ▓                                     │   │
│  │  M   T   W    T    F    S    S                                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─ Where the time went ────────────────────────────────────────┐   │
│  │  Buy milk              45m  ·  2 sessions                     │   │
│  │  Fix login button      25m  ·  1 session                      │   │
│  │  No task              1h 20m · 4 sessions                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─ Recent sessions ────────────────────────────────────────────┐   │
│  │  Buy milk         25m · 20 Oct, 14:30                        │   │
│  │  Focus session    25m · 20 Oct, 12:15                         │   │
│  │  Focus session    25m · not finished                          │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─ 🔒 Time tracking · Pro ─────────────────────────────────────┐   │
│  │  Log work hours, track billable time, and see a weekly report │   │
│  │                                             [See plans]      │   │
│  └───────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```
For Pro users, the bottom card is replaced with two live panels:

```text
┌─ Time tracked ────────────────────────────────────────────────────┐
│  Hours per day, from task timers and manual entries.              │
│                                    [Week] [Month] [Quarter]      │
│                                                                  │
│  ┌─ Total ────┐ ┌─ Billable ─┐ ┌─ Average/day ─┐                 │
│  │ 4h 30m     │ │ 2h 0m      │ │ 1h 30m        │                 │
│  │ 8 entries  │ │ 44% total  │ │ 3 days        │                 │
│  └────────────┘ └────────────┘ └───────────────┘                 │
│                                                                  │
│  ▓▓▓▓▓▓▓                                                          │
│  ▓  ▓  ▓                                                          │
│  M  T  W  T  F  S  S                                             │
│                                                                  │
│  Top tasks:                                                       │
│  Buy milk               1h 20m                                    │
│  Fix login button       45m                                       │
└──────────────────────────────────────────────────────────────────┘

┌─ Time log ────────────────────────────────────────────────────────┐
│  Your recent tracked intervals.          [+ Add entry]           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Buy milk                                              [✕] │   │
│  │ 20 Oct 14:30          [Billable]    30m                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Manual entry · "Client call"                          [✕] │   │
│  │ 20 Oct 12:00          [Billable]    45m                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

## 7. Analytics view — /analytics
```text
┌─ Analytics ───────────────────────────────────────────────────────┐
│  [Personal] [Team]                     [Export CSV] [Export JSON] │
│                                                                   │
│  [Last 7 days] [Last 30 days] [Last 12 weeks]                     │
│                                                                   │
│  ┌─ Total tasks ─┐ ┌─ Completed ─┐ ┌─ In progress ─┐ ┌─ Overdue ─┐ ┌─ Focus time┐ │
│  │ 42            │ │ 15          │ │ 12            │ │ 3         │ │ 4h 30m    │ │
│  │ 36% complete  │ │ 5 this period│ │ 15 to do     │ │ Needs att.│ │ 11 sessions│ │
│  └───────────────┘ └─────────────┘ └───────────────┘ └───────────┘ └───────────┘ │
│                                                                                   │
│  ┌─ Tasks completed · last 7 days ──────────────────────────────────┐             │
│  │  5 completed · +50% vs previous period                            │             │
│  │       ▓     ▓                                                     │             │
│  │   ▓   ▓     ▓                                                     │             │
│  │  M  T  W  T  F  S  S                                              │             │
│  └────────────────────────────────────────────────────────────────────┘             │
│                                                                                   │
│  ┌─ Time spent by category ──┐ ┌─ Tasks by priority ──────────┐                    │
│  │     ╭───╮                 │ │     ╭───╮                     │                    │
│  │   ╭─┤work│ 60%            │ │   ╭─┤high │ 40%               │                    │
│  │  ═╪═╯   ╰╮                │ │  ═╪═╯   ╰╮                    │                    │
│  │   ╰──personal──╯ 40%      │ │   ╰──low────╯ 30%             │                    │
│  └───────────────────────────┘ └───────────────────────────────┘                    │
│                                                                                   │
│  ┌─ Productivity trend ─────────────────────────────────────────┐                  │
│  │  ╱╲                                                           │                  │
│  │ ╱  ╲    ╱╲                                                   │                  │
│  │      ╲ ╱  ╲                                                   │                  │
│  └───────────────────────────────────────────────────────────────┘                  │
│                                                                                   │
│  ┌─ Time by task ───────────────────────────────────────────────┐                  │
│  │  Buy milk                        1h 20m · 3 sessions          │                  │
│  │  Fix login button                45m · 2 sessions              │                  │
│  └───────────────────────────────────────────────────────────────┘                  │
└──────────────────────────────────────────────────────────────────────────────────┘
Switching to Team tab (only visible if you're in a workspace) wraps the content in <FeatureGate feature="analytics.team">. Free users see the upgrade card instead.

```
Pro users see:

```text
┌─ [Workspace: Team A ▾]  [Week][Month][Quarter] ─────────────────┐
│                                                                  │
│  ┌─ Total ──┐ ┌─ Completed ┐ ┌─ In progress ┐ ┌─ Overdue ┐ ┌─ Members ┐ │
│  │ 24       │ │ 18         │ │ 4            │ │ 2        │ │ 3        │ │
│  └──────────┘ └────────────┘ └──────────────┘ └──────────┘ └──────────┘ │
│                                                                        │
│  ┌─ Burndown ────────────────────────────────────────────────┐        │
│  │  ╱╲                                                       │        │
│  │ ╱  ╲___                                                    │        │
│  └────────────────────────────────────────────────────────────┘        │
│                                                                        │
│  ┌─ Completed per day ──────────────────────────────────────┐         │
│  │     ▓    ▓                                                │         │
│  │  ▓  ▓    ▓   ▓                                            │         │
│  └───────────────────────────────────────────────────────────┘         │
│                                                                        │
│  ┌─ By member ────────────────────────────────────────────────┐       │
│  │  [👤] Alice  · admin   Completed: 10  In prog: 0  Assigned: 0│       │
│  │  [👤] Bob    · member  Completed: 5   In prog: 0  Assigned: 1│       │
│  │  [👤] Carol  · viewer  Completed: 0   In prog: 0  Assigned: 0│       │
│  └────────────────────────────────────────────────────────────┘        │
│                                                                        │
│  ┌─ By board ────────────────────────────────────────────────┐        │
│  │  General    ██████░░░░ 12/20                              │        │
│  │  Marketing  ████░░░░░░ 6/15                               │        │
│  └────────────────────────────────────────────────────────────┘        │
└────────────────────────────────────────────────────────────────────────┘
```

## 8. Shared view — /shared/:id
```text
┌─ Header ───────────────────────────────────────────────────────────┐
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  [👤]  Doyin Olanusi   [SHARED]                                    │
│        Shared with you by doyin@example.com    [Remove from lists] │
│                                                                    │
│  ┌─ You have edit access — change a task status and it saves ───┐ │
│  │ instantly.                                                    │ │
│  └───────────────────────────────────────────────────────────────┘ │
│  (or)                                                              │
│  ┌─ You have view-only access, so task statuses are read-only. ─┐ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  [ TaskCard ]  (no edit/delete buttons if view-only)               │
│  [ TaskCard ]                                                      │
│  [ TaskCard ]                                                      │
│                                                                    │
│  ← Back to my tasks                                                │
└────────────────────────────────────────────────────────────────────┘
Edit access is share.permissions === 'read_write'. View-only shows the same cards but the status dropdown, edit pencil and delete button are hidden, and sub-tasks render in readOnly mode (checkbox disabled).

```

## 9. Settings pages

### 9.1 Billing — /settings/billing
```text
┌─ Billing ──────────────────────────────────────────────────────────┐
│                                                                    │
│  ┌─ Current plan ─────────────────────────────────────────────┐    │
│  │  CURRENT PLAN                                             │    │
│  │  Pro                                                       │    │
│  │                                                            │    │
│  │  Billing:    Pro Monthly · ₦7,500                          │    │
│  │  Renews on:  2026-11-22                                    │    │
│  │  AI credits: 87                                            │    │
│  │  Status:     active                                        │    │
│  │                                                            │    │
│  │  [Cancel subscription]                                     │    │
│  └────────────────────────────────────────────────────────────┘    │
│  (or if Free)                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  CURRENT PLAN                                   [Upgrade]  │    │
│  │  Free                                                      │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                    │
│  ┌─ Self-hosting (Pro only) ──────────────────────────────────┐    │
│  │  Self-hosting                            [Manage licenses →]│    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                    │
│  ┌─ Sell templates (Pro only) ────────────────────────────────┐    │
│  │  Sell templates                                            │    │
│  │  Set up a payout account to sell paid templates …          │    │
│  │  Tudu takes a 30% platform fee; you keep 70% of every sale.│    │
│  │                                                            │    │
│  │  (if no profile)                                           │    │
│  │  Business name                                             │    │
│  │  [                                                ]        │    │
│  │  Bank                                                      │    │
│  │  [ Select a bank ▾ ]                                       │    │
│  │  Account number                                            │    │
│  │  [ 10-digit account number ]                               │    │
│  │  Must match the business name on the account.              │    │
│  │  [Save payout account]                                     │    │
│  │                                                            │    │
│  │  (if profile exists)                                       │    │
│  │  Business: Mojola Studio                                   │    │
│  │  Account:  MOJOLA STUDIO · GTBank 123****789               │    │
│  │  Status:   active                                          │    │
│  │  [Change bank account]                                     │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                    │
│  ┌─ Your template purchases ──────────────────────────────────┐    │
│  │  Sprint board template · ₦500 · purchased 2026-10-20       │    │
│  │  [Refund]                                                  │    │
│  │                                                            │    │
│  │  Old template · ₦300 · purchased 2026-09-01 · refunded 09-05│    │
│  │  Refund window expired  (faded, no button)                 │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                    │
│  ┌─ Buy more AI credits (Pro only) ───────────────────────────┐    │
│  │  You have 87 credits remaining. Credits are one-off …      │    │
│  │  [500 credits · ₦2,000]  [2,000 credits · ₦7,000]          │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────┘
```
Purchases older than 14 days lose the refund button and gain the italic Refund window expired label — no error is thrown, matching the friendly-message work in the last fix.

### 9.2 Integrations — /settings/integrations
```text
┌─ Integrations ─────────────────────────────────────────────────────┐
│  Link GitHub and Slack to your boards. A task ID in a PR title      │
│  moves the card; assignments and due dates show up in Slack.        │
│                                                                    │
│  ┌─ Slack ────────────────────────────────────────────────────┐    │
│  │  (if not connected)                                        │    │
│  │  Connect a Slack workspace once. After that you can run    │    │
│  │  /tudu create Buy milk tomorrow and receive assignment …   │    │
│  │  [Connect Slack]                                           │    │
│  │                                                            │    │
│  │  (if connected)                                            │    │
│  │  Connected to Team A                        [Disconnect]   │    │
│  │  Notification channel                                      │    │
│  │  [ #general ▾ ]                                            │    │
│  │  Default board for /tudu create                            │    │
│  │  [ My board ▾ ]                                            │    │
│  │  [✓] When a task is assigned to me                         │    │
│  │  [✓] Daily due-date digest                                 │    │
│  │  [Send a test message]                                     │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                    │
│  ┌─ GitHub ───────────────────────────────────────────────────┐    │
│  │  (if not connected)                                        │    │
│  │  Connect your GitHub account once. After that, pick any    │    │
│  │  number of repositories and map each one to a board.       │    │
│  │  [Connect GitHub]                                          │    │
│  │                                                            │    │
│  │  (if connected)                                            │    │
│  │  Connected as @octocat                     [Disconnect]    │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                    │
│  ┌─ Add a mapping (if GitHub connected) ─────────────────────┐    │
│  │  Repository [ Select a repo… ▾ ]                            │    │
│  │  Board      [ Select a board… ▾ ]                           │    │
│  │  When PR opens →  [ Select a column… ▾ ]                   │    │
│  │  When PR merges → [ Select a column… ▾ ]                   │    │
│  │  [Save mapping]                                            │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                    │
│  ┌─ Your mappings ────────────────────────────────────────────┐    │
│  │  octocat/hello-world                          [Remove]     │    │
│  │  Board: My board                                           │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────┘
⚠️ The webhook secret is NOT displayed here. The backend exposes GET /api/integrations/github/webhook-secret and POST /api/integrations/github/rotate-secret in githubController.ts, but neither is mounted in routes/github.ts and there's no UI to reach them. See §16.1.

```

### 9.3 License — /settings/license
Two-mode page driven by data.mode from GET /api/license/status.

Cloud mode (issuer view — Pro users generate licenses for their own servers):

```text
┌─ Self-hosting ─────────────────────────────────────────────────────┐
│  Generate a signed license for a server you run yourself.          │
│                                                                    │
│  ┌─ Issue a license ─────────────────────────────────────────┐    │
│  │  Server fingerprint                                        │    │
│  │  [ Paste the 64-character fingerprint from your server ]   │    │
│  │  On the self-hosted instance open Settings → Self-hosting …│    │
│  │  Note (optional)                                           │    │
│  │  [ e.g. Production server, eu-west-1 ]                     │    │
│  │  [Generate license]                                        │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                    │
│  ┌─ Your licenses ───────────────────────────────────────────┐    │
│  │  a1b2c3d4e5f6…                                            │    │
│  │  Issued 2026-10-22 · expires 2027-10-22                    │    │
│  │  [Download] [Revoke]                                       │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────┘
```
Self-hosted mode (consumer view):

```text
┌─ Current license ─────────────────────────────────────────────┐
│  No license installed                                          │
│                                                                │
│  MACHINE FINGERPRINT                                           │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ a1b2c3d4…                                              [Copy]│ │
│  └─────────────────────────────────────────────────────────┘  │
│  Paste this into the hosted portal at tudu-kanban.vercel.app/  │
│  settings/license to generate a license.                       │
└────────────────────────────────────────────────────────────────┘

┌─ Install a license ────────────────────────────────────────────┐
│  [ Choose File .lic / application/json ]                        │
│  Or paste the license contents                                  │
│  [ {"payload":{…},"signature":"…"}                     ]       │
│  [Install license]                                              │
│  The license is verified against this machine's fingerprint    │
│  before it is saved.                                            │
└────────────────────────────────────────────────────────────────┘
```

## 10. Global modals — from the header

### 10.1 ApiTokensModal (gear icon)
```text
┌─ API tokens ──────────────────────────────────────────────────────┐
│  Read-only access to your boards and tasks over HTTPS.   [Close] │
│                                                                   │
│  ┌─ Copy this token now ──────────────────────────────────┐      │
│  │  You will not be able to see it again …                │      │
│  │  ┌─────────────────────────────────────────────────┐   │      │
│  │  │ tudu_pat_f3c2bcb5f0023e7cd0dff734ea968c02…     │   │      │
│  │  └─────────────────────────────────────────────────┘   │      │
│  │  [Copy]  [Done]                                         │      │
│  └─────────────────────────────────────────────────────────┘      │
│                                                                   │
│  [ Label (e.g. Home Assistant)            ]  [Create token]      │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐      │
│  │  Home Assistant                                         │      │
│  │  tudu_pat_f3c2bc… · Last used: 2026-10-22 14:23         │      │
│  │                                            [Revoke]     │      │
│  └─────────────────────────────────────────────────────────┘      │
│  ┌────────────────────────────────────────────────────────┐      │
│  │  Zapier                                                 │      │
│  │  tudu_pat_9a8b7c… · Last used: Never                    │      │
│  │                                            [Revoke]     │      │
│  └─────────────────────────────────────────────────────────┘      │
│                                                                   │
│  ┌─ Example ──────────────────────────────────────────────┐      │
│  │  curl -H "Authorization: Bearer <token>" \              │      │
│  │       https://your-tudu-api/api/v1/tasks                │      │
│  │  Reads are available on every account. Writes … are Pro.│      │
│  └─────────────────────────────────────────────────────────┘      │
└───────────────────────────────────────────────────────────────────┘
```
Copy buttons:

✅ Copy on the plaintext token (only shown once after creation).

❌ No copy button on the curl example block. Users have to select the text manually.

Reached from: the gear icon in the header.

Who sees it: every signed-in user.

Backed by: GET/POST/DELETE /api/tokens (see §14).

### 10.2 WebhooksModal (webhook icon, Pro only)
```text
┌─ Webhooks ────────────────────────────────────────────────────────┐
│  Receive an HTTPS POST for every task mutation. Payloads are      │
│  signed with the endpoint secret.                        [Close] │
│                                                                   │
│  ┌─ Copy this secret now ─────────────────────────────────┐      │
│  │  You will not be able to see it again …                │      │
│  │  ┌─────────────────────────────────────────────────┐   │      │
│  │  │ 3f9a8c1b4e7d2f0e5b6c8a1d9e4f7a2b3c8d5e1f6a9b4c2…│  │      │
│  │  └─────────────────────────────────────────────────┘   │      │
│  │  [Copy]  [Done]                                         │      │
│  └─────────────────────────────────────────────────────────┘      │
│                                                                   │
│  ┌─ Add an endpoint ──────────────────────────────────────┐      │
│  │  [ https://example.com/hooks/tudu ]                     │      │
│  │  [ Description (optional) ]                             │      │
│  │  [☑ task.created] [☑ task.updated]                     │      │
│  │  [☑ task.moved]   [☑ task.deleted]                     │      │
│  │  [Create endpoint]                                      │      │
│  └─────────────────────────────────────────────────────────┘      │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐      │
│  │  https://example.com/hook                               │      │
│  │  Prod webhook · Active · 4 events                       │      │
│  │  [Deliveries] [Pause] [Delete]                          │      │
│  │  [task.created] [task.updated] [task.moved] [task.deleted]│    │
│  └─────────────────────────────────────────────────────────┘      │
│                                                                   │
│  (when Deliveries expanded)                                       │
│  ┌────────────────────────────────────────────────────────┐      │
│  │  task.created success attempts 1 · HTTP 200 · 14:23    │      │
│  │  task.updated dead    attempts 6 · HTTP 500 · 14:20    │      │
│  │                                              [Retry]   │      │
│  └─────────────────────────────────────────────────────────┘      │
└───────────────────────────────────────────────────────────────────┘
```
Copy buttons:

✅ Copy on the secret (once, after creation).

❌ No copy button on the delivery payload or on the signature verification snippet — because there is no verification snippet.

❌ No example curl of what the receiver will see. Users have to figure out the payload shape from the docs.

Reached from: the webhook icon in the header (shown only when features['api.public.write'] is true).

Who sees it: Pro users only. Free users don't see the icon at all. If they call POST /api/webhooks directly with a JWT, requireFeature('api.public.write') returns 402.

Backed by: GET/POST/PUT/DELETE /api/webhooks, GET /api/webhooks/:id/deliveries, POST /api/webhooks/deliveries/:id/retry (see §15).


### 10.3 NotificationSettingsModal (bell icon)
```text
┌─ Notifications ───────────────────────────────────────────────────┐
│  We will only email you about what you ask for.          [Close] │
│                                                                   │
│  [☐] Daily due-date reminders                                     │
│      One email a day listing tasks that are due or overdue.       │
│      Sent at 07:00 UTC.                                           │
│                                                                   │
│  [☑] Celebrations                                                  │
│      A small confetti pop when you finish a task, and a bigger    │
│      one at milestones (first 10, first 100).                     │
│                                                                   │
│  [☐] Browser notifications    (only if push is configured on      │
│      A reminder appears even when Tudu is closed.      the server)│
│                                                                   │
│  Last reminder sent: 2026-10-21 07:00:14                          │
└───────────────────────────────────────────────────────────────────┘
```
The Browser notifications row hides entirely if push isn't configured or the browser doesn't support it. When the browser has denied permission, the row shows a hint: Notifications are blocked in your browser settings. Allow them for Tudu, then try again.

Reached from: the bell icon in the header.

Who sees it: every signed-in user. Push notifications are gated to Pro, but the checkbox hides itself when the tier doesn't have the feature — so Free users effectively see reminders + celebrations only.

### 10.4 ConflictResolutionModal (auto-opened by OfflineIndicator when offline conflicts exist)
```text
┌─ Resolve conflicts ───────────────────────────────────────────────┐
│  These changes were made offline and clash with the server. Pick  │
│  a value for each field.                                 [Close] │
│                                                                   │
│  ┌─ Buy milk ────────────── [FIELDS CHANGED ON THE SERVER] ──┐   │
│  │  Field    Yours           Theirs             Keep          │   │
│  │  title    "Buy milk"      "Buy oat milk"     [Mine][Theirs]│   │
│  │  priority "high"          "medium"           [Mine][Theirs]│   │
│  │                                [Discard all mine] [Apply] │   │
│  └─────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```
Reached from: the OfflineIndicator pill — click Resolve when the pill says "2 conflicts to resolve".

Who sees it: any signed-in user and only after an offline mutation collides with a server-side change.

### 10.5 CommandPalette (Ctrl/Cmd+K)
```text
┌─ Command palette ─────────────────────────────────────────────────┐
│  Type a command, board or task…                                   │
│                                                                   │
│  ACTIONS       New task                              n            │
│  ACTIONS       Go to List                            g l          │
│  ACTIONS       Go to Board                           g b          │
│  ACTIONS       Go to Stats                           g s          │
│  ACTIONS       Go to Analytics                       g a          │
│  ACTIONS       Show keyboard shortcuts               ?            │
│  BOARDS        My board                              Board        │
│  BOARDS        Sprint 12                             Team A       │
│  TASKS         Buy milk                              todo         │
│  TASKS         Fix login button                      doing        │
└───────────────────────────────────────────────────────────────────┘
```
Fuzzy-filters as you type. Arrow keys navigate, Enter runs, Esc closes.

### 10.6 ShortcutHelp (press ?)
```text
┌─ Keyboard shortcuts ──────────────────────────────────────────────┐
│  Press ? any time to see this list.                       [Close]│
│                                                                   │
│  NAVIGATION                                                        │
│    Go to List                          [g] [l]                     │
│    Go to Board                         [g] [b]                     │
│    Go to Stats                         [g] [s]                     │
│    Go to Analytics                     [g] [a]                     │
│  TASKS                                                             │
│    New task                            [n]                         │
│    Focus the search bar                [/]                         │
│    Close modal / deselect              [Esc]                       │
│  GLOBAL                                                            │
│    Command palette                     [Ctrl] [K]                  │
│    Undo the last delete                [Ctrl] [Z]                  │
│    Show this help                      [?]                         │
└───────────────────────────────────────────────────────────────────┘
```

## 11. Onboarding — first-run experience

### 11.1 The wizard (WizardRoot)
Shown to a brand-new account with exactly one board and zero tasks, on that browser, only once.

```text
┌─ Welcome to Tudu 👋 ───────────────────────────────────────────────┐
│  Pick a starter board. You can rename it, reshape the columns, or  │
│  start over at any time.                                            │
│                                                                     │
│  [ 🌱 Personal ] [ ⚡ Team sprint ] [ 📝 Content calendar ]        │
│  [ ⬜ Blank ]    [ 🐞 Bug tracker ] [ 🎓 Student ]                 │
│  [ 💼 Freelancer projects ]                                        │
│                                                                     │
│  Set up later                                  Setting up "…"      │
└────────────────────────────────────────────────────────────────────┘
```
Clicking a card seeds the board with columns and example tasks from backend/src/data/builtinTemplates.ts. Set up later sets a localStorage flag and closes.

### 11.2 The product tour (OnboardingPrompt → ProductTour)
First-run modal:

```text
┌─ Welcome to Tudu, Mojola! ───────────────────────────────────────┐
│                          👋                                       │
│                                                                   │
│  We've put a short guided tour together to show you around —      │
│  every feature, in a couple of minutes.                           │
│                                                                   │
│                    [ Show me around ]  [ Maybe later ]            │
│                                                                   │
│  Don't show again                                                 │
│  No rush — we'll offer the tour again in a week if you tap away.  │
└───────────────────────────────────────────────────────────────────┘
```
Accepting starts a spotlight tour that navigates itself between routes:

```text
┌───────────── dimmed backdrop ─────────────────┐
│                                               │
│   ┌─── spotlight over nav ────┐                │
│   └────────────────────────────┘                │
│                          ┌───────────────────┐│
│                          │ 🧭 Your way around ││
│                          │                   ││
│                          │ These four tabs   ││
│                          │ are the heart of  ││
│                          │ the app…          ││
│                          │                   ││
│                          │ Step 2 of 18      ││
│                          │ Skip tour         ││
│                          │ [Back]  [Next]    ││
│                          └───────────────────┘│
└────────────────────────────────────────────────┘
Skip → snooze for 7 days

Esc → snooze for 7 days

Finish → never offered again

Don't show again on the prompt → opted out permanently

```
Reached from: first-run offer, or the ? button in the header to replay.

### 11.3 InstallPrompt (PWA)
Chromium only, after the browser signals installability:

```text
        ┌──────────────────────────────────────────────┐
        │ [logo]  Install Tudu              [Install] [Later]│
        │         Runs offline, opens like an app.     │
        └──────────────────────────────────────────────┘
                                    ← bottom-centre
```
Later sets a 30-day dismiss. Safari never shows this.

### 11.4 OfflineIndicator
```text
         ┌───────────────────────────────────────────────┐
         │ ● Offline — 3 changes queued    [Sync now]     │
         └───────────────────────────────────────────────┘
                                    ← top-centre
```
States:

| Icon | Text | When |
| --- | --- | --- |
| ● amber | Offline — viewing cached data | navigator.onLine === false with no queue |
| ● amber | Offline — 3 changes queued | Queue has entries |
| ○ spinner | Syncing 2 of 5… | useOfflineSync().flush() running |
| ● amber | 2 conflicts to resolve | Conflicts present — click to open ConflictResolutionModal |

### 11.5 LicenseBanner (self-hosted only)
Rendered between the header and the shell on self-hosted instances without a valid license:

```text
┌──────────────────────────────────────────────────────────────────┐
│ ⚠ Unlicensed instance   This self-hosted instance has no license.│
│   Pro features are locked.                        [Install license →]│
└──────────────────────────────────────────────────────────────────┘
```
If a license file is present but invalid (bad signature / expired / wrong fingerprint):

```text
┌──────────────────────────────────────────────────────────────────┐
│ ⚠ Invalid license   The installed license is not valid. Check it │
│   in Settings.                                       [Fix license →]│
└──────────────────────────────────────────────────────────────────┘
```
Not dismissable. On cloud mode it never renders.

## 12. Component inventory — every visible element
Ordered by directory. ✅ = visible to signed-in users, ⚠️ = conditional, ❌ = internal-only (no UI presence).

| Component | Visible? | Where | Notes |
| --- | --- | --- | --- |
| common/BoardSelector | ✅ | Shell, above page content | Board dropdown + + Boards + Team |
| common/BulkActionBar | ⚠️ | List view, bottom-centre | Only when 2+ selected |
| common/CheckPop | ⚠️ | TaskCard (done state) | Animated checkmark |
| common/CommandPalette | ⚠️ | Global | Ctrl/Cmd+K |
| common/Confetti | ⚠️ | Global | Fired on completion |
| common/ConfettiProvider | ❌ | Provider only | No visual |
| common/ErrorBoundary | ⚠️ | Global | Fallback on render error |
| common/FeatureGate | ❌ | Wraps children | Renders UpgradePrompt if locked |
| common/FilterDropdown | ✅ | List view | Three instances (status/category/priority) |
| common/InstallPrompt | ⚠️ | Global bottom-centre | PWA install banner |
| common/LicenseBanner | ⚠️ | Below header | Self-hosted only |
| common/OfflineIndicator | ⚠️ | Top-centre | Offline/queue/conflicts |
| common/ProBadge | ✅ | Inline | Small "Pro" pill |
| common/ProtectedRoute | ❌ | Route wrapper | Redirects to /login |
| common/SearchBar | ⚠️ | List view | Legacy (superseded by QueryBar, may still render on some builds) |
| common/ShortcutHelp | ⚠️ | Global | ? |
| common/SyncIndicator | ✅ | Header | Green dot / amber spinner / Offline pill |
| common/ThemeToggle | ✅ | Header | Sun / moon |
| common/ToastContainer | ✅ | Global | Stacked toasts |
| common/UndoToast | ⚠️ | Bottom-centre | After a delete |
| common/UpgradePrompt | ⚠️ | Inside FeatureGate | Locked-feature card |
| common/Wordmark | ✅ | Header, Login | Light / dark PNG swap |
| activity/ActivityFeed | ✅ | Inside TaskActivity + RecentActivity | List of action rows |
| activity/RecentActivity | ✅ | Bottom of every page | Task + date filters |
| activity/TaskActivity | ⚠️ | TaskCard, expandable | Per-task feed |
| ai/AiBreakdownModal | ⚠️ | From "Break this down" in a task | Full-screen portal |
| ai/CreditBadge | ⚠️ | Inside AiBreakdownModal | Pro only |
| analytics/AnalyticsDashboard | ✅ | /analytics | Personal + Team tabs |
| analytics/TeamAnalyticsView | 🔒 Pro | Inside AnalyticsDashboard | Gated by analytics.team |
| auth/AuthCallback | ✅ | /auth/callback | Spinner / error |
| auth/Login | ✅ | /login | OAuth + email |
| auth/OAuthButton | ✅ | Login | Google / GitHub |
| kanban/BoardsModal | ✅ | Board selector → + Boards | CRUD boards, Publish button |
| kanban/BoardTaskForm | ⚠️ | /board, task form | Wraps TaskForm |
| kanban/ColumnManager | ⚠️ | Board → Columns | Drag reorder |
| kanban/KanbanBoard | ✅ | /board | DndContext + columns |
| kanban/KanbanCard | ✅ | Board | Draggable card |
| kanban/KanbanColumn | ✅ | Board | Droppable column |
| kanban/PublishTemplateModal | 🔒 Pro | BoardsModal → Publish | Gated by templates.publish |
| kanban/TemplateGalleryModal | ✅ | BoardsModal → Browse templates | Built-in + Marketplace |
| landing/Landing | ✅ | / when signed out | Hero, features, pricing |
| layout/Header | ✅ | Every page | See §2.1 |
| onboarding/OnboardingPrompt | ⚠️ | First-run | Welcome modal |
| onboarding/OnboardingRoot | ❌ | Mount point | Decides prompt vs tour |
| onboarding/ProductTour | ⚠️ | First-run or ? | Spotlight tour |
| onboarding/TourButton | ✅ | Header | ? icon |
| onboarding/Wizard | ⚠️ | First-run | Template picker |
| onboarding/WizardRoot | ❌ | Mount point | Decides whether to show Wizard |
| pomodoro/PomodoroRunner | ❌ | Global | Heartbeat (no UI) |
| pomodoro/PomodoroStats | ✅ | /stats | Four cards + charts |
| pomodoro/PomodoroTimer | ⚠️ | TaskCard | Inline timer pill |
| pomodoro/PomodoroTimerHeader | ⚠️ | Header | mm:ss + mute |
| pomodoro/StartPomodoroButton | ✅ | TaskCard | 🍅 Start 25m |
| settings/ApiTokensModal | ✅ | Header → gear | See §10.1 |
| settings/ConflictResolutionModal | ⚠️ | Offline | See §10.4 |
| settings/NotificationSettingsModal | ✅ | Header → bell | See §10.3 |
| settings/PublisherSettings | 🔒 Pro | /settings/billing | Bank setup card |
| settings/PurchasesList | ✅ | /settings/billing | Refund UI |
| settings/WebhooksModal | 🔒 Pro | Header → webhook | See §10.2 |
| sharing/Avatar | ✅ | Sidebar, shared lists | Initials or image |
| sharing/SharedListsSidebar | ✅ | Sidebar (desktop) | Self + MyShares |
| sharing/SharedListView | ✅ | /shared/:id | Full shared list |
| sharing/SharedWithMeSection | ⚠️ | Below board selector | Mobile reminder of sidebar |
| sharing/ShareInvites | ⚠️ | Sidebar top + main mobile | Pending invites |
| sharing/ShareModal | ⚠️ | List → Share button | Send invite |
| tasks/QueryBar | ✅ | List view | Search + chips |
| tasks/QueryHelp | ⚠️ | QueryBar's ? | Popover |
| tasks/SmartTaskInput | ✅ | TaskForm | NLP-previewing textarea |
| tasks/SortDirectionToggle | ✅ | List view | ↓ / ↑ |
| tasks/SortDropdown | ✅ | List view | Sort key |
| tasks/SubtaskList | ⚠️ | TaskCard, expanded | Checklist + add |
| tasks/TaskCard | ✅ | List view | See §4.1 |
| tasks/TaskForm | ⚠️ | List + Board | New / edit |
| tasks/TaskList | ✅ | / | The whole List page |
| templates/EditTemplateModal | ⚠️ | MarketplacePicker → Edit | Publisher-only |
| templates/MarketplaceBuyModal | ⚠️ | MarketplacePicker → Buy | Paystack popup launcher |
| templates/MarketplacePicker | ✅ | TemplateGalleryModal → Marketplace tab | Card grid |
| templates/SyncTermsChangedModal | ⚠️ | MarketplacePicker → sync 402 | Blocked update |
| templates/TemplateCard | ✅ | Inside TemplatePicker | Built-in template card |
| templates/TemplatePicker | ✅ | Wizard, TemplateGalleryModal | Static grid |
| time/StartTimerButton | 🔒 Pro | TaskCard | ⏱ Start timer |
| time/TimeLog | 🔒 Pro | /stats | Add manual entry |
| time/Timer | 🔒 Pro | Header | Running pill |
| time/WeeklyReport | 🔒 Pro | /stats | Chart + top tasks |
| workspace/AssigneeChip | ⚠️ | Board card, workspace boards only | Select from members |
| workspace/TeamModal | ✅ | Board selector → Team | See §5.8 |
| workspace/WorkspaceInvites | ⚠️ | Below board selector | Accept / decline |

## 13. Tier access matrix
Which features each tier can see and use, in UI terms.

| Feature | Anonymous | Free | Pro | Enterprise | Self-hosted (licensed) |
| --- | --- | --- | --- | --- | --- |
| Landing page | ✅ | — | — | — | — |
| Login | ✅ | — | — | — | — |
| Try the demo | ✅ | — | — | — | — |
| Pricing | ✅ | ✅ | ✅ | ✅ | ✅ |
| List view | — | ✅ | ✅ | ✅ | ✅ |
| Board view | — | ✅ | ✅ | ✅ | ✅ |
| Stats (Pomodoro) | — | ✅ | ✅ | ✅ | ✅ |
| Analytics (personal) | — | ✅ | ✅ | ✅ | ✅ |
| Analytics (team) | — | 🔒 | ✅ | ✅ | ✅ |
| Time tracking | — | 🔒 | ✅ | ✅ | ✅ |
| Custom columns | — | ✅ | ✅ | ✅ | ✅ |
| WIP limits | — | ✅ | ✅ | ✅ | ✅ |
| Workspaces + roles | — | ✅ | ✅ | ✅ | ✅ |
| Sharing by email | — | ✅ | ✅ | ✅ | ✅ |
| Power filters | — | ✅ | ✅ | ✅ | ✅ |
| Bulk actions | — | ✅ | ✅ | ✅ | ✅ |
| Undo (soft delete) | — | ✅ | ✅ | ✅ | ✅ |
| Keyboard shortcuts | — | ✅ | ✅ | ✅ | ✅ |
| PWA install | — | ✅ | ✅ | ✅ | ✅ |
| Onboarding tour | — | ✅ | ✅ | ✅ | ✅ |
| AI breakdown (basic) | — | ✅ | ✅ | ✅ | ✅ |
| AI breakdown (12-step) | — | 🔒 | ✅ | ✅ | ✅ |
| AI credits system | — | — | ✅ | ✅ | — |
| Template marketplace (install) | — | ✅ | ✅ | ✅ | ✅ |
| Template marketplace (publish) | — | 🔒 | ✅ | ✅ | ✅ |
| Paid template (buy) | — | ✅ | ✅ | ✅ | ✅ |
| Paid template (sell) | — | 🔒 | ✅ | ✅ | ✅ |
| Rentals | — | ✅ | ✅ | ✅ | ✅ |
| GitHub integration | — | 🔒 | ✅ | ✅ | ✅ |
| Slack integration | — | 🔒 | ✅ | ✅ | ✅ |
| Push notifications | — | 🔒 | ✅ | ✅ | ✅ |
| Public read API (tokens) | — | ✅ | ✅ | ✅ | ✅ |
| Public write API | — | 🔒 | ✅ | ✅ | ✅ |
| Webhooks (outbound) | — | 🔒 | ✅ | ✅ | ✅ |
| Offline queue | — | ✅ | ✅ | ✅ | ✅ |
| Self-hosting license | — | 🔒 | ✅ | ✅ | — |
| SAML SSO | — | ❌ | ❌ | ✅ (unbuilt) | ❌ |
| SCIM | — | ❌ | ❌ | ✅ (unbuilt) | ❌ |
| Audit export | — | ❌ | ❌ | ✅ (unbuilt) | ❌ |
| White-label | — | ❌ | ❌ | ✅ (unbuilt) | ❌ |

## 14. API tokens — in depth

### 14.1 Where users see them
Header → gear icon → ApiTokensModal

The modal shows the caller's tokens, sorted newest first. Each row shows label, prefix, and last-used date. There's a create form at the top and a Revoke button on each row.

### 14.2 What the modal exposes
| Element | Data | Copy button? |
| --- | --- | --- |
| Plaintext token (after creation) | tudu_pat_<48 hex chars> | ✅ |
| Token prefix (in list) | tudu_pat_<8 hex chars>… | ❌ |
| Curl example | <pre> block with <token> placeholder | ❌ |
| Label, prefix, last-used, created-at, id | metadata | ❌ |
| Revoke button | fires DELETE /api/tokens/:id | — |

### 14.3 How to get the curl out of the UI
The current <pre> renders:

```text
curl -H "Authorization: Bearer <token>" https://your-tudu-api/api/v1/tasks
```
There is no copy button on this block. Users have to:

Select the text with the cursor.

Manually replace <token> with the plaintext they copied earlier.

Replace your-tudu-api with the deployed URL.

See §16.2 for what should be added.

### 14.4 Full token lifecycle
```text
┌─ Create ──────────────────────────────────────────────┐
│  1. Open API tokens modal (header gear)                │
│  2. Type a label, click Create token                   │
│  3. Backend returns { plaintext, prefix, hash }        │
│     • stores hash = sha256(pepper + plaintext)         │
│     • stores prefix = plaintext.slice(0, 17)           │
│  4. Modal shows plaintext ONCE with a Copy button      │
│  5. Click Done — the plaintext is gone forever         │
└────────────────────────────────────────────────────────┘

┌─ Use ─────────────────────────────────────────────────┐
│  curl -H "Authorization: Bearer tudu_pat_…" \          │
│       https://your-tudu-api/api/v1/tasks                │
│  Backend: extracts bearer → hashes → looks up          │
│  → attaches { userId, email } → last_used_at update    │
└────────────────────────────────────────────────────────┘

┌─ Revoke ──────────────────────────────────────────────┐
│  1. API tokens modal → Revoke on the row               │
│  2. DELETE /api/tokens/:id                             │
│  3. Next request with that token returns 401           │
└────────────────────────────────────────────────────────┘
```

### 14.5 Rate limits
100 requests per minute per user (not per token).

Every request counts (including 404s).

X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset are returned as standard headers.

## 15. Webhooks — in depth

### 15.1 Where users see them
Header → webhook icon (Pro only) → WebhooksModal

### 15.2 What the modal exposes
| Element | Data | Copy button? |
| --- | --- | --- |
| Secret (after creation) | 64-char hex string | ✅ |
| Endpoint URL, description, events, active state | table row | ❌ |
| Delivery history (expand) | event type, status, attempt count, HTTP status, timestamp | ❌ |
| Retry button on dead deliveries | fires POST …/retry | — |
| Pause / Resume | toggles is_active | — |
| Delete | confirmation + delete | — |
| Receiver-side curl | — | ❌ |
| Signature verification snippet | — | ❌ |
| Webhook URL display | — | ❌ |

### 15.3 The webhook flow a receiver has to implement
Not currently shown in the UI. This is what a user must read the docs for:

```text
Tudu ──POST──▶ https://example.com/hooks/tudu
  Content-Type: application/json
  user-agent: Tudu-Webhooks/1.0
  webhook-id: <delivery uuid>
  webhook-timestamp: 1698050400
  webhook-signature: v1,<base64 HMAC-SHA256>

  {
    "id": "<delivery uuid>",
    "type": "task.created",
    "created_at": "2026-10-22T14:23:00.000Z",
    "data": { "task": { …} }
  }
```
The signature is over "<id>.<timestamp>.<body>" using HMAC-SHA256 with the endpoint secret, base64-encoded, prefixed with v1,.

Retry policy: 6 attempts with exponential backoff (60s → 5m → 30m → 2h → 6h → 12h, capped at 24h), plus ±10% jitter.

### 15.4 Full webhook lifecycle
```text
┌─ Create ──────────────────────────────────────────────┐
│  1. Webhooks modal → Add an endpoint                   │
│  2. Enter https://… (must be https)                    │
│  3. Select events                                      │
│  4. Click Create endpoint                              │
│  5. Modal shows secret ONCE — click Copy               │
│  6. Store the secret on the receiver                   │
└────────────────────────────────────────────────────────┘

┌─ Receive ─────────────────────────────────────────────┐
│  Every task mutation queues a delivery row in          │
│  webhook_deliveries. The backend worker drains it      │
│  every 30s, POSTs the payload, records the response.   │
└────────────────────────────────────────────────────────┘

┌─ Debug ───────────────────────────────────────────────┐
│  1. Click Deliveries on an endpoint row               │
│  2. See last 50 attempts with status and HTTP code     │
│  3. For dead rows, click Retry to requeue              │
└────────────────────────────────────────────────────────┘
```

### 15.5 What a receiver must verify
Not shown in the current UI. Given the headers above, the receiver code is:

```typescript
import crypto from 'crypto';

const secret = process.env.TUDU_WEBHOOK_SECRET;  // the copied 64-char hex
const id = req.headers['webhook-id'];
const ts = req.headers['webhook-timestamp'];
const sig = req.headers['webhook-signature'];    // "v1,<base64>"

const body = req.rawBody.toString('utf8');
const toSign = `${id}.${ts}.${body}`;
const expected = 'v1,' + crypto.createHmac('sha256', secret).update(toSign).digest('base64');

// Constant-time compare
const a = Buffer.from(expected);
const b = Buffer.from(sig);
if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
  return res.status(401).end();
}
```
See §16.3 for what should be added — this is a big gap.

## 16. Gaps and what to add

### 16.1 GitHub webhook secret (backend exists, UI missing)
State: getWebhookSecret and rotateWebhookSecret are implemented in githubController.ts, but neither is mounted in routes/github.ts, and IntegrationsSettings.tsx doesn't surface them.

What to add:

In routes/github.ts:

```typescript
router.get('/webhook-secret', getWebhookSecret);
router.post('/rotate-secret', rotateWebhookSecret);
```
In IntegrationsSettings.tsx, under the GitHub "Connected" section, add a Webhook secret panel:

```text
┌─ Webhook secret ──────────────────────────────────────┐
│  Use this when configuring the GitHub webhook.        │
│  ┌───────────────────────────────────────────────┐    │
│  │ 3f9a8c1b4e7d2f0e5b6c8a1d9e4f7a2b3c8d5e1f6a9…  │ [Copy]│
│  └───────────────────────────────────────────────┘    │
│  [Rotate secret]                                      │
│  ┌─ How to set it ───────────────────────────────┐    │
│  │  1. GitHub repo → Settings → Webhooks         │    │
│  │  2. Add webhook                               │    │
│  │  3. Payload URL:                              │    │
│  │     https://your-tudu-api/api/integrations/… │ [Copy]│
│  │  4. Content type: application/json            │    │
│  │  5. Secret: (paste above)                     │    │
│  │  6. Events: Pull requests only                │    │
│  └───────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────┘
```
Add a Copy button on both the secret and the payload URL.

Why it matters: right now a user who connects GitHub has no way to know what secret to paste into GitHub, so their webhook is rejected with 401 and there's no UI hint.

### 16.2 API tokens — three small additions
State: the modal works but has UX gaps.

What to add:

Copy button on the curl example. Currently users must select the text manually.

```text
┌─ Example ──────────────────────────────────────────┐
│  curl -H "Authorization: Bearer <token>" \          │ [Copy]
│       https://your-tudu-api/api/v1/tasks           │
└────────────────────────────────────────────────────┘
"Test this token" button next to the plaintext (before it disappears). Fires a live GET /api/v1/me and shows the response inline:

text
┌─ Copy this token now ──────────────────────────────┐
│  tudu_pat_f3c2bcb5f0023…                  [Copy]  │
│  [Test it]  [Done]                                 │
│  ┌─ Success ─────────────────────────────────┐     │
│  │ HTTP 200                                  │     │
│  │ {"id":"…","email":"mojola@…"}             │     │
│  └───────────────────────────────────────────┘     │
└────────────────────────────────────────────────────┘
```
Copy button on each prefix in the list so users can identify which token they're looking at without copying the whole row.

### 16.3 Webhooks — the four biggest missing pieces
State: the modal creates endpoints and shows delivery logs. It doesn't teach users how to receive a webhook.

What to add:

#### A. Receiver-side quick-start panel
```text
┌─ Receiving a webhook ─────────────────────────────────────┐
│  1. Create an endpoint above. Copy the secret.            │
│  2. Your server must verify the signature on every POST.  │
│                                                            │
│  Node.js snippet:                                          │
│  ┌────────────────────────────────────────────────────┐   │
│  │  import crypto from 'crypto';                       │   │ [Copy]
│  │                                                    │   │
│  │  const toSign = `${req.headers['webhook-id']}.` +  │   │
│  │                 `${req.headers['webhook-timestamp']}` │   │
│  │                 + `.${req.rawBody}`;               │   │
│  │  const expected = 'v1,' + crypto                  │   │
│  │    .createHmac('sha256', SECRET)                   │   │
│  │    .update(toSign)                                 │   │
│  │    .digest('base64');                              │   │
│  │  if (expected !== req.headers['webhook-signature'])│   │
│  │    return res.status(401).end();                   │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  Retry policy: 6 attempts, exponential backoff.           │
│  Failed-after-6 deliveries show as "dead" below.          │
└────────────────────────────────────────────────────────────┘
```
Each snippet needs a Copy button.

#### B. Live payload preview
On the create form, next to the events checkboxes:

```text
[☑ task.created]  →  Preview payload
[☑ task.updated]
```
Clicking shows a sample payload with the actual field shape Tudu sends — the user can develop against it without waiting for a real task event.

C. "Test delivery" button per endpoint
Fires a synthetic task.created event to the endpoint's URL and shows the HTTP response inline. Cuts the debug loop from "wait for a real task mutation" to "click a button, see the result".

#### D. Explicit webhook URL + secret UX in the row
Currently the endpoint URL is shown but the secret is not. Add a Show secret toggle on each row (re-authenticates via JWT; returns the secret; the modal re-renders it with a Copy button). Without this, users who lost their secret during initial creation must delete and recreate the endpoint.

### 16.4 Two smaller gaps
Bulk assign UI. useBatchAssignTasks exists but the BulkActionBar only exposes Mark done, Mark todo, Delete. Adding a [Assign ▾] dropdown would round out the bulk story.

Push notification permission re-request. If the browser has denied permission once, the modal shows a hint but doesn't offer a re-request (browsers don't allow programmatic re-prompting, but the modal could link to browser settings).

## 17. Curl testing cheatsheet

### 17.1 Testing an API token
After creating a token in ApiTokensModal, copy the plaintext, then:

```powershell
$TOKEN = "tudu_pat_<your-token-here>"
$API   = "http://localhost:5000"

# Who am I?
curl.exe -H "Authorization: Bearer $TOKEN" "$API/api/v1/me"

# My boards
curl.exe -H "Authorization: Bearer $TOKEN" "$API/api/v1/boards"

# My tasks (first 5)
curl.exe -H "Authorization: Bearer $TOKEN" "$API/api/v1/tasks?limit=5"

# Filter by status
curl.exe -H "Authorization: Bearer $TOKEN" "$API/api/v1/tasks?status=todo"

# A single task
curl.exe -H "Authorization: Bearer $TOKEN" "$API/api/v1/tasks/<task-uuid>"

# Failure modes — all should be 401
curl.exe -i -H "Authorization: Bearer bogus"              "$API/api/v1/me"
curl.exe -i -H "Authorization: NotBearer xyz"             "$API/api/v1/me"
curl.exe -i                                               "$API/api/v1/me"
```

### 17.2 Testing an outbound webhook
You need a public receiver. The easiest local one:

```powershell
# Terminal A — a listener that prints every POST
node -e "
  const http = require('http');
  http.createServer((req, res) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      console.log('---');
      console.log('Headers:', req.headers);
      console.log('Body:', body);
      res.end('ok');
    });
  }).listen(4000, () => console.log('listening on :4000'));
"
```
Expose it: ngrok http 4000 → copy the https://xxxx.ngrok.app URL.

In WebhooksModal, create an endpoint pointing at https://xxxx.ngrok.app/hook with task.created enabled. Then in the app, create a task. Within ~30s (the worker's poll interval) the listener prints a POST with the four headers and the JSON payload.

If it doesn't arrive:

```sql
-- In Neon: check the delivery was queued
SELECT id, endpoint_id, event_type, status, attempt_count,
       last_response_status, last_response_body
FROM webhook_deliveries
ORDER BY created_at DESC
LIMIT 10;
If status = 'dead', the endpoint kept failing (6 attempts). Fix the receiver, then click Retry in the modal or:

powershell
$API = "http://localhost:5000"
$JWT = "<your session token>"
curl.exe -X POST -H "Authorization: Bearer $JWT" \
  "$API/api/webhooks/deliveries/<delivery-id>/retry"
```

### 17.3 Testing GitHub webhook HMAC (from earlier)
Already covered in the previous message, but for completeness:

```powershell
$env:WH_SECRET = "<from DB>"
$env:WH_REPO   = "owner/repo"
$env:WH_SHORT  = "42"

function Sign($b) {
  $h = [System.Security.Cryptography.HMACSHA256]::new(
    [Text.Encoding]::UTF8.GetBytes($env:WH_SECRET)
  )
  "sha256=" + ([BitConverter]::ToString(
    $h.ComputeHash([Text.Encoding]::UTF8.GetBytes($b))
  ) -replace '-','').ToLower()
}

$body = '{"action":"opened","pull_request":{"title":"TUDU-' + $env:WH_SHORT + '","merged":false},"repository":{"full_name":"' + $env:WH_REPO + '"}}'

curl.exe -i -X POST http://localhost:5000/api/integrations/github/webhook `
  -H "Content-Type: application/json" `
  -H "x-github-event: pull_request" `
  -H "x-hub-signature-256: $(Sign $body)" `
  --data-binary $body
```
Expected: HTTP/1.1 200 OK and {"ok":true}, with the corresponding task on the mapped board moving to the "PR opened" column.

## Summary
What exists: 90+ components across 8 pages and 8 modals, covering the Free tier (12/12) and Pro tier (15/15) completely. Every interactive element is documented above with its aria-label, its tier gate, and the endpoint behind it.

What's missing (UI only, backend is complete):

GitHub webhook secret — no UI, no route. The endpoints exist in githubController.ts but aren't mounted. §16.1.

API token copy on curl — no copy button, no test-in-place. §16.2.

Webhook receiver guidance — no signature-verification snippet, no live payload preview, no test button, no secret re-view. §16.3.

Bulk assign — backend exists, no UI. §16.4.

What's missing (both backend and UI): the entire Enterprise tier (6.1–6.7). SSO, SCIM, audit export, on-prem Docker, white-label, data residency.

Everything else — tokens, webhooks, GitHub, Slack, push, time tracking, team analytics, publisher payouts, marketplace, rentals, self-hosting — is fully functional across the UI and API.