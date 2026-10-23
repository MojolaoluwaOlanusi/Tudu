# Tudu — Deferred Features & Future Work

This document consolidates every edge case, platform limitation, and explicitly deferred feature identified during the implementation of the Free and Pro tiers. These items do not block the current launch but are tracked here for future sprints.

---

## Feature 1.1 — Custom Columns & Board Flexibility
- **Column drag-and-drop on mobile:** Currently implemented using native HTML5 drag events (via `draggable`), which can be finicky on touch devices. A future sprint should migrate this to `@dnd-kit/core` for a smoother touch experience, matching the Kanban board.
- **Stage inheritance edge case:** If a user changes a column's stage (e.g., from `todo` to `doing`), all cards within it update their status. However, if a user has filtered the list view to show only `todo` tasks, those cards will disappear from the list view (but remain in the column) until the filter is updated. This is expected behavior but worth a UI hint.

## Feature 1.2 — Workspaces & Permissions
- **Board-level invitations:** The `board_members` table exists, but there is no UI or API route to invite a user to a *specific* board (only workspace-level invites exist). 
- **Granular RBAC:** Permissions are currently at the workspace level (`admin`, `member`, `viewer`). A future feature could allow per-board overrides (e.g., a `viewer` in the workspace could be an `admin` on one specific board).
- **Ownership transfer:** There is no UI for a workspace owner to transfer ownership to another admin.

## Feature 4.1 — Landing Page
- **SEO and SSR:** The landing page is entirely client-side rendered (Vite SPA). For better SEO, a future sprint should migrate the landing page to Next.js or add pre-rendering (e.g., `vite-plugin-ssr`).
- **Dynamic Demo limits:** The "Try the demo" flow currently creates a permanent throwaway account. A cron job is needed to prune demo accounts older than 7 days to prevent DB bloat.

## Feature 4.5 — Undo (Soft Delete)
- **Retention window:** Soft-deleted tasks remain in the database indefinitely. A future background job (cron) is required to hard-delete tasks where `deleted_at < NOW() - INTERVAL '30 days'`.
- **Undo bulk actions:** The current undo toast only applies to single-task deletions. Bulk delete (`DELETE /api/tasks/batch`) bypasses the undo queue.

## Feature 4.10 — Public Read API
- **Rate limiting by IP:** The `api/v1` routes are limited per user (100 req/min). A secondary limit per IP is needed to prevent distributed scraping.

## Feature 5.1 — Paystack Billing
- **Proration:** Upgrading from Monthly to Yearly does not currently prorate the remaining balance; it simply starts a new subscription. Future work involves using Paystack's proration APIs.
- **Dunning management:** If a subscription payment fails (`invoice.payment_failed`), the status changes to `past_due`. There is no automated email sequence or grace period logic implemented yet; access is revoked immediately.

## Feature 5.3 — AI Credits
- **Auto-top-up:** Users cannot set a rule to automatically buy more credits when their balance hits zero.
- **Team credit pools:** Credits are currently owned by individual users. A team workspace cannot share a single pool of AI credits.

## Feature 5.6 — Template Marketplace
- **Moderation queue:** Publishing a template sets `status = 'approved'` automatically. A future admin dashboard is needed to review and reject inappropriate templates.
- **Template reviews:** There is no rating or review system for downloaded templates.

## Feature 5.7 — GitHub Integration
- **PR to Task creation:** The webhook currently only *moves* existing tasks that are mentioned in a PR title (e.g., `TUDU-42`). A future feature could *create* a new task automatically when a PR is opened with a specific label.
- **HMAC validation context:** (Resolved) The HMAC check validates against per-user secrets. Future work involves exposing a UI to rotate the secret without disconnecting GitHub.
- **Issue sync:** Linking GitHub Issues to Tudu tasks (two-way sync) is not implemented.

## Feature 5.8 — Slack Integration
- **Two-way sync:** Slash commands (`/tudu create`) and notifications (assignments/due dates) are implemented. Updating a task from Slack (e.g., `/tudu done TUDU-42`) is not yet supported.
- **Thread replies:** Notifications send a message to a channel, but threading subsequent updates under the first message is not implemented.

## Feature 5.9 — Public Write API & Webhooks
- **Webhook replay protection:** The receiver is expected to verify the `webhook-timestamp`, but Tudu does not strictly enforce a time window on its outbound events. 
- **Custom headers:** Users cannot add custom headers to their outbound webhook requests (e.g., for API keys).

## Feature 5.10 — Offline Queue & Sync
- **Batch mutations:** `batchDelete`, `batchAssign`, and batch drag (move N tasks) still roll back on network error. Queuing N operations in one shot is a follow-up.
- **Queueing across users:** The queue assumes the same user is signed in when the flush runs. If the token expires, the flush pauses and the pill shows "Sign in to sync". A "switch user" flush handler is needed.
- **Background Sync on iOS:** iOS Safari has no Background Sync API. The flusher only runs while the app is open, on the `online` event. That's a platform limitation, not a bug.

## Feature 5.12 — Time Tracking
- **Billable rates per client/currency:** All time is tracked as generic "Billable" or "Non-billable". There is no concept of a client rate or multiple currencies.
- **Invoicing:** Generating a PDF invoice from tracked time is deferred.
- **Auto-close on Pomodoro completion:** Starting a manual time tracker does not automatically stop when a Pomodoro session ends. (A 10-line addition, deliberately deferred).
- **Team-wide time reports:** A variant of `analytics.team` for time tracking is planned (natural 5.13).
- **CSV export:** Analytics exports personal metrics, but exporting raw time entries is a separate export not yet built.

---

## Enterprise Tier (Entirely Unbuilt)
- **SAML SSO:** No configuration UI, no backend IdP integration.
- **SCIM Provisioning:** No bulk user sync endpoints.
- **Compliance Audit Export:** `activity_log` is user-scoped, not compliance-scoped.
- **White-label:** No custom domain routing or branding overrides.
- **Data Residency:** No region pinning or signed data archives.
