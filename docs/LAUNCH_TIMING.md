# Launch timing

A calendar companion to `docs/LAUNCH_AND_GROWTH.md`. That file is the
strategy; this one is the when.

The short version: **do not launch on all platforms at once.** They
compete for the same attention, and each rewards a different kind of
engagement. The winning pattern is a sequenced launch over two to three
weeks.

## TL;DR

| Platform | When | Why |
|---|---|---|
| Product Hunt | Tuesday or Wednesday, 12:01 AM PT | Structured 24-hour window, permanent DR-91 backlink |
| Show HN | Two to four days later, 9:00-11:00 AM ET | Rewards a sharpened technical pitch, not a same-day cross-post |
| Reddit | The following week, per-sub timing | Different subs peak on different days |
| X / LinkedIn / Dev.to | Week after that | Amplification and long-tail SEO, not the main event |

All dates assume a launch in a normal business week. Avoid US public
holidays and major tech events (Apple WWDC, Google I/O, Meta Connect) --
they bury everything else on every feed.

## Prerequisites

Do not schedule anything until all of these are true.

- `docs/demo.gif` recorded. 12-15 seconds, under 5 MB. Product Hunt's
  gallery is empty without it and HN readers bounce.
- `docs/screenshots/` populated with at least four PNGs (list, board,
  analytics, mobile). The README references them; a broken image at the
  top of the repo is worse than no image.
- README renders correctly on GitHub. Check: demo GIF visible, badges
  not 404, mermaid diagram renders.
- Hosted demo URL works. Not the Vercel default subdomain --
  a custom domain reads as more permanent.
- The two Docker-requiring venues (`r/selfhosted`,
  `awesome-selfhosted`) are off the list. Docker is deliberately
  deferred (see `NEXT_STEPS.md` Section 7); do not mention either
  platform in launch copy.
- You have between four and eight hours free on the Product Hunt day
  and the same on the Show HN day. If you cannot be online, postpone.

## The sequence

### Day 1: Product Hunt (Tuesday or Wednesday, 12:01 AM PT)

**Why this day:** Two datasets from 2026 point in opposite directions.

- For ranking, Saturday is the easiest (median 266 points, vs 360 on
  Wednesday) because about 3x fewer products launch.
- For reach, Tuesday is the busiest day (875 launches in six months)
  but has the weakest average upvote count (142). Sunday is the
  quietest day (189 launches) with the best average (250 upvotes) and a
  39.7 percent chance of top 3 versus 8.6 percent on Tuesday.

For a developer-focused product that needs developers and technical
buyers, a Saturday top 5 badge is worth less than a Tuesday top 10 that
reaches the right people. Pick Tuesday or Wednesday and accept the
higher competition.

**Why 12:01 AM PT:** Product Hunt's feed resets at midnight Pacific.
Anything launched later in the day starts the 24-hour window with fewer
hours to accumulate votes. 12:01 AM is 08:01 WAT.

**Practical notes:**

- A hunter matters. Launches with a hunter who has 10+ hunts average 235
  upvotes versus 131 without. A solo maker averages 123; a two or three
  person team averages 188. Line up a hunter two to four weeks ahead.
- You must be online for 24 hours. Reply to every comment within 15
  minutes during peak hours (09:00-14:00 PT, 05:00-10:00 PT, and the
  last hour before midnight PT).
- 89 percent of top 5 makers reply to every comment. Do not be the 11
  percent.

### Day 3-5: Hacker News (Thursday, 9:00-11:00 AM ET)

**Why two to four days after PH:** Users who find you via Product Hunt
will file bugs and feature requests. Four days gives you time to fix
the embarrassing ones and to sharpen the technical pitch. It also
means you can reference PH reception as one line of social proof
without it reading as a coordinated blast.

**Why 9:00-11:00 AM ET:** Catches the East Coast morning and late
Europe. Monday morning is bad (people clearing inboxes). Friday
afternoon is bad (engagement collapses). Weekends are bad.

**Title format:** `Show HN: Tudu - self-hosted Kanban with Pomodoro and
optional AI breakdown`

Rules: 80 characters max, plain descriptive, no exclamation marks, no
"10x" or "game-changer", no "Show HN:" prefix within the body.

**Founder comment:** Post it as your own first reply immediately after
submitting. 150 to 250 words. Structure:

1. Why you built it (one sentence).
2. What it does (three to five bullets, no marketing language).
3. How it works (one or two technical sentences).
4. What is free versus what is paid.
5. Known limitations, stated plainly.
6. A specific question you want feedback on.

**Do not ask anyone to upvote** -- not even in private DMs. HN
penalises it with account bans and the vote is silently weighted
against you. Upvotes must come from genuine traffic.

**What to do for the first two hours:** nothing but HN. Every reply
within 10 minutes. Every "why did you not do X" answered with a
question, not a defense.

### Week 2: Reddit (per-sub timing)

| Subreddit | Best day / time | Notes |
|---|---|---|
| r/SideProject | Wednesday 18:00 UTC, or Sunday afternoon | 864K members, 353 posts per day. Show-and-tell gets similar traction to everything else. |
| r/webdev | Tuesday to Thursday, 08:00-11:00 AM ET | 2M+ members. Engagement drops 40 percent or more on Friday afternoons and weekends. |
| r/selfhosted | Weekday evenings, 18:00-20:00 ET, or weekends | Do not post until Docker ships. The first comment will be "where is the compose file?" and you have no answer yet. |

**Account age matters.** A brand-new account posting a link is
silently removed by Reddit's spam filter before the moderators ever
see it. Spend a week commenting in the target subs before you post.

**Different angle per sub, different title per sub. Do not cross-post
identical copy.**

### Week 3: X / LinkedIn / Dev.to

- **X:** Tuesday or Wednesday at 08:00 AM ET for a founder launch
  thread. For developer-tool content specifically, 10:00-11:00 AM ET
  beats early morning because developers are not awake at 06:00.
- **LinkedIn:** Tuesday to Thursday, 07:00-10:00 AM in your audience's
  timezone. B2B SaaS posts drop sharply on weekends.
- **Dev.to / Hashnode:** Publish one technical post, not the same
  article cross-posted four ways. Link the repo at the bottom, not the
  top. Topics that work: "Passing JWT through a Socket.io handshake",
  "Standard Webhooks in a 900-line service", "Offline-first React with
  React Query".

## The founder's day plan (WAT, UTC+1)

If you launch Product Hunt on a Tuesday, your day looks like this.
Times are West Africa Time, the maintainer's timezone; adjust if you
are elsewhere.

| Local time (WAT) | What | Notes |
|---|---|---|
| 07:55 Tuesday | Open Product Hunt, ready to post | Launch goes live at 12:01 AM PT = 08:01 WAT |
| 08:01 | Product Hunt live | First comment ready before you submit |
| 08:00-10:00 | Reply to every PH comment within 15 min | Highest traffic window (people on commute) |
| 10:00-13:00 | Fix any bug reported in PH comments | Do not commit to a fix you cannot ship today |
| 13:00 | Post the X thread | 08:00 AM ET |
| 14:00-17:00 | Reply to PH and X comments | Second highest traffic window |
| 19:00-21:00 | Reddit r/SideProject (optional first post) | 18:00 UTC |
| 23:00 | Last PH check before sleep | Missed comments hurt ranking tomorrow |
| 06:00 Wednesday | First-thing PH check | Catches the last 2 hours of the 24-hour window |
| 13:00-16:00 Thursday | Show HN submission | 9-11 AM ET, two days after PH |
| 13:00-15:00 | Reply to every HN comment within 10 min | First two hours decide visibility |

That is a long Tuesday. If you can only take one day off work, take
the Product Hunt day -- HN replies can be managed from a phone between
meetings.

## What not to do

- **Do not launch Product Hunt and Show HN on the same day.** HN
  rewards a technical story that has had a few days of bug fixes
  behind it, not a same-day cross-post.
- **Do not ask for upvotes anywhere.** HN bans. PH flags. Twitter
  can't detect it but everyone recognises the pattern.
- **Do not cross-post identical copy across subreddits.** Rewrite the
  title and the first paragraph for each sub; the subs overlap and
  moderators talk.
- **Do not schedule anything for a Monday.** The first day back is
  where every other launch also decided to post.
- **Do not launch without the demo GIF.** You will be asked for one
  in the first ten comments on every platform.
- **Do not touch paid channels for the first four weeks.** Organic is
  where the message is tested. Ads before that is money spent learning
  nothing.

## Post-launch checkpoints

Within 24 hours of Product Hunt:

- Every PH comment has a reply.
- The top three bugs reported are opened as GitHub issues.
- `docs/demo.gif` is at the top of the README.

Within 72 hours of Show HN:

- Every HN reply thread has been read, not just the direct replies to
  you.
- One small UX fix merged based on the top complaint.

Within a week:

- The funnel is instrumented: visit, signup, first task, second
  session. See `docs/LAUNCH_AND_GROWTH.md` for the exact metrics.
- A "I came from Trello because..." GitHub Discussion exists.
- The Pinned issues are up.

## Reference

- Full strategy, positioning, asset prep, per-platform playbooks:
  `docs/LAUNCH_AND_GROWTH.md`
- What is deferred and when to ship it: `readme/FUTURE_WORK.md`
- What is on the site today: `README.md`