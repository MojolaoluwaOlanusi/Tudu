# Launch and growth

A runbook, not an essay. Every number, template, and step below is what
we would actually do (or already did) to launch Tudu. Update this file
when a tactic stops working.

## Positioning

**One-line pitch:** Tudu is the open-source Kanban with Pomodoro and
optional AI breakdown - fast on mobile, honest about what it does.

**Demo promise:** create a task in English, drag it to Done, watch the
confetti, start a focus timer, see the analytics.

**What you will NOT claim:**

- "Works offline everywhere" - the PWA caches what you have seen; new
  data requires a network.
- "Enterprise SSO" - planned, not shipped. Link to `docs/ENTERPRISE.md`.
- "Scales to any team size" - it is engineered for personal and small
  teams.
- "Replaces Jira" - it is a Kanban, not an issue tracker with JQL.

## Pre-launch checklist

Before the first public post:

- [ ] `LICENSE` exists at the repo root (AGPL-3.0).
- [ ] `README.md` rewritten (this repo's current README).
- [ ] `docs/demo.gif` recorded (15 seconds, under 5 MB).
- [ ] `docs/screenshots/` has 4-6 real screenshots.
- [ ] Hosted demo at a real URL (not `tudu-kanban.vercel.app`).
- [ ] Comparison table on the marketing site (`/` landing).
- [ ] `/docs`, `/help`, `/contact`, `/pricing` all live and populated.
- [ ] `security@` or a single support email that is actively monitored.
- [ ] `/status` page with a real uptime source (Instatus, Better Stack,
      UptimeRobot).
- [ ] Sentry (or equivalent) capturing frontend and backend errors.
- [ ] Privacy policy and Terms of Service published and linked from
      the homepage (required for Google OAuth verification).
- [ ] Google OAuth consent screen verified (takes 4-6 weeks; start
      early).
- [ ] GitHub repo has topics, description, and a demo GIF at the top.
- [ ] Discussions enabled with Q&A and Ideas categories.
- [ ] Pinned issue: "I came from Trello because..." - a real
      conversation, not a marketing hook.

## Asset prep

### Demo GIF (15 seconds)

Script:

1. Focus an empty "New task" field (0-1s).
2. Type "Buy milk tomorrow 9am #personal urgent" (1-6s). Chips appear as
   the NLP parser recognises fields.
3. Submit. Card appears (6-8s).
4. Drag to Done (8-11s). Confetti fires.
5. Click Start 25m on the card (11-13s).
6. Cut to Analytics (13-15s).

Record with ScreenToGif (Windows) or Kap (macOS) at 1080p, 20 fps, under
5 MB, no audio.

### 30-second Loom

Same script with narration: "This is the fastest way to add a task,
here's why the parser makes it faster, here's the confetti, and here's
the Pomodoro - one workflow, no plugins."

### Screenshots

- 1280x800 desktop List view with filters and activity.
- 1280x800 Kanban board with custom columns and a WIP badge.
- 1280x800 Analytics dashboard.
- 1280x800 Marketplace.
- 375x812 mobile List view (shows the topbar board switcher and no
  horizontal scroll).

## Platform playbooks

### Hacker News - Show HN

**Timing:** Tuesday-Thursday, 8-10 AM ET. Do not launch on a Friday or
during a major Apple/Google event.

**Title formula:** `Show HN: Tudu - open-source Kanban with Pomodoro and
optional AI breakdown`

**Body template:**

I built Tudu because I got tired of Trello paywalling basics and of
Linear assuming I work on a dev team.

What it does:

- Kanban with custom columns and WIP limits

- Natural language input ("Buy milk tomorrow 9am")

- Built-in Pomodoro with analytics

- AI task breakdown via Gemini / Groq / local Ollama

- Real-time sync across tabs and devices

What it does not do:

- No SSO yet (planned)

- No Docker yet (planned - this is the most requested feature)

- No offline editing, only offline reading

Tech: PERN stack, raw SQL (no ORM), [Socket.io](https://socket.io/) for real-time, Vite for
the frontend. AGPL-3.0.

Repo: <https://github.com/MojolaoluwaOlanusi/Tudu>
Hosted demo: <https://tudu-kanban.vercel.app>

**Be online for 4 hours.** Answer every top-level comment within 10
minutes. Do not argue; ask questions instead. If someone reports a bug,
thank them and either fix it live or open an issue right then.

### Reddit

Different angle per sub. Do not cross-post the same title.

**r/SideProject**

Title: `I built an open-source Kanban with a free AI breakdown and a
built-in Pomodoro - open to feedback`

Lead with the story. Mention AGPL early. Ask for critique.

**r/webdev**

Title: `Showoff Saturday - a PERN Kanban with Socket.io real-time and
raw SQL`

Focus on the architecture. Link to
`backend/src/services/realtimeService.ts` and
`backend/src/socketServer.ts` directly. Mention the offline queue and
the Standard-Webhooks webhooks.

**r/pernstack**

Title: `Full PERN stack Kanban - what I learned about passing JWT
through a Socket.io handshake`

This one is a technical post, not a launch. Link the code.

**r/selfhosted**

Only after Docker ships. Title: `Tudu - open-source Kanban with a
self-hosted Pro licence (Node + Postgres)`.

Include a `docker-compose.yml` snippet in the post body.

**r/productivity**

Title: `I gave up on Notion for task management for 30 days - here is
what I actually needed`

Focus on the workflow, not the tech. Do not link the repo in the title;
put the link in a comment if someone asks.

### Product Hunt

**Timing:** Tuesday, Wednesday, or Thursday at 12:01 AM PST. Anything
else gets buried.

**Hunter outreach:** 2-4 weeks before. Message 3-5 hunters with the
demo GIF, the pitch, and a 1-sentence ask. Most say no. Ask again in 6
months.

**First comment template:**

Hi Product Hunt!

Tudu is an open-source Kanban that does three things a paid Kanban
usually does not:

1. Free AI breakdown (Gemini, Groq, or local Ollama)

2. A built-in Pomodoro timer with real focus analytics

3. Self-hosting with a Pro licence you own forever

It is honest about what it does not do: no SSO yet, no Docker yet,
offline is read-only.

Ask me anything.

**Hour one:** ask 5 friends to comment a real question and upvote, not
just upvote. Comment replies land better than upvote-only.

### Dev.to / Hashnode / IndieHackers / Lobsters

Publish **one** post, not four. The same article cross-posted looks
spammy.

Topics that work:

- "How I built a real-time Kanban with Socket.io + dnd-kit"
- "Passing JWT through a Socket.io handshake without letting a client
  join someone else's room"
- "Standard Webhooks in a 900-line service"
- "Offline-first React with React Query and IndexedDB"

Link the repo at the bottom, not the top.

### Twitter / X

A thread, not a single tweet:

1. "I built an open-source Kanban that does [thing 1] and [thing 2]."
   Attach the demo GIF.
2. "Here is the [specific technical thing] - short code snippet."
3. "Here is what I would do differently." (Be honest; people retweet
   self-critique.)
4. "Link: \<repo URL\>. If you use it, tell me what breaks."

### LinkedIn

Slower cadence: 1 post every two weeks. Focus on the "why", not the
"what". Case studies and lessons learned work better than product
announcements.

### Discord / Slack communities

Do not join just to drop a link. Join a month before, participate in 5+
conversations, then mention your project once when it is relevant.

## SEO playbook

### Template SEO pages

Concrete list to build and index:

- `/templates/student-kanban` - "Student Kanban Board Template"
- `/templates/freelancer-projects` - "Freelancer Project Board Template"
- `/templates/content-calendar` - "Content Calendar Template"
- `/templates/bug-tracker` - "Bug Tracker Template"
- `/templates/team-sprint` - "Team Sprint Board Template"

Each page needs:

- 300-500 words of honest content (use cases, what it ships with, why).
- 2-3 screenshots.
- A `Try this template` CTA.
- Structured data (`Article` + `SoftwareApplication`).
- Internal links back to `/` and to related templates.

### Blog SEO

Cadence: 1-2 posts per month. Topics with real search volume:

- "Trello vs Jira vs Tudu - an honest comparison" (target: "trello
  alternative")
- "How to run a Kanban for one person" (target: "personal kanban")
- "Free AI task breakdown - which free LLM is actually usable"
- "Self-hosting a Kanban in 2026 - the whole picture"
- "Why the PERN stack still works"

Each post: 1,000-1,500 words, one backlink to the app, one screenshot,
one "Try Tudu free" CTA at the end.

### Programmatic SEO

`/solutions/[slug]` and `/templates/[slug]` exist as routes. Populate
the slugs with real content: `/solutions/freelancers`,
`/solutions/students`, `/solutions/agencies`, `/solutions/designers`,
`/solutions/marketers`. Do not generate spam pages for every city and
industry.

### Backlinks

- AlternativeTo: submit as a Trello alternative.
- Product Hunt: the launch itself creates backlinks.
- awesome-selfhosted (after Docker).
- awesome-pern, awesome-react: `Contributing.md` in each repo describes
  the criteria.
- Sidebar.io, Hacker News, Lobsters: one launch post each.

### Core Web Vitals

Targets: LCP under 2.5s on mobile, CLS under 0.1, INP under 200ms.
Verify with Lighthouse against the deployed app once a quarter.

## GitHub repo as landing page

- README: what it is, what ships today, quickstart, screenshot, demo
  GIF. The README in this repo does that.
- Topics: `kanban`, `trello-alternative`, `pomodoro`, `pern-stack`,
  `react`, `typescript`, `postgres`, `self-hosted`, `productivity`.
- Pinned issues: `good first issue`, `bug`, and one conversational
  discussion ("I came from Trello because...").
- Discussions categories: Q&A, Ideas, Show your work, Announcements.
- Release cadence: at least one release per quarter. Even a version bump
  with no features counts as a signal that the project is alive.

## In-app viral loops

> **None of these are built yet.** They are on `docs/FUTURE_WORK.md`
> for future sprints.

- **Share footer.** Every board shared via email ends with "Built with
  Tudu - try it free".
- **Referral programme.** Invite 3 friends, unlock a Pro month.
- **Template install credit.** Template cards show a "made by
  @author" with a link to their profile.
- **Free-template watermark.** A "Made with Tudu" pill in the corner of
  any board installed from a free template. Remove on Pro.
- **Changelog as a shareable moment.** Every release has a one-image
  changelog shareable to Twitter / LinkedIn.

## Email sequences

**Welcome (immediately after signup):**

Subject: `Welcome to Tudu - one tip to start`

Body: how to add your first task in English, one screenshot, one
question ("What are you trying to organize?").

**Day 3:**

Subject: `Have you tried the Pomodoro yet?`

Body: start a 25-minute session, one screenshot, one tip about the
background timer.

**Day 7:**

Subject: `Tudu Pro - is it worth it for you?`

Body: an honest comparison of Free and Pro. Explain what Pro costs and
why. No pressure.

**Day 30:**

Subject: `What are you using Tudu for?`

Body: a question, not a pitch. Reply-to goes to a real inbox.

**Dormant 60+ days:**

Subject: `Should we delete your Tudu account?`

Body: offer to delete. Some will reply "yes". Others will re-engage.
Being willing to lose users builds trust.

## Onboarding nudges (in-app, not email)

- Day 0: the tour prompt (already ships).
- Day 1: "You have not created a task yet. Want to try one?"
- Day 3: "Invite a teammate to see shared boards in action."
- Day 7: "You are one task away from 10 completed. Finish it and get a
  milestone confetti burst."
- Day 30: "You have used Tudu for a month. Here are your numbers."

Nudges should be dismissible forever, not just for a day.

## Paid channels

**Do not run paid ads until you have 100 active users from organic.**
Organic is where the message is tested.

Once you do run them:

- **Budget:** $200/month, one channel at a time.
- **Channel 1:** Reddit ads targeted at `r/productivity`,
  `r/selfhosted`, `r/webdev`. Small images, honest copy.
- **Channel 2:** Google Ads on "trello alternative",
  "free kanban app", "pomodoro kanban".
- **ROAS target:** 3x in the first 30 days. Below that, stop and
  reconsider.

## Metrics dashboard

Funnel to track weekly:

1. **Visit** - unique sessions on the marketing site.
2. **Signup** - new accounts.
3. **First task** - accounts that create at least one task.
4. **Second session** - accounts that return within 7 days.
5. **Invite** - accounts that send at least one invite.
6. **Pay** - accounts with an active Pro subscription.

Watch the ratios, not the absolute numbers. A week with 100 signups and
2 first-tasks is worse than a week with 20 signups and 15 first-tasks.

## Weekly cadence

- **Monday:** review the funnel. Note one thing to improve.
- **Tuesday-Thursday:** ship. Small PRs, small posts, small emails.
- **Friday:** write a changelog entry. Ship one external post.
- **Saturday:** read user replies. Reply to every one.

## What not to do

- **Do not buy stars.** Fake stars poison every future conversation.
- **Do not buy fake reviews.** Same reason.
- **Do not spam communities.** One post per community per quarter.
- **Do not run paid ads before organic works.** You will burn money
  learning nothing.
- **Do not over-promise.** Every feature you claim must be one click
  away in the app.
- **Do not ignore bug reports during a launch.** They are the only
  feedback that matters for the first 48 hours.
