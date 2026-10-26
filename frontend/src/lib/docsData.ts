export interface DocSection {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
  code?: string;
}

export interface Doc {
  title: string;
  intro: string;
  sections: DocSection[];
}

export const DOC_ORDER = [
  'index',
  'boards', 'lists', 'shortcuts',
  'pomodoro', 'time', 'analytics',
  'ai', 'nlp', 'celebrations',
  'templates',
  'api', 'webhooks', 'tokens',
] as const;

export type DocKey = (typeof DOC_ORDER)[number];

/**
 * Source content for /docs, /webhooks and the marketing nav's docs links.
 *
 * Copy is honest about what the app does: numbers, endpoints, headers and
 * template names are exactly what the backend ships today. Anything the
 * mockup claimed but this repo does not implement (unlimited "Group by"
 * in the list view, 100/1200 "calls per month", streaming AI, the
 * X-Tudu-Signature header, etc.) has been replaced with the real shape.
 */
export const DOCS: Record<DocKey, Doc> = {
  index: {
    title: 'Welcome to Tudu',
    intro:
      "Tudu is the fast, offline-first Kanban for people tired of Trello's limits and Jira's chaos. These docs cover everything from creating your first board to shipping webhooks.",
    sections: [
      {
        heading: 'What you can do',
        bullets: [
          'Boards, lists, Kanban columns, and WIP limits',
          'Keyboard-first interactions with Cmd+K everywhere',
          'Pomodoro focus sessions and time tracking',
          'AI-powered task breakdown',
          'Team workspaces with roles and invites',
          'GitHub + Slack integrations',
          'Public API, outbound webhooks, and API tokens',
          'Self-hosting license for on-prem deployments',
        ],
      },
      {
        heading: 'Where to go next',
        paragraphs: [
          'New here? Start with Boards & Kanban. Power user? Jump to Bulk & shortcuts. Building an integration? See the Public API reference.',
        ],
      },
    ],
  },

  boards: {
    title: 'Boards & Kanban',
    intro:
      'Boards are the top-level container. Each board has one or more columns, and each column holds cards.',
    sections: [
      {
        heading: 'Create a board',
        paragraphs: [
          'Open the Boards dialog from the sidebar and give it a name. Personal boards belong to you alone; workspace boards are visible to every accepted member.',
        ],
        code:
          'curl -X POST https://api.tudu.app/api/v1/boards \\\n  -H "Authorization: Bearer tudu_pat_..." \\\n  -d \'{"name": "Q4 Sprint"}\'',
      },
      {
        heading: 'Columns and stages',
        paragraphs: [
          'Every column carries a stage: todo, doing, or done. A card\'s status mirrors the stage of the column it sits in, so a card dragged into "Code Review" reports doing even if the column has a different name.',
        ],
      },
      {
        heading: 'WIP limits',
        paragraphs: [
          'Set a Work-In-Progress limit on any column. When the column is full the server rejects new moves with a 409, and the Kanban board shows the count in red.',
        ],
      },
    ],
  },

  lists: {
    title: 'Lists & filters',
    intro:
      'The list view is where most work happens. Search, filter, and sort without leaving the page.',
    sections: [
      {
        heading: 'Query bar',
        paragraphs: [
          'The search box accepts a small query language. Operators narrow the result set; anything left over is matched against title and description as free text.',
        ],
        bullets: [
          '@me — assigned to you',
          '@user@example.com — assigned to someone by email',
          '#work / #personal / #study — category',
          'priority:high / priority:medium / priority:low — priority',
          'due:overdue / due:today / due:week — due-date window',
          'is:open / is:completed — status',
          'column:Doing — sitting in a specific column',
        ],
      },
      {
        heading: 'Filters and sort',
        paragraphs: [
          'On top of the query bar, the Filters panel narrows by status, category, or priority. Sort by created_at, updated_at, due_date, title, priority, assignee, or category, and flip the direction with the arrow button beside the dropdown.',
        ],
      },
    ],
  },

  shortcuts: {
    title: 'Bulk & shortcuts',
    intro:
      'Tudu is designed to be usable without a mouse. Every action has a keystroke.',
    sections: [
      {
        heading: 'Global',
        bullets: [
          'Cmd+K / Ctrl+K — command palette',
          'Ctrl+Shift+D — toggle density',
          'Ctrl+Z — undo the last delete',
          'T — toggle theme',
          '? — show this help',
          'Esc — close panel / dismiss',
        ],
      },
      {
        heading: 'Navigation',
        paragraphs: ['Hold G, then the second key:'],
        bullets: [
          'G L — Go to List',
          'G B — Go to Board',
          'G S — Go to Stats',
          'G A — Go to Analytics',
          'G , — Go to Settings',
          'G T — Go to Templates',
          'G I — Go to Integrations',
          'G P — Go to Pricing',
        ],
      },
      {
        heading: 'Tasks',
        bullets: [
          'N — New task',
          '/ — Focus the search bar',
          'F — Toggle filters',
        ],
      },
    ],
  },

  pomodoro: {
    title: 'Pomodoro',
    intro:
      'Start a 25-minute focus session against any task. Tudu tracks the minutes and folds them into your stats.',
    sections: [
      {
        heading: 'Start a session',
        paragraphs: [
          'From any task, click Start 25m. The timer shows in the topbar and keeps counting even if you navigate away. One session at a time.',
        ],
      },
      {
        heading: 'Where it lands',
        paragraphs: [
          'Completed sessions roll into Focus stats. See today, this week, and all-time minutes, plus per-task breakdowns.',
        ],
      },
    ],
  },

  time: {
    title: 'Time tracking',
    intro:
      'Pro feature. Log hours against any task, mark them billable, and export weekly.',
    sections: [
      {
        heading: 'Manual and running timers',
        paragraphs: [
          'Start a timer from a task card, or log manually from the task detail panel. Billable vs non-billable is per-entry.',
        ],
      },
      {
        heading: 'Weekly report',
        paragraphs: [
          'Stats > Time tracking shows hours per day, a billable split, and a per-task rollup. The analytics page exports the same data as CSV or JSON.',
        ],
      },
    ],
  },

  analytics: {
    title: 'Analytics',
    intro:
      'Personal and team insights — completion rates, burndown, per-member breakdowns.',
    sections: [
      {
        heading: 'Personal',
        paragraphs: [
          'See tasks completed, in progress, overdue, and total focus time across the last 7 days, 30 days, or 12 weeks. Every figure is grouped by your own timezone.',
        ],
      },
      {
        heading: 'Team (Pro)',
        paragraphs: [
          'Per-member completion and in-progress rates, burndown, and per-board progress. Requires the analytics.team feature flag.',
        ],
      },
    ],
  },

  ai: {
    title: 'AI breakdown',
    intro:
      'Turn a one-line task into a checklist. Tudu parses the title and proposes a set of sub-tasks.',
    sections: [
      {
        heading: 'How to use it',
        paragraphs: [
          'On any task, click Break this down. Review what comes back, uncheck the ones you don\'t want, and save.',
        ],
      },
      {
        heading: 'Limits',
        bullets: [
          'Free: 6 steps per breakdown, rate-limited to 10 requests per minute',
          'Pro: 12 steps per breakdown via the HD endpoint',
          'Pro AI credits: 100 credits included per month, top up any time',
        ],
      },
    ],
  },

  nlp: {
    title: 'NLP parsing',
    intro:
      'Type it like you say it. Tudu parses dates, categories, and priorities from plain text.',
    sections: [
      {
        heading: 'What parses',
        bullets: [
          'Dates: tomorrow, today, next week, Monday, Oct 24',
          'Times: at 9am, at 14:30',
          'Categories: #work, #personal, #study',
          'Priorities: urgent, asap, high priority, no rush',
        ],
      },
      {
        heading: 'Example',
        paragraphs: [
          'This produces a task titled "Buy milk" with category personal, priority high, and a due date of tomorrow at 9:00.',
        ],
        code: 'Buy milk tomorrow at 9am #personal urgent',
      },
    ],
  },

  celebrations: {
    title: 'Celebrations',
    intro:
      'A small confetti pop when you finish a task, and at focus-session milestones.',
    sections: [
      {
        heading: 'Toggle',
        paragraphs: [
          'Turn it off in Settings > Notifications > In-app. The preference persists per-account.',
        ],
      },
      {
        heading: 'Accessibility',
        paragraphs: [
          'Celebrations respect prefers-reduced-motion. If your OS asks apps to reduce motion, confetti is suppressed automatically.',
        ],
      },
    ],
  },

  templates: {
    title: 'Templates',
    intro:
      'Skip setup. Start from a built-in template, install one from the marketplace, or publish your own.',
    sections: [
      {
        heading: 'Built-in',
        bullets: [
          'Personal — To-do > Doing > Done',
          'Team Sprint — Backlog > To Do > In Progress > Code Review > Done',
          'Content Calendar — Ideas > Research > Writing > Editing > Published',
          'Bug Tracker — New > Triaged > In Progress > QA > Fixed > Deployed',
          'Student — Assignments > In Progress > Review > Submitted',
          'Freelancer Projects — Leads > Proposal > Active > Invoicing > Paid',
        ],
      },
      {
        heading: 'Publish your own',
        paragraphs: [
          'Pro feature. From a board, open the Publish dialog. Set a price (0 for free, or at least 100 NGN) and Tudu handles delivery and payment via Paystack.',
        ],
      },
    ],
  },

  api: {
    title: 'Public API',
    intro:
      'REST, JSON, personal tokens. Free tier is read-only; Pro unlocks write.',
    sections: [
      {
        heading: 'Authentication',
        code:
          'curl -H "Authorization: Bearer tudu_pat_yourtoken" \\\n  https://api.tudu.app/api/v1/tasks',
      },
      {
        heading: 'Endpoints',
        bullets: [
          'GET /api/v1/me — the authenticated user',
          'GET /api/v1/boards — list boards the caller can see',
          'GET /api/v1/boards/:id — one board',
          'GET /api/v1/tasks — list tasks (board_id, status, category, priority, limit, offset)',
          'GET /api/v1/tasks/:id — one task',
          'POST /api/v1/tasks — create (Pro)',
          'PUT /api/v1/tasks/:id — update (Pro)',
          'DELETE /api/v1/tasks/:id — soft delete (Pro)',
        ],
      },
      {
        heading: 'Rate limits',
        paragraphs: [
          '100 requests per minute per user, shared across every token. Standard rate-limit headers are returned on every response.',
        ],
      },
    ],
  },

  webhooks: {
    title: 'Webhooks',
    intro:
      'Signed HTTPS POSTs on every task mutation. Follows the Standard Webhooks spec so any off-the-shelf verifier works.',
    sections: [
      {
        heading: 'Setup',
        paragraphs: [
          'Add an endpoint in Settings > Webhooks. Every active endpoint receives every event it is subscribed to.',
        ],
      },
      {
        heading: 'Payload',
        code:
          '{\n  "id": "<delivery-uuid>",\n  "type": "task.created",\n  "created_at": "2026-10-22T14:23:00Z",\n  "data": { "task": { "id": "t-1", "title": "Ship v1", "status": "todo" } }\n}',
      },
      {
        heading: 'Signature',
        paragraphs: [
          'Each request carries three headers: webhook-id, webhook-timestamp, and webhook-signature. The signature is an HMAC-SHA256 over `${id}.${timestamp}.${body}`, base64-encoded, and prefixed with "v1,".',
        ],
      },
      {
        heading: 'Retries',
        paragraphs: [
          'Failed deliveries retry up to 6 times with exponential backoff over roughly 24 hours. After the sixth failure the delivery is marked "dead" and can be requeued from Settings > Webhooks.',
        ],
      },
    ],
  },

  tokens: {
    title: 'API tokens',
    intro:
      'Personal access tokens give scripts read (Free) or read/write (Pro) access to your account.',
    sections: [
      {
        heading: 'Create',
        paragraphs: [
          'Settings > API tokens > Create. Give it a label, copy the plaintext immediately. It will not be shown again.',
        ],
      },
      {
        heading: 'Rotate',
        paragraphs: [
          'Tokens do not expire automatically. Revoke any token at any time from the same page. Revocation is immediate.',
        ],
      },
    ],
  },
};

export const findDoc = (key: string | undefined): Doc =>
  DOCS[(key ?? 'index') as DocKey] ?? DOCS.index;