# Changelog

All notable changes to Tudu are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## \[Unreleased\]

### Added

* Repository hygiene: LICENSE (AGPL-3.0), CONTRIBUTING, SECURITY,
CODE_OF_CONDUCT, SUPPORT, PULL_REQUEST_TEMPLATE, ISSUE_TEMPLATE,
CHANGELOG.

### Fixed

* Sidebar "Shared with me" rows navigated to #/shared/:id (a hash the
BrowserRouter cannot see) instead of /shared/:id. Users stayed on
the current page after clicking a shared list.

* window.confirm call sites replaced with a themed ConfirmDialog. No
more unstyled, thread-blocking dialogs, and no more inconsistent copy
on destructive actions.

* Deep-linking to a protected route while signed out dropped the target
after sign-in. Destination is now remembered in sessionStorage and
consumed after both email and OAuth login.

* SettingsIntegrations inferred the webhook URL from
window.location.origin.replace('5173', '5000'), which produced a
broken port on any deployed domain. It now reads VITE_API_URL.

* TaskCard.copyId() reported "copied" even when the clipboard write
failed. Errors are now surfaced to the user.

* Unknown /docs/:slug rendered the docs index under the wrong URL.
Now renders a real "Page not found".

* Mobile: ShareModal could clip its Send button on short viewports.
Panel now scrolls.

* Mobile: SharedListView had no exit at the top of the page.

* Mobile: 30-bar analytics charts rendered as hairlines with overlapping
labels. BarChart now scrolls horizontally past 14 bars.

* Mobile: docs sidebar was hidden below md, leaving /docs with no
way to reach other pages. Added a horizontal chip bar.

* Mobile: Topbar had no board switcher below lg. Added a compact
`<select>` in the mobile row.

## \[1.6.0\] - 2025-10

### Added

* Command palette (Ctrl/Cmd + K) for navigation and actions.

* Power filters: @me, #work, due:week, priority:high, is:open,
column:Doing, plus free text. Chip UI in the query bar.

* Keyboard shortcuts: n (new task), / (focus search), ? (help),
g b / g l / g s / g a (navigation), Esc (close), density
toggle (Ctrl+Shift+D).

* Bulk select on the List view: mark done, mark todo, delete, clear.

* Manual sort dropdown and direction toggle, both URL-backed.

* Per-user default sort persisted to users.preferences.

### Fixed

* Analytics timezone offsets are now sent from the browser, so "this
week" is the user's week, not the server's.

## \[1.5.0\] - 2025-09

### Added

* Time tracking: start / stop timers, manual entries, billable flag.
Per-day, per-task, and per-range reports.

* Team analytics: per-member completion, in-progress, assigned counts,
burndown per workspace, per-board progress.

* CSV and JSON export of analytics (with spreadsheet-formula escaping on
user-supplied titles).

### Changed

* `analytics.time` gate: time tracking is Pro-tier.

## \[1.4.0\] - 2025-08

### Added

* GitHub integration: OAuth install, repo mappings, PR-opened /
PR-merged column moves, HMAC-SHA256 signature verification on
incoming webhooks, secret rotation.

* Slack integration: OAuth, per-user channel + notification settings,
/tudu create slash command, HMAC signature verification on the
command endpoint.

* Public API v1: read endpoints for /me, /boards, /tasks.

* Outbound webhooks: task.created / updated / moved / deleted, Standard
Webhooks signature, exponential backoff retries, dead-letter requeue.

## \[1.3.0\] - 2025-07

### Added

* AI task breakdown: free tier (6 steps), Pro tier (HD, 12 steps),
credits metered for Pro. Supports Gemini, Groq, and local Ollama.

* atural-language parsing of due dates, categories, and priorities via
chrono-node and a keyword set.

## \[1.0.0\] - 2025-05

### Added

* General availability: personal boards, Kanban with drag and drop,
list view with filters and search.

* Email + Google + GitHub auth.

* Subtasks with progress.

* Pomodoro timer and focus stats.

* Share lists by email with accept / decline.

* Dark and light theme.

* Confetti on completion.

* Initial pricing: Free forever for personal use.

## \[Unreleased\]: <https://github.com/MojolaoluwaOlanusi/Tudu/compare/v1.6.0...HEAD>

\[1.6.0\]: <https://github.com/MojolaoluwaOlanusi/Tudu/releases/tag/v1.6.0>
\[1.5.0\]: <https://github.com/MojolaoluwaOlanusi/Tudu/releases/tag/v1.5.0>
\[1.4.0\]: <https://github.com/MojolaoluwaOlanusi/Tudu/releases/tag/v1.4.0>
\[1.3.0\]: <https://github.com/MojolaoluwaOlanusi/Tudu/releases/tag/v1.3.0>
\[1.0.0\]: <https://github.com/MojolaoluwaOlanusi/Tudu/releases/tag/v1.0.0>
