# Tudu - Advanced PERN Stack Todo Application

A senior-level, feature-rich todo application with a friendly, brush-stroke aesthetic. Tudu includes advanced features like real-time collaboration, AI-powered task breakdown, Kanban board, Pomodoro timer, and comprehensive analytics.

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
- **AI Task Breakdown**: Break complex tasks into sub-tasks using OpenAI GPT-4
- **Pomodoro Timer**: Full Pomodoro sessions with time tracking
- **Analytics Dashboard**: Charts showing completion rates and time spent

### User Experience
- **Dark/Light Mode**: Toggle between themes with smooth transitions
- **Responsive Design**: Mobile-first approach, works on all devices
- **Instant Search & Filters**: Real-time filtering by status, priority, category
- **Friendly UI**: Brush-stroke aesthetic matching the brand design

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
- **AI**: OpenAI GPT-4 API
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
│   │   ├── services/        # Business logic (OpenAI, NLP, email)
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
- OpenAI API key (OpenAI Platform)

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

#### OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com)
2. Sign up or log in
3. Go to API Keys section
4. Create a new API key
5. Copy the key to your `.env` file

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
   OPENAI_API_KEY=your-openai-api-key
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
- `POST /api/pomodoro/start` - Start Pomodoro session
- `POST /api/pomodoro/complete` - Complete session
- `GET /api/pomodoro/stats` - Get Pomodoro statistics

### AI
- `POST /api/ai/breakdown` - Generate sub-tasks via AI

### Analytics
- `GET /api/analytics/overview` - Get overview statistics
- `GET /api/analytics/completed-tasks` - Get completion data
- `GET /api/analytics/time-spent` - Get time spent data

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
- Write unit tests for critical functions
- Test components with React Testing Library
- Add E2E tests for critical user flows

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
