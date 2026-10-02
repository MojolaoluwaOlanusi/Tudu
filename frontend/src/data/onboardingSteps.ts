/**
 * The guided tour's content, kept separate from the component that renders it
 * so the copy can be reviewed (and unit tested) on its own.
 */

export type Placement = 'top' | 'bottom' | 'left' | 'right';

export interface TourStep {
  id: string;
  emoji: string;
  title: string;
  body: string;
  /**
   * `data-tour` value of the element to spotlight. When omitted - or when the
   * element is not on screen (a brand new account has no task cards yet) - the
   * card is shown centred instead, so the tour never dead-ends.
   */
  target?: string;
  /** Route to navigate to before this step is shown. */
  route?: string;
  placement?: Placement;
  /** The New task form must be open for the target to exist. */
  openTaskForm?: boolean;
  /**
   * Click this `data-tour` element before measuring, so the step's own target
   * becomes visible. The AI breakdown button lives inside the collapsible
   * sub-task panel, so the tour has to open that panel itself.
   */
  reveal?: string;
  /** A before/after example, for the plain-language input. */
  example?: { input: string; result: string };
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    emoji: '👋',
    title: "Welcome to Tudu!",
    body: "Glad you're here. Tudu keeps everything you need to do in one calm place — and there's a lot to discover. Ready for a quick, friendly tour?",
  },
  {
    id: 'nav',
    emoji: '🧭',
    title: 'Your way around',
    target: 'nav',
    placement: 'bottom',
    body: 'These four tabs are the heart of the app. Jump between your task list, the board, focus stats and analytics whenever you like — your place is remembered.',
  },
  {
    id: 'pomodoro',
    emoji: '🍅',
    title: 'Focus timer',
    target: 'pomodoro',
    placement: 'bottom',
    body: 'Start a focus session from any task and a tomato appears up here to track it. Tudu times the session and counts it towards your stats.',
  },
  {
    id: 'theme',
    emoji: '🌙',
    title: 'Light or dark, your call',
    target: 'theme',
    placement: 'bottom',
    body: 'Flip between light and dark mode whenever you like. Tudu remembers your choice, so it will greet you the way you left it.',
  },
  {
    id: 'sync',
    emoji: '⚡',
    title: 'Live with your team',
    target: 'sync',
    placement: 'bottom',
    body: 'This little indicator means Tudu is connected. Changes from anyone you share with appear instantly — no refreshing, no "who edited that?"',
  },
  {
    id: 'new-task',
    emoji: '✨',
    title: 'Adding a task',
    target: 'new-task',
    placement: 'bottom',
    body: 'This is your starting point for anything new. Add due dates, categories, priority and sub-steps — or just let Tudu work them out for you.',
  },
  {
    id: 'smart-input',
    emoji: '💬',
    title: 'Just type it how you say it',
    target: 'smart-input',
    placement: 'bottom',
    openTaskForm: true,
    body: 'Write a task the way you would say it out loud and Tudu reads the details out for you. Nothing is applied until you confirm it, so you stay in control.',
    example: {
      input: 'Finish report tomorrow at 9am #work',
      result: 'due tomorrow 9am · work',
    },
  },
  {
    id: 'search',
    emoji: '🔍',
    title: 'Find anything, fast',
    target: 'search',
    placement: 'bottom',
    body: 'Search across every task in an instant. It stays quick however much you have on your plate.',
  },
  {
    id: 'filters',
    emoji: '🧩',
    title: 'Narrow things down',
    target: 'filters',
    placement: 'bottom',
    body: 'Filter by status, category or priority to see exactly the slice you care about right now. Clear them again with one click.',
  },
  {
    id: 'task-card',
    emoji: '📝',
    title: 'Everything on a task',
    target: 'task-card',
    placement: 'top',
    body: 'Each card is a little home. Change its status, add sub-steps to break big jobs down, pop open its history, or start a focus session on it. Edit, share and delete are in the corner.',
  },
  {
    id: 'subtasks',
    emoji: '🧱',
    title: 'Break big jobs into steps',
    target: 'subtasks',
    placement: 'top',
    body: 'Every card has its own sub-task list. Split something big into smaller steps, tick them off as you go, and watch the progress bar fill up.',
  },
  {
    id: 'ai-breakdown',
    emoji: '🤖',
    title: 'Let AI do the hard part',
    target: 'ai-breakdown',
    reveal: 'subtasks',
    placement: 'bottom',
    body: 'Stuck on where to start? "Break this down" asks AI to suggest the steps for you. Edit, untick or delete anything you don\'t want first — nothing is added until you press "Add to task".',
  },
  {
    id: 'activity',
    emoji: '🕒',
    title: 'Nothing gets lost',
    target: 'activity',
    placement: 'top',
    body: 'Every change is recorded here — who did what and when. Filter it by task or by date when you need to look back.',
  },
  {
    id: 'shared',
    emoji: '🤝',
    title: 'Lists you share',
    target: 'shared',
    placement: 'right',
    body: 'Share a selection of tasks with anyone. You pick whether they can view them or edit alongside you — and you can change that whenever you like.',
  },
  {
    id: 'board',
    emoji: '🗂️',
    title: 'The board view',
    route: '/board',
    target: 'board',
    placement: 'top',
    body: 'The same tasks, as a Kanban board. Drag a card between columns to move it along, and watch it update for everyone else in real time.',
  },
  {
    id: 'stats',
    emoji: '📈',
    title: 'See your focus',
    route: '/stats',
    target: 'stats',
    placement: 'top',
    body: 'A look at how much you have focused lately. Small sessions add up, and this is where you get to watch it happen.',
  },
  {
    id: 'analytics',
    emoji: '✨',
    title: 'The bigger picture',
    route: '/analytics',
    target: 'analytics',
    placement: 'top',
    body: 'Charts for your workload, completion rate and category breakdown. Export it all whenever you want to dig in elsewhere.',
  },
  {
    id: 'done',
    emoji: '🎉',
    route: '/',
    title: "That's everything!",
    body: "You're all set. Everything is waiting for you exactly where you left it — go and add your first task whenever you're ready. You can replay this tour any time from the Help button in the header.",
  },
];

/** The `data-tour` hooks the tour points at, in one place for reference. */
export const TOUR_TARGETS = TOUR_STEPS.filter((step) => step.target).map(
  (step) => step.target as string
);
