# Launch readiness

Companion to `docs/LAUNCH_AND_GROWTH.md` (strategy) and
`docs/LAUNCH_TIMING.md` (calendar). That pair answers "how do I launch"
and "when". This file answers "am I actually ready".

Read top to bottom before posting anything.

## TL;DR

Three "video" assets exist and each does a different job. Only two of
them are files in the repo.

| Asset | Has audio | Lives where | Purpose |
|---|---|---|---|
| `docs/demo.gif` | No | In the repo, embedded in README | First impression on GitHub. Loops silently. |
| 30-second Loom | Yes, narrated | loom.com, a URL not a file | Shareable link in HN and PH body posts. Humanises the launch. |
| Screenshots | No | In the repo, referenced by README | Static backup if the GIF takes too long to load. |

The Loom is not required for launch. If it is missing, paste the direct
link to `docs/demo.gif` in the HN body post instead. It works, it just
does not humanise as well.

## What the Loom actually is

If you have never recorded one:

- 25 to 35 seconds of you talking over the same flow as the GIF. Not
  silent, not captioned-only. Narrated. That is the entire difference
  from the GIF.
- Microphone on, screen share only (no webcam is fine, no webcam is
  often better for a developer audience).
- Loom auto-generates captions within a few minutes of upload. You do
  not write them by hand.
- Hosted on `loom.com/share/<id>`. You get a preview card when the URL
  is pasted into HN, Product Hunt, X, LinkedIn.
- Nothing is committed to the repo. It is a URL, not a file.

What to say:

> "This is Tudu. I built it because I wanted a Kanban that worked on my
> phone without the Jira tax. Here is the fastest path through it: I
> type a sentence in plain English, the parser picks up the date and
> category, I hit Enter, here is the card. I drag it to Done, the
> confetti fires. That is the whole loop. The Pomodoro starts from any
> card and folds into stats."

Under 30 seconds. No marketing voice. Say "I".

## Hard blockers

These are the ones where launching without them costs visible conversions.

### 1. The hosted demo URL

`https://tudu-kanban.vercel.app` is a default Vercel subdomain. It reads
as "side project" everywhere it appears:

- OAuth consent screen ("Authorized domains")
- Share links from the app
- The HN post body
- The Product Hunt launch page
- Any tweet or LinkedIn post

A custom domain (`tudu.app`, `getTudu.com`, `trytudu.dev` -- whatever is
available) costs about 12 USD per year and is the single highest ROI
purchase before launch. Configure it in Vercel, update
`FRONTEND_URL` and `APP_URL` on the backend, redeploy. That is the
whole migration.

If you deliberately decide against a custom domain, note it here so the
launch copy does not imply otherwise. Do not claim a product domain you
do not own.

### 2. Google OAuth consent verification

Open the OAuth consent screen in Google Cloud Console and check the
status. Options:

- **Publishing status: Testing.** Anyone whose email is not on the test
  users list cannot sign in with Google. Blocks public launch entirely.
- **Publishing status: In production.** Users see "This app isn't
  verified" on the sign-in screen until Google completes verification.
  Verification takes 4 to 6 weeks. Many indie products launch with the
  warning banner and accept the drop-off.
- **Publishing status: In production, verification complete.** No
  warning. This is the target state.

Decide consciously:

- **Submit today.** Launch is 4 to 6 weeks out. Use the waiting time to
  record the Loom, install Sentry, run a soft launch to 20 people.
- **Launch with the banner.** Launch this week. Note in
  `LAUNCH_AND_GROWTH.md` that "Sign in with Google" will show the
  warning until verification completes, and make sure email/password
  sign-in is the highlighted path on the login screen (it should be by
  default -- it is the first item on the email-form view).

Either is defensible. What is not defensible is launching without
realising the warning exists.

## Soft blockers

Fix these in the week before launch. None blocks the button from being
pressed, but each costs a measurable amount of signal.

### 1. Error tracking

Not installed today. Grep for `sentry`, `posthog`, `datadog` across
`backend/src` and `frontend/src` returns nothing.

Without it, when 100 people hit the site:

- You have no idea which endpoint is returning 500.
- You have no idea which page is crashing in one browser but not
  another.
- Every bug report is "it's broken" and you have to reproduce it by
  asking the reporter for their environment.

Install Sentry (free tier is fine, 5k errors per month):

- Backend: `@sentry/node`, initialize in `backend/src/server.ts` before
  `createRealtimeServer`, set DSN from `SENTRY_DSN`. Enable
  `Sentry.Handlers.requestHandler()` and `errorHandler()` around the
  Express app.
- Frontend: `@sentry/react`, initialize in `frontend/src/main.tsx`,
  set DSN from `VITE_SENTRY_DSN`, wrap the app with
  `Sentry.ErrorBoundary` (you already have `ErrorBoundary.tsx`; Sentry
  can wrap it or replace it).
- Time: about 30 minutes end to end.

### 2. The status page is fabricated

`frontend/src/pages/marketing/StatusPage.tsx` hardcodes uptime
percentages and a fake incident history:

- `SYSTEMS[].uptime` values: `99.99`, `99.97`, `99.94`, `99.98`,
  `100.0`.
- `SYSTEMS[].days` arrays: 30 hardcoded `1`s with two embedded `0`s.
- `INCIDENTS` array: two fabricated incidents ("Brief realtime
  disconnect", "API latency spike").

The page has an honest disclaimer below the numbers ("Uptime is
updated manually while a monitored status page is being set up"). That
is not enough: the numbers above the disclaimer are still presented as
measured uptime. This is the same category of lie as the fake
testimonials that `fix/marketing-honesty-pass` removed.

Two options, both honest:

- **Hook up a real status provider.** Instatus or Better Stack both
  have free tiers. Point a `<script>` at their embed, or fetch their
  JSON and render it in the existing layout. Replace the hardcoded
  `SYSTEMS` array with the fetched data. About 30 minutes.
- **Strip the fake data.** Remove the `SYSTEMS` uptime percentages and
  the `days` grid entirely. Keep only the incident log, rename the
  page to "Incident history" or leave "Status" but only show incidents
  plus a "no active incidents" banner. Also remove the fake
  `INCIDENTS` entries and replace with a single real "launched" entry
  once you actually launch. About 15 minutes.

Do not leave fake percentages on an "operational" status page during a
launch. It is the exact kind of claim that gets screenshot-ed and
quoted back at you.

### 3. GitHub repo metadata

Five minutes of work, visible on every repo visit and in search:

```pwsh
gh repo edit --add-topic kanban,trello-alternative,pomodoro,pern-stack,self-hosted,productivity,typescript,react,postgres
gh repo edit --description "Open-source Kanban with custom columns, Pomodoro, time tracking, and optional AI task breakdown. Self-hostable."
```

Enable Discussions from the repo Settings tab (Features -> Discussions).
Categories that matter on day one:

- Q&A
- Ideas
- Show your work
- Announcements

## Nice-to-have

Not blockers. Defer until after launch unless you have spare time.

- **`security@yourdomain` alias.** `olanusimojola@gmail.com` in
  `SECURITY.md` works today. An alias reads more institutional but
  changes nothing about how reports are handled.
- **awesome-selfhosted submission.** Blocked on Docker, which is
  deliberately deferred (see `NEXT_STEPS.md` Section 7). The list
  moderators reject repos with no compose file.
- **A pinned "I came from Trello because..." Discussion.** Worth doing
  on launch day, not before. A pinned thread with no replies looks
  worse than no thread.
- **A build badge on the README.** Already added in the CI PR
  (`.github/workflows/ci.yml` badge row).

## Recommended order

If you have one day of preparation before launch:

### Today (30 minutes)

1. Confirm the demo GIF and screenshots are committed.
   `git log --stat -3` should show them in the last commit. If they
   are still only local, open the small PR now.
2. Decide the custom domain question. If yes, buy one and add it to
   Vercel -- 10 minutes. If no, accept that every share link says
   `vercel.app` and move on.
3. Decide the Google OAuth verification question. If submitting today,
   launch is 4 to 6 weeks out. If not, launch day is whenever you are
   ready, and you accept the warning banner.

### This week (one evening)

1. Install Sentry (backend + frontend). 30 minutes.
2. Fix `StatusPage.tsx`. Either hook up a real provider or strip the
   fake numbers. 15 to 30 minutes.
3. `gh repo edit --add-topic ...` and enable Discussions. 5 minutes.

### Launch day (25 minutes)

1. Record the Loom. You do not need it before launch day; record it
   that morning, upload to Loom, and drop the link into the HN body
   post at 8:59 AM.

## Post-launch checkpoints

Within 24 hours of Product Hunt:

- Every PH comment has a reply.
- Top three bugs from PH are opened as GitHub issues.
- `docs/demo.gif` is at the top of the README (it already is).

Within 72 hours of Show HN:

- Every HN reply thread read, not just the direct replies to you.
- One small UX fix merged based on the top complaint.

Within a week:

- Funnel is instrumented: visit, signup, first task, second session.
- "I came from Trello because..." Discussion is up and pinned.
- Sentry has captured at least one real error from a real user.
- The Loom link is in every social bio.

## Reference

- Full strategy, positioning, per-platform playbooks:
  `docs/LAUNCH_AND_GROWTH.md`
- When to post what: `docs/LAUNCH_TIMING.md`
- What is deferred and when to ship it: `docs/FUTURE_WORK.md`
- What is on the site today: `README.md`
