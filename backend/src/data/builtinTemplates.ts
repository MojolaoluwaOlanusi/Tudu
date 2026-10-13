/**
 * Built-in board templates.
 *
 * The single source of truth for what a starter board looks like. The
 * onboarding wizard (feature 4.2) and the marketplace install endpoint
 * (feature 4.9) both read from here, so the two flows stay in step.
 *
 * A template is a name, a set of columns, and a handful of example cards.
 * Example cards reference their column by name; the seeder resolves the
 * name to an id and copies the column's stage onto the task's status.
 */
export type TemplateStage = 'todo' | 'doing' | 'done';
export type TemplatePriority = 'low' | 'medium' | 'high';

export interface BuiltinTemplateColumn {
  name: string;
  stage: TemplateStage;
  color: string;
}

export interface BuiltinTemplateTask {
  title: string;
  column: string;
  priority: TemplatePriority;
}

export interface BuiltinTemplate {
  slug: string;
  name: string;
  columns: BuiltinTemplateColumn[];
  tasks: BuiltinTemplateTask[];
}

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  {
    slug: 'personal',
    name: 'Personal',
    columns: [
      { name: 'To-do', stage: 'todo', color: 'gray' },
      { name: 'Doing', stage: 'doing', color: 'blue' },
      { name: 'Done', stage: 'done', color: 'green' },
    ],
    tasks: [
      { title: "Reply to yesterday's emails", column: 'To-do', priority: 'medium' },
      { title: 'Book dentist appointment', column: 'To-do', priority: 'low' },
      { title: 'Read for 30 minutes', column: 'Doing', priority: 'low' },
      { title: 'Tidy the desk', column: 'Done', priority: 'low' },
    ],
  },
  {
    slug: 'team-sprint',
    name: 'Team sprint',
    columns: [
      { name: 'Backlog', stage: 'todo', color: 'gray' },
      { name: 'To Do', stage: 'todo', color: 'blue' },
      { name: 'In Progress', stage: 'doing', color: 'amber' },
      { name: 'Code Review', stage: 'doing', color: 'violet' },
      { name: 'Done', stage: 'done', color: 'green' },
    ],
    tasks: [
      { title: 'Write product spec for v2', column: 'Backlog', priority: 'medium' },
      { title: 'Set up CI pipeline', column: 'To Do', priority: 'high' },
      { title: 'Fix login button on mobile', column: 'In Progress', priority: 'high' },
      { title: 'Update dependencies', column: 'Code Review', priority: 'low' },
      { title: 'Ship landing page', column: 'Done', priority: 'medium' },
    ],
  },
  {
    slug: 'content-calendar',
    name: 'Content calendar',
    columns: [
      { name: 'Ideas', stage: 'todo', color: 'gray' },
      { name: 'Research', stage: 'todo', color: 'blue' },
      { name: 'Writing', stage: 'doing', color: 'amber' },
      { name: 'Editing', stage: 'doing', color: 'violet' },
      { name: 'Published', stage: 'done', color: 'green' },
    ],
    tasks: [
      { title: 'Blog: why we built Tudu', column: 'Ideas', priority: 'medium' },
      { title: 'Newsletter #12 — the road to launch', column: 'Research', priority: 'medium' },
      { title: 'Case study: how Ade uses Tudu', column: 'Writing', priority: 'high' },
      { title: 'Podcast outline: productivity for freelancers', column: 'Editing', priority: 'low' },
    ],
  },
  {
    slug: 'blank',
    name: 'Blank',
    columns: [
      { name: 'To-do', stage: 'todo', color: 'gray' },
      { name: 'Doing', stage: 'doing', color: 'blue' },
      { name: 'Done', stage: 'done', color: 'green' },
    ],
    tasks: [],
  },
];

export const findTemplate = (slug: string): BuiltinTemplate | undefined =>
  BUILTIN_TEMPLATES.find((t) => t.slug === slug);
