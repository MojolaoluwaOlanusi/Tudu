import * as chrono from 'chrono-node';
import { Category, Priority } from '../types/task';

/**
 * Turns a sentence like "Finish report urgent #work" into the fields a task
 * row needs, using chrono-node for the date and a small keyword set for the
 * rest.
 */

/** Hashtags that map onto a task category. Anything else is left in the title. */
const CATEGORY_TAGS: Record<string, Category> = {
  work: 'work',
  personal: 'personal',
  study: 'study',
};

interface PriorityRule {
  priority: Priority;
  patterns: RegExp[];
}

/**
 * Checked in order, so "high priority" wins over "low priority" matching the
 * bare word "priority", and an explicit "low priority" is not swallowed by the
 * generic "low" rule.
 */
const PRIORITY_RULES: PriorityRule[] = [
  {
    priority: 'high',
    patterns: [
      /\bas soon as possible\b/i,
      /\bhigh priority\b/i,
      /\burgent(?:ly)?\b/i,
      /\basap\b/i,
      /\bimmediately\b/i,
      /\bright away\b/i,
      /\bcritical\b/i,
      /\bemergency\b/i,
    ],
  },
  {
    priority: 'medium',
    patterns: [/\bmedium priority\b/i, /\bnormal priority\b/i],
  },
  {
    priority: 'low',
    patterns: [
      /\blow priority\b/i,
      /\bno rush\b/i,
      /\bnot urgent\b/i,
      /\bwhenever(?:ever)?\b/i,
      /\bsometime\b/i,
      /\blow\b/i,
    ],
  },
];

export interface ParsedTaskText {
  /** The sentence with everything we understood removed. */
  title: string;
  /** Exactly what was typed, for reference. */
  original: string;
  /** ISO instant, or null when no date was found. */
  dueDate: string | null;
  /** The literal words we matched, e.g. "tomorrow at 9am". */
  dueDateText: string | null;
  category: Category | null;
  categoryText: string | null;
  priority: Priority | null;
  priorityText: string | null;
  /** Every token consumed from the sentence, for highlighting in the UI. */
  matched: string[];
  /** True when we understood at least one thing. */
  hasMatches: boolean;
}

/** Collapse runs of whitespace left behind by removing tokens. */
const tidy = (value: string): string => value.replace(/\s+/g, ' ').trim();

export interface ParseOptions {
  /** The user's current instant, so relative words resolve in their timezone. */
  now?: Date;
  /**
   * The browser's `getTimezoneOffset()` (minutes; UTC - local, so Lagos is -60).
   *
   * chrono resolves dates against a reference *in this server's own timezone*,
   * so a user five hours from the server would otherwise get "9am" back as
   * their 4pm. The reference is shifted onto the user's wall clock before
   * parsing, and the result is shifted back afterwards.
   */
  timezoneOffset?: number;
}

/** This server's own UTC offset, as getTimezoneOffset() reports it. */
const SERVER_OFFSET = new Date().getTimezoneOffset();

/**
 * @param text the raw sentence
 * @param options see {@link ParseOptions}
 */
export const parseTaskText = (
  text: string,
  options: ParseOptions = {}
): ParsedTaskText => {
  const original = text;
  const matched: string[] = [];
  let working = text;

  const userOffset = options.timezoneOffset ?? 0;
  const now = options.now ?? new Date();
  // Move "now" onto the user's wall clock, then express that in server-local
  // terms so chrono reads it as the local time the user typed against.
  const reference = new Date(now.getTime() + (SERVER_OFFSET - userOffset) * 60_000);

  // --- Category: #work / #personal / #study -----------------------------
  let category: Category | null = null;
  let categoryText: string | null = null;

  working = working.replace(/#([a-zA-Z][\w-]*)/g, (token, tag: string) => {
    const mapped = CATEGORY_TAGS[tag.toLowerCase()];
    if (mapped && !category) {
      category = mapped;
      categoryText = token;
      matched.push(token);
      return ' ';
    }
    return token;
  });

  // --- Priority: keyword phrases ----------------------------------------
  let priority: Priority | null = null;
  let priorityText: string | null = null;

  for (const rule of PRIORITY_RULES) {
    const hit = rule.patterns.find((pattern) => pattern.test(working));
    if (!hit) continue;
    const found = working.match(hit);
    priority = rule.priority;
    priorityText = found ? found[0] : null;
    if (found) {
      working = working.replace(hit, ' ');
      matched.push(found[0]);
    }
    break;
  }

  // --- Due date: chrono-node --------------------------------------------
  // Parsed last so it never sees leftover '#work' or 'urgent' noise.
  let dueDate: string | null = null;
  let dueDateText: string | null = null;

  const results = chrono.parse(working, reference, { forwardDate: true });

  if (results.length > 0) {
    const first = results[0];
    const date = first.start?.date?.();
    if (date && !Number.isNaN(date.getTime())) {
      // Undo the server-local shift, then re-express it in the user's timezone.
      dueDate = new Date(
        date.getTime() - SERVER_OFFSET * 60_000 + userOffset * 60_000
      ).toISOString();
      dueDateText = first.text;
      matched.push(first.text);
      working = `${working.slice(0, first.index)} ${working.slice(
        first.index + first.text.length
      )}`;
    }
  }

  const title = tidy(working);

  return {
    title,
    original,
    dueDate,
    dueDateText,
    category,
    categoryText,
    priority,
    priorityText,
    matched,
    hasMatches: matched.length > 0,
  };
};