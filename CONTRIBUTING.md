# Contributing to Tudu

Thanks for taking a look. Tudu is a small PERN application, and every
issue, PR, and doc improvement makes a difference.

There are four ways to help, roughly in order of impact:

1. **Report a bug** - https://github.com/MojolaoluwaOlanusi/Tudu/issues/new/choose
2. **Suggest a feature** - open an issue, or check `readme/FUTURE_WORK.md`
   first to see if it is already planned.
3. **Improve the docs** - anything in `docs/`, `readme/`, or the README.
4. **Send code** - a PR for a scoped bug or feature.

This file covers how to get set up, what we expect of a PR, and what we
probably will not accept so you do not waste your time.

---

## Before you open a PR

- Search open and closed issues first. Chances are good that someone hit it
  already.
- Read `readme/FUTURE_WORK.md`. It lists known deferred work; if your idea
  is on that list, open an issue to discuss scope before writing code.
- Run the local test suite (see "Testing" below). PRs that arrive red will
  be asked to fix CI first, not merged.
- One feature per PR. If it touches auth, billing, marketplace, or the CI
  config, open an issue first.

---

## Local setup

See the README's "Quick start" section, or `docs/SELF_HOSTING.md` for a
long-form, step-by-step install.

Short version:

~~~bash
cd backend  && npm install && cp .env.example .env
cd ../frontend && npm install && cp .env.example .env
cd ../backend  && npm run migrate
# in two terminals:
cd backend  && npm run dev     # http://localhost:5000
cd frontend && npm run dev     # http://localhost:5173
~~~

---

## Workflow

### Branch names

- `feat/<short-slug>` - new feature
- `fix/<short-slug>` - bug fix
- `chore/<short-slug>` - tooling, deps, housekeeping
- `docs/<short-slug>` - docs only

### Commits

Conventional commits. Scope is the area of the change:

- `feat(board): ...`
- `fix(auth): ...`
- `chore(qa): ...`
- `docs(readme): ...`

Never commit with a red test suite. Do not batch unrelated fixes into one
commit.

### Pull requests

Use the PR template. If the change is visual, attach a screenshot or a
15-second GIF before / after.

---

## Code conventions

- **TypeScript strict.** `tsconfig.json` is not loosened in PRs.
- **Reuse existing primitives.** Hooks in `frontend/src/hooks/`, stores in
  `frontend/src/store/`, components in `frontend/src/components/`. A new
  hook is fine; a parallel one that does the same job as an existing one
  is not.
- **No new runtime dependencies without discussion.** Open an issue, name
  the dependency, name the alternative, and wait for a reply. The default
  is "no".
- **No touching `backend/src/config/features.ts`** (the feature-flag map)
  without a linked issue. It is the single source of truth for tier
  gating.
- **Keep controllers thin.** Business logic lives in `backend/src/services/`.
- **Tests next to the change.** New endpoint -> backend integration test.
  New hook -> frontend unit test. Route change -> e2e.

---

## Database migrations

`backend/migrations/init.sql` is the only migration today. Rules:

- **Idempotent.** Every statement must be `CREATE TABLE IF NOT EXISTS` /
  `ADD COLUMN IF NOT EXISTS` /
  `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;`.
- **Never edit a migration that has run in production.** Add a new one.
- **Deploy order is migrate -> backend -> frontend.** A frontend PR must
  not depend on a migration that has not landed.
- **Never drop a column the code still reads.** Soft-delete, backfill,
  then drop in a later PR.

---

## Testing

Backend:

~~~bash
cd backend
npm run test:unit          # mocked, no DB needed
npm run test:integration   # against a real Postgres
~~~

Integration tests hit `DATABASE_URL` in `backend/.env`. Point that at a
throwaway database if you do not want them touching your dev data.

Frontend:

~~~bash
cd frontend
npm test -- --run          # vitest
npm run build              # tsc + vite build
~~~

E2E:

~~~bash
cd frontend
npx playwright install chromium   # first time only
npm run test:e2e                  # backend must be running on :5000
~~~

---

## Review expectations

- One reviewer approves before merge.
- Reviews are for correctness, not style. Style is enforced by ESLint
  and the existing code.
- A stale PR (no activity for 30 days) will be closed with a note. You can
  reopen it.

---

## What we probably will not accept

- Re-litigating the design system without a screenshot mockup
- Adding analytics / trackers (Vercel Analytics is already there and only
  there)
- Swapping the data layer (Prisma, Drizzle, ORMs) - the repo uses raw
  `pg.Pool` on purpose
- Removing type checks or `strict: true`
- Skipping tests to save time
- Bundling multiple features into one PR

If in doubt, open an issue and ask.

---

## Becoming a maintainer

Three merged PRs that required code review, plus six months of activity,
plus a genuine interest in the product. Ask in a Discussion.

---

## Code of Conduct

This project follows the
[Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
By participating you agree to its terms.