import { Category, Priority } from './task';

/** Mirrors the response of POST /api/tasks/parse. */
export interface ParsedTaskText {
  /** The sentence with everything we understood removed. */
  title: string;
  /** Exactly what was typed, for reference. */
  original: string;
  /** ISO instant, or null when no date was found. */
  dueDate: string | null;
  /** The literal words matched, e.g. "tomorrow at 9am". */
  dueDateText: string | null;
  category: Category | null;
  categoryText: string | null;
  priority: Priority | null;
  priorityText: string | null;
  /** Every token consumed from the sentence. */
  matched: string[];
  hasMatches: boolean;
}