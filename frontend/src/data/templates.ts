/**
 * Display data for the built-in templates.
 *
 * The backend owns the definition (columns + example cards); this file is
 * just what the wizard shows as a card so the two do not drift apart.
 * Keep the slugs in step with backend/src/data/builtinTemplates.ts.
 */
export interface TemplateDisplay {
  slug: string;
  name: string;
  description: string;
  emoji: string;
  highlights: string[];
}

export const TEMPLATES: TemplateDisplay[] = [
  {
    slug: 'personal',
    name: 'Personal',
    description: 'For everyday tasks and habits.',
    emoji: '🌱',
    highlights: ['To-do, Doing, Done', 'Simple and calm'],
  },
  {
    slug: 'team-sprint',
    name: 'Team sprint',
    description: 'For engineering teams running short cycles.',
    emoji: '⚡',
    highlights: ['Backlog through Code Review', 'Five columns, ready to go'],
  },
  {
    slug: 'content-calendar',
    name: 'Content calendar',
    description: 'For writers, marketers, and creators.',
    emoji: '📝',
    highlights: ['Ideas through Published', 'Perfect for blogs and newsletters'],
  },
  {
    slug: 'blank',
    name: 'Blank',
    description: 'Start with an empty board and shape it your way.',
    emoji: '⬜',
    highlights: ['Add columns as you go'],
  },
  {
    slug: 'bug-tracker',
    name: 'Bug tracker',
    description: 'For QA and engineering triage.',
    emoji: '🐞',
    highlights: ['New through Deployed', 'Six columns for a real pipeline'],
  },
  {
    slug: 'student-kanban',
    name: 'Student',
    description: 'For coursework, essays, and revisions.',
    emoji: '🎓',
    highlights: ['Assignments through Submitted', 'Simple, four columns'],
  },
  {
    slug: 'freelancer-projects',
    name: 'Freelancer projects',
    description: 'For client work from lead to payment.',
    emoji: '💼',
    highlights: ['Leads through Paid', 'Track invoices in the same board'],
  },
];
