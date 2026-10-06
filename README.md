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
