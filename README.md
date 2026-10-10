# Tudu - Advanced PERN Stack Todo Application

A senior-level, feature-rich todo application with a friendly, brush-stroke aesthetic. Tudu includes advanced features like real-time collaboration, AI-powered task breakdown, Kanban board, Pomodoro timer, and a responsive header layout tuned for mobile and desktop.

## Features

### Core Functionality
- **Authentication**: OAuth (Google & GitHub) and Email/Password with JWT tokens
- **User Isolation**: Each user sees only their tasks
- **Categories**: Work, Personal, Study with color coding
- **Priorities**: Low, Medium, High with visual indicators
- **Due Dates**: Date picker with overdue logic and notifications
- **Sub-tasks**: Checklists within tasks with progress tracking

### Advanced Features
- **Kanban Board**: Drag-and-drop task management (To-do, Doing, Done)
- **Real-time Sync**: Socket.io for instant updates across devices
- **Collaboration**: Share lists with other users via email
- **Activity Log**: Track all task actions with timestamps
- **Natural Language Input**: Type "Buy milk tomorrow at 9am #personal" to auto-parse
- **AI Task Breakdown**: Break complex tasks into sub-tasks using a free AI provider (Gemini, Groq or local Ollama)
- **Pomodoro Timer**: Full Pomodoro sessions with time tracking, background-safe countdowns, and a longer 10-second finish alarm with desktop notifications and vibration feedback
- **Analytics Dashboard**: Chart.js dashboard of completion rates, time spent and
  priority distribution, with a date-range filter and CSV/JSON export

### User Experience
- **Dark/Light Mode**: Toggle between themes with smooth transitions
- **Responsive Design**: Mobile-first approach with 44px touch targets on mobile, plus a compact header that stays stable on small screens without wrapping or squeezing controls
- **Instant Search & Filters**: Real-time filtering by status, priority, category
- **Friendly UI**: Brush-stroke aesthetic matching the brand design
- **Confetti & Micro-interactions**: A burst when a task is completed, plus
  stroke-on checkmarks and spring animations
- **Reduced Motion**: Every animation is disabled under `prefers-reduced-motion`
- **Onboarding Tour**: A friendly 18-step guided tour offered to new accounts,
  with a spotlight over each feature (see [Onboarding Tour](#onboarding-tour))

## Branding

The wordmark is a handwritten brush-stroke "tudu" with a green checkmark
sweeping underneath. Both brand marks are the original raster artwork:

| File | Used for |
|---|---|
| `public/wordmark.png` | The logo on the light theme (black lettering, green check) |
| `public/wordmark-dark.png` | The logo on the dark theme (light lettering, same green check) |
| `public/favicon.png` | The browser tab icon |

The dark theme uses a separate pre-recoloured asset rather than a CSS filter.
`invert(1)` flips every colour channel, so applying it to the wordmark would
turn the green checkstroke magenta as well as lightening the lettering — the
brand colour would not survive. `wordmark-dark.png` is the same artwork with the
lettering recoloured to near-white (`#f2f4f3`) and the checkstroke kept at the
brand green (`#22c55e`), with the original alpha channel untouched so the
anti-aliased brush edges stay smooth. The `Wordmark` component
(`src/components/common/Wordmark.tsx`) swaps the source from the theme store.

| Token | Value | Used for |
|---|---|---|
| `--color-accent` | `#22c55e` | Green accent, sampled from the wordmark's checkmark |
| `--color-bg` (light) | `#fafafa` | Off-white paper background |
| `--color-bg` (dark) | `#1a1a1a` | Dark grey background |

### Surfaces

- `.card` - opaque panels with a 1px brush-textured edge
- `.glass` - frosted panels for floating content (header, toasts)
- `.scrim` - blurred, tinted modal backdrop

Both `.glass` and `.scrim` combine a **real background colour** with a
`backdrop-filter` blur. Neither is fully transparent, so text never sits on a
bare blur and stays readable over whatever is behind it.

## Tech Stack

### Frontend
- **Framework**: React 18 with Vite
- **State Management**: Zustand
- **Data Fetching**: React Query (@tanstack/react-query)
- **Drag & Drop**: @dnd-kit
- **Charts**: Chart.js with react-chartjs-2
- **Real-time**: Socket.io-client
- **Date Handling**: date-fns, chrono-node
- **Routing**: React Router DOM
- **Styling**: Tailwind CSS
- **Language**: TypeScript

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL (hosted on Neon)
- **ORM**: pg (PostgreSQL client)
- **Authentication**: Passport.js with OAuth (Google, GitHub)
- **Real-time**: Socket.io
- **AI**: Gemini / Groq / Ollama (pluggable, all free - no SDK, plain HTTP)
- **Date Parsing**: chrono-node, date-fns
- **Validation**: Zod
- **Security**: Helmet, express-rate-limit
- **Cron Jobs**: node-cron for overdue tasks
- **Language**: TypeScript

### Deployment
- **Frontend**: Vercel
- **Backend**: Render
- **Database**: Neon (PostgreSQL)

## Project Structure

```
tudu/
├── backend/
│   ├── src/
│   │   ├── config/          # Database, passport, socket config
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/      # Auth, error handling, validation
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic (AI providers, NLP, activity)
│   │   ├── utils/           # Helper functions
│   │   ├── app.ts           # Express app configuration
│   │   └── server.ts        # Server entry point with Socket.io
│   ├── migrations/          # SQL migration files
│   ├── .env.example         # Environment variables template
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── auth/        # Authentication components
│   │   │   ├── tasks/       # Task-related components
│   │   │   ├── kanban/      # Kanban board components
│   │   │   ├── pomodoro/    # Pomodoro timer components
│   │   │   ├── analytics/   # Analytics dashboard components
│   │   │   ├── collaboration/ # Sharing components
│   │   │   ├── common/      # Reusable UI components
│   │   │   └── layout/      # Layout components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── store/           # Zustand stores
│   │   ├── services/        # API and socket services
│   │   ├── types/           # TypeScript type definitions
│   │   ├── utils/           # Helper functions
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── public/              # Static assets (wordmark, app icon)
│   ├── .env.example
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (Neon account recommended)
- Google OAuth credentials (Google Cloud Console)
- GitHub OAuth credentials (GitHub Developer Settings)
- An AI provider key - **optional**, only needed for the AI breakdown feature.
  All supported providers are free and need no credit card; see
  [AI Task Breakdown](#ai-task-breakdown). Without a key the rest of the app
  works normally and only that feature is disabled.

### Getting OAuth Credentials

#### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Go to "APIs & Services" → "Credentials"
4. Click "Create Credentials" → "OAuth client ID"
5. Select "Web application"
6. Add authorized redirect URIs:
   - Development: `http://localhost:5000/auth/google/callback`
   - Production: `https://your-backend-url.com/auth/google/callback`
7. Copy the Client ID and Client Secret to your `.env` file

#### GitHub OAuth Setup
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the application details:
   - Application name: "Tudu"
   - Homepage URL: `http://localhost:5173` (dev) or your production URL
   - Authorization callback URL: `http://localhost:5000/auth/github/callback` (dev) or your production callback URL
4. Copy the Client ID and generate a Client Secret
5. Add both to your `.env` file

#### AI Provider Key (optional)

Only needed for the AI breakdown feature. Pick one - all are free and none
require a credit card. Full comparison in [AI Task Breakdown](#ai-task-breakdown).

1. **Gemini (recommended)** - go to [Google AI Studio](https://aistudio.google.com/apikey),
   sign in with a Google account, click "Create API Key"
2. **Groq** - go to [console.groq.com/keys](https://console.groq.com/keys) and create a key
3. **Ollama** - no key at all; just run `ollama serve` locally

Copy the key into your `.env` file.

#### Neon Database Setup
1. Go to [Neon](https://neon.tech)
2. Sign up and create a new project
3. Copy the connection string from the dashboard
4. Add it to your `.env` file as `DATABASE_URL`

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and fill in the following:
   ```
   DATABASE_URL=postgresql://user:password@host:5432/tudu
   JWT_SECRET=your-secret-key-here (generate a random string)
   JWT_EXPIRES_IN=7d
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback
   GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-client-secret
   GITHUB_CALLBACK_URL=http://localhost:5000/auth/github/callback
   AI_PROVIDER=gemini
   GEMINI_API_KEY=your-free-gemini-key
   SESSION_SECRET=your-session-secret (generate a random string)
   FRONTEND_URL=http://localhost:5173
   PORT=5000
   NODE_ENV=development
   ```

      **Important**: For JWT_SECRET and SESSION_SECRET, use a strong random string. You can generate one using:
   - Node.js: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - Online: [Random String Generator](https://www.random.org/strings/)

4. **Run database migrations**
   ```bash
   npm run migrate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```
   Backend will run on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` (no changes needed for local development):
   ```
   VITE_API_URL=http://localhost:5000
   VITE_SOCKET_URL=http://localhost:5000
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```
   Frontend will run on `http://localhost:5173`

## Database Schema

### Tables

**users**
- id (UUID, primary key)
- email (VARCHAR, unique)
- name (VARCHAR)
- password (VARCHAR) - hashed password for email auth
- provider (VARCHAR) - 'google', 'github', or 'email'
- provider_id (VARCHAR)
- avatar_url (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

**tasks**
- id (UUID, primary key)
- user_id (UUID, foreign key to users)
- title (VARCHAR)
- description (TEXT)
- category (VARCHAR) - 'work', 'personal', 'study'
- priority (VARCHAR) - 'low', 'medium', 'high'
- due_date (TIMESTAMP)
- status (VARCHAR) - 'todo', 'doing', 'done'
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

**subtasks**
- id (UUID, primary key)
- task_id (UUID, foreign key to tasks)
- title (VARCHAR)
- completed (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

**activity_log**
- id (UUID, primary key)
- user_id (UUID, foreign key to users)
- task_id (UUID, foreign key to tasks)
- action (VARCHAR)
- details (JSONB)
- created_at (TIMESTAMP)

**shared_lists**
- id (UUID, primary key)
- owner_id (UUID, foreign key to users)
- shared_with_user_id (UUID, foreign key to users)
- task_ids (UUID array)
- permissions (VARCHAR) - 'read_write' or 'read_only'
- created_at (TIMESTAMP)

**pomodoro_sessions**
- id (UUID, primary key)
- user_id (UUID, foreign key to users)
- task_id (UUID, foreign key to tasks)
- duration (INTEGER) - in minutes
- completed_at (TIMESTAMP)
- created_at (TIMESTAMP)

## API Endpoints

### Authentication
- `POST /auth/register` - Register with email/password
- `POST /auth/login` - Login with email/password
- `POST /auth/google` - Initiate Google OAuth
- `POST /auth/github` - Initiate GitHub OAuth
- `GET /auth/google/callback` - Google OAuth callback
- `GET /auth/github/callback` - GitHub OAuth callback
- `GET /auth/me` - Get current user info
- `POST /auth/logout` - Logout user

### Tasks
- `GET /api/tasks` - List tasks (supports query params for filtering)
- `POST /api/tasks` - Create new task (parses natural language unless `naturalLanguage: false`)
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `GET /api/tasks/overdue` - Get overdue tasks
- `POST /api/tasks/parse` - Preview how a sentence will be interpreted (creates nothing)

### Subtasks
- `GET /api/tasks/:taskId/subtasks` - List subtasks
- `POST /api/tasks/:taskId/subtasks` - Create subtask
- `PUT /api/subtasks/:id` - Update subtask
- `DELETE /api/subtasks/:id` - Delete subtask

### Sharing
- `POST /api/share` - Share list with user
- `GET /api/shared-lists` - Get shared lists
- `POST /api/share/accept` - Accept shared list

### Activity
- `GET /api/activity` - Get user activity log
- `GET /api/activity/:taskId` - Get activity for specific task

### Pomodoro
- `POST /api/pomodoro/start` - Start a focus session (optionally against a task)
- `POST /api/pomodoro/complete` - Complete a session
- `GET /api/pomodoro/active` - The in-flight session, so a refresh does not lose the timer
- `GET /api/pomodoro/stats` - Time, session and daily/weekly breakdowns (`?days=&timezoneOffset=`)

### AI
- `GET /api/ai/status` - Which AI provider is configured, and whether it is usable
- `POST /api/ai/breakdown` - Suggest sub-tasks for a task title

### Analytics
All three take `?timezoneOffset=` and all are scoped to the signed-in user.

- `GET /api/analytics/overview` - Task counts (total/todo/doing/done/overdue),
  completion rate, priority and category splits, and lifetime focus totals
- `GET /api/analytics/completed-tasks` - Completions bucketed over time
  (`?range=week|month|quarter`), with the previous period for comparison
- `GET /api/analytics/time-spent` - Focus minutes per category and per task
  (`?range=week|month|quarter`)

`range` controls both the window and the granularity: `week` and `month` bucket
by day, `quarter` buckets by week. An unrecognised value falls back to `week`.

Completions are derived from `activity_log` (`action = 'task_completed'`)
rather than `tasks.updated_at`, because the tasks table has no `completed_at`
column and `updated_at` also changes on ordinary edits.

### Analytics Dashboard
The Analytics page (`/analytics`) renders the three endpoints with Chart.js:
a bar chart of tasks completed, a pie chart of time spent by category, and a
line chart of the productivity trend, plus a priority-distribution pie and a
per-task table. The range filter (7 days / 30 days / 12 weeks) drives the
bucketed endpoints.

Both the page and Chart.js are code-split via `React.lazy`, so the chart
library is only downloaded by users who open the page.

Export produces a CSV or JSON snapshot of everything on screen. Cells beginning
with `=`, `+`, `-` or `@` are prefixed with a quote, because task titles are
user-supplied and would otherwise execute as formulas in Excel or Sheets.

## Socket.io Events

The connection is authenticated during the handshake: the client sends its JWT
via `auth.token` and the server joins it to the `user-<id>` room automatically.
There is no client-supplied room request, so a socket cannot join a room that
isn't its own.

### Client → Server
- _(none)_ - rooms are assigned by the server from the verified token

### Server → Client
- `task:create` - Task created
- `task:update` - Task edited
- `task:move` - Task moved between columns
- `task:delete` - Task deleted
- `socket:ready` - Sent on connect with the bound `userId`

Each task event carries the full task plus an `actorId`, letting a client tell
its own echo apart from a change made in another tab or by a collaborator.

The following sharing events are also emitted:
`share-invited`, `share-accepted`, `share-declined`, `share-removed`,
`shared-lists-changed`, `shared-task-updated`, `shared-task-deleted`.

## Natural Language Input Syntax

Type a task the way you'd say it. The parser understands three things: a date,
a category hashtag, and a priority keyword. Everything it recognises is stripped
from the title.

**Dates/Times** (chrono-node):
- "Buy milk tomorrow" · "Meeting at 3pm" · "Submit report next Monday"
- "Call mom tomorrow at 9am" · "Pay rent friday" · "Standup next week"

Dates resolve in **the user's own timezone** - the client sends its clock and
offset, so "9am" means 9am where the person typing is.

**Categories** (hashtags):
- `#work` · `#personal` · `#study`

Any other hashtag is left alone in the title rather than being discarded.

**Priorities** (keywords, checked in order):
- High: "urgent", "asap", "as soon as possible", "immediately", "critical", "high priority"
- Medium: "medium priority", "normal priority"
- Low: "low priority", "no rush", "not urgent", "whenever"

**Examples**:
- "Buy milk tomorrow at 9am #personal" → Title: *Buy milk*, Due: tomorrow 9am, Category: personal
- "Finish report urgent #work" → Title: *Finish report*, Priority: high, Category: work
- "Study for exam next week #study" → Title: *Study for exam*, Due: next week, Category: study
- "Pay rent friday low priority #personal" → Title: *Pay rent*, Due: friday, Priority: low, Category: personal

**How it is applied**

`POST /api/tasks` parses the title automatically and fills in only the fields
the caller left blank, so an explicit `category` or `priority` always wins. Pass
`"naturalLanguage": false` to store the title verbatim.

In the UI the new-task form previews the result live as you type and leaves the
fields alone until you press **Use these details**.

## Pomodoro Timer

Press **Start 25m** on any task to begin a focus session. The timer appears in
the header on every screen, survives a page refresh, and is logged to your stats
automatically when it reaches zero.

### How it works

- **One session at a time.** Starting a second timer would silently replace the
  first, so the buttons explain that a session is already running.
- **Pause, resume and discard** are all available. Discarding leaves the backend
  row uncompleted, which the stats count separately as *abandoned* rather than
  quietly inflating your totals.
- **Completion is logged exactly once.** A single `PomodoroRunner` drives the
  countdown for the whole app, so the header timer and the card timer cannot
  race and log the same session twice.
- **The countdown follows the wall clock.** A running session is anchored to an
  absolute end timestamp and every tick recomputes the remaining seconds from
  `Date.now()`, so a throttled (or suspended) background tab still lands on zero
  at the right moment. The runner also resyncs on `visibilitychange`/`focus`,
  and a one-shot timeout is aimed straight at the deadline.
- **You notice when it ends.** A longer ~10-second melodic alarm (with a mute/unmute
  toggle on the timer pill), a desktop notification - permission is requested when
you press Start - a "Time's up!" tab title, a vibration buzz on supported
  devices and a toast.
- The **header remains stable and responsive** on desktop and mobile. The compact
  timer keeps a sensible width, prevents awkward wrapping, and stops other
  controls from being squeezed or pushed off-screen on smaller devices.
- The **Stats** page (nav bar) shows today / this week / all time, a seven-day
  bar chart, time per task, and your recent sessions.

### Timezones

`pomodoro_sessions` stores naive UTC timestamps, so two places have to convert
them to *your* wall clock, and the browser sends its `getTimezoneOffset()`
along with the request:

- "Today" and "This week" are grouped by **your** calendar day, not the
  server's.
- The daily chart's date labels use the same wall clock as the SQL buckets, so
  the bars line up with the right days.

Without this, a session finished at 23:30 UTC counts as yesterday for a UTC
viewer but as today for someone at UTC+5.

## AI Task Breakdown

Open a task, expand its sub-tasks, and press **Break this down**. The AI
suggests a list of steps, which you can edit, untick, delete or add to before
anything is saved.

### Choosing a provider (all free, none need a card)

The provider is chosen with the `AI_PROVIDER` environment variable. No vendor
SDK is used - every provider is called over plain HTTP, so there is nothing to
install and no vendor lock-in.

| `AI_PROVIDER` | Needs an API key? | Card needed? | Get a key |
|---|---|---|---|
| `gemini` (default) | Yes | **No** - the free tier does not require linking billing | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `groq` | Yes | **No** - free plan | [console.groq.com/keys](https://console.groq.com/keys) |
| `ollama` | No | **No** - runs on your own machine | `ollama serve` then `ollama pull llama3.2` |

**Gemini** is the default and needs only a Google account. Its free tier covers
everyday use; only the higher Tier 1 rate limits require linking a billing
account, which this project never asks you to do.

**Groq** is the fastest option and also has a documented free plan
(~30 requests/minute, ~1000/day).

**Ollama** runs the model locally. It needs no account, no key and no network,
which makes it the only option with no third party involved at all - at the cost
of downloading a model and having enough RAM to run it.

### Setup

```bash
# 1. Get a free key from Google AI Studio
#    https://aistudio.google.com/apikey

# 2. Add it to backend/.env
AI_PROVIDER=gemini
GEMINI_API_KEY=your-key-here

# 3. Restart the backend. Check it picked up:
curl http://localhost:5000/api/ai/status -H "Authorization: Bearer <token>"
# {"provider":"gemini","configured":true,"envVar":"GEMINI_API_KEY"}
```

To switch providers, change one line - no code changes needed:

```bash
AI_PROVIDER=groq
GROQ_API_KEY=your-groq-key
```

Or run it fully locally:

```bash
ollama serve
ollama pull llama3.2
AI_PROVIDER=ollama
```

### How it behaves

- **Nothing is saved until you press "Add ... to task"** - the suggestions are a
  starting point you curate, not an automatic change.
- `POST /api/ai/breakdown` is rate limited to **10 requests per minute** per
  client, since it calls an external provider.
- If no key is configured the endpoint returns a clear `503` explaining exactly
  which variable to set, rather than failing silently.
- Provider errors are translated into plain language: a rate limit, a rejected
  key, a timeout and an unreachable local Ollama each get their own message,
  and the modal offers a "Try again" button.

## Onboarding Tour

Tudu has a lot of surface area, so new accounts are offered a short guided tour
the first time they sign in.

### How it behaves

- The welcome modal appears **once** for a brand new account, offering three
  deliberately different ways out:
  - **Show me around** - starts the tour.
  - **Tapping outside the modal** (or *Maybe later*, or `Esc`) - dismisses it and
    it is offered again **a week later**.
  - **Don't show again** - opts out permanently.
- The tour itself can be abandoned at any point. *Skip tour*, `Esc` or leaving
  via the header `?` button all snooze it for a week rather than counting it as
  finished, so someone who bails early still gets offered it later.
- Reaching the final step marks it complete and it stops being offered.
- The `?` button in the header always replays the tour, so opting out is never
  a dead end.

### The tour

18 steps covering every feature: navigation, the focus timer, dark mode, live
sync, creating tasks, plain-language input, search, filters, the task card,
sub-tasks, the AI task breakdown, activity, sharing, the board, focus stats and
analytics.

Each step dims the screen and cuts a spotlight out over the element it is
describing, with a card of copy beside it. The tour **navigates by itself** -
stepping into the board, stats and analytics screens on its way - and can be
moved through with *Next* / *Back*, the arrow keys, or abandoned at any time.

A step can also declare a `reveal` anchor, which the tour clicks before
spotlighting. The AI breakdown button lives inside the collapsible sub-task
panel, so the tour opens that panel itself rather than pointing at something
that is not there.

### Implementation notes

- `src/store/onboardingStore.ts` - persisted Zustand store. `shouldOfferOnboarding`
  is exported as a plain function so the offer/snooze/opt-out rules are testable
  without mounting React.
- `src/data/onboardingSteps.ts` - the step content, kept separate from the
  component that renders it.
- `src/components/onboarding/` - `OnboardingRoot` (mount point), `OnboardingPrompt`,
  `ProductTour` and `TourButton`.
- Steps are anchored to elements by a `data-tour="..."` attribute. A unit test
  reads the source tree and fails if a step points at an anchor that no longer
  exists, which stops a refactor from silently downgrading a step to the
  centred fallback.
- **Missing targets degrade gracefully.** A brand new account has no tasks, so
  the task card, shared sidebar and focus timer do not exist yet. Those steps
  fall back to a centred card and the tour carries on rather than dead-ending.
- The tour is mounted once at the app root, not inside the page `Shell`,
  because it navigates between routes and would otherwise lose its place.

## Deployment

### Frontend (Vercel)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   cd frontend
   vercel
   ```

3. **Set environment variables in Vercel dashboard**
   - `VITE_API_URL` - Your deployed backend URL
   - `VITE_SOCKET_URL` - Your deployed backend URL

### Backend (Render)

1. **Create Render account** at [render.com](https://render.com)

2. **Create PostgreSQL database**
   - Create a new PostgreSQL instance on Render or use Neon

3. **Deploy backend**
   - Connect your GitHub repository
   - Select the `backend` folder as root directory
   - Set build command: `npm install && npm run build`
   - Set start command: `npm start`

4. **Set environment variables in Render dashboard**
   - All variables from `.env.example`
   - `DATABASE_URL` - Your PostgreSQL connection string
   - `NODE_ENV` - Set to `production`

### Database (Neon)

1. **Create Neon account** at [neon.tech](https://neon.tech)

2. **Create a new project**
   - Choose PostgreSQL
   - Copy the connection string

3. **Run migrations**
   - Use Neon's SQL editor or connect via psql
   - Run the SQL from `migrations/init.sql`

## Git Workflow

This project uses a PR-based workflow with feature branches:

1. **Create a feature branch**
   ```bash
   git checkout -b feature/feature-name
   ```

2. **Make changes and commit**
   ```bash
   git add .
   git commit -m "feat: add feature description"
   ```

3. **Push to GitHub**
   ```bash
   git push origin feature/feature-name
   ```

4. **Create Pull Request**
   - Go to GitHub and create a PR
   - Request review
   - Merge after approval

5. **Delete feature branch**
   ```bash
   git branch -d feature/feature-name
   git push origin --delete feature/feature-name
   ```

## Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow existing code patterns
- Write descriptive variable and function names
- Keep functions small and focused
- Add comments for complex logic

### Component Structure
- Components should be in `src/components/`
- Use TypeScript interfaces for props
- Keep components focused on single responsibility
- Extract reusable logic into custom hooks

### State Management
- Use Zustand for global state (auth, theme, UI)
- Use React Query for server state (API calls)
- Keep local state in component state when appropriate

### API Calls
- All API calls should go through React Query hooks
- Define hooks in `src/hooks/`
- Use TypeScript for request/response types

### Testing

#### Running the tests

| Command | Runs |
|---|---|
| `cd backend && npm test` | Backend unit + integration suites (Jest) |
| `cd backend && npm run test:unit` | Backend unit tests only (mocked, no database) |
| `cd backend && npm run test:coverage` | Backend with a coverage report |
| `cd frontend && npm test` | Frontend unit + component tests (Vitest) |
| `cd frontend && npm run test:coverage` | Frontend with a coverage report |
| `cd frontend && npm run test:e2e` | End-to-end tests (Playwright) |

#### Backend

- `tests/unit/` — pure logic with a mocked pool, so these run without a database.
- `tests/integration/` — the real Express app driven by Supertest against the
  configured database.
- **Integration tests hit the database in `backend/.env`.** Each test creates a
  throwaway user with a random email and deletes it in `afterAll`; because the
  schema cascades, no fixture data survives a run. Point `DATABASE_URL` at a
  throwaway database if that is not acceptable.
- Suites run with `maxWorkers: 1`. Neon is a remote database over the network,
  so parallel workers only add connection pressure.
- Do **not** call `pool.end()` from a suite's `afterAll`: Jest shares one
  process across suites, so the first suite to finish would break every suite
  after it. `forceExit` in `jest.config.js` handles the leftover socket.

#### Frontend

- Vitest with jsdom and React Testing Library.
- `src/test/setup.ts` polyfills `matchMedia` and `ResizeObserver`, which jsdom
  lacks and Chart.js needs.
- Drag-and-drop is covered by testing the extracted decision logic in
  `src/components/kanban/logic.ts`; dnd-kit's pointer gestures cannot be
  simulated reliably in jsdom.

#### End-to-end

- Playwright, two projects: a desktop Chrome and a mobile profile.
- The frontend dev server is started automatically; the backend must already be
  running on port 5000.
- **First run needs the browser binary:** `npx playwright install chromium`.
- `e2e/responsive.spec.ts` asserts that no page overflows horizontally at
  320/390/768px, which guards the responsiveness bug fixed in phase 17.
- `e2e/auth.spec.ts` covers sign-up, sign-in and the task lifecycle, including
  the confetti burst on completion.
- `e2e/onboarding.spec.ts` covers the tour in a real browser - jsdom cannot
  check the spotlight geometry or that the tour navigates between routes by
  itself. It also asserts that skipping does not re-prompt, and that opting out
  is not a dead end.
- `e2e/helpers.ts#signUp` clears the onboarding prompt by default, since it
  otherwise sits over the page and swallows clicks. Onboarding specs pass
  `{ keepOnboardingPrompt: true }` to assert on it instead.

## Troubleshooting

### Backend won't start
- Check that PostgreSQL is running
- Verify DATABASE_URL in .env
- Check that port 5000 is not in use

### Frontend won't connect to backend
- Verify VITE_API_URL in .env
- Check that backend is running
- Check CORS configuration in backend

### OAuth not working
- Verify OAuth credentials in .env
- Check callback URLs match OAuth app settings
- Ensure OAuth app is configured for correct environment

### Socket.io not connecting
- Verify VITE_SOCKET_URL in .env
- Check that Socket.io server is running
- Check firewall/network settings

### Database connection issues
- Verify DATABASE_URL format
- Check database is accessible
- Verify SSL settings for production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Submit a pull request

## License

ISC

## Support

For issues and questions, please open an issue on GitHub.
