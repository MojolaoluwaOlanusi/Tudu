import { Category, Priority } from '../types/task';

/**
 * The query language behind the List view's search box.
 *
 * A bare word searches title and description, exactly as before. Operators
 * narrow the result set and compose with AND. Anything the parser does not
 * recognise (an unknown #tag, an unsupported due: value) falls back to free
 * text rather than erroring, so a user who types "#urgent" still gets a
 * sensible result.
 */
export interface ParsedQuery {
  assigneeMe?: boolean;
  assigneeEmail?: string;
  category?: Category;
  priority?: Priority;
  isOpen?: boolean;
  isCompleted?: boolean;
  dueOverdue?: boolean;
  dueToday?: boolean;
  dueWeek?: boolean;
  columnName?: string;
  freeText: string;
  errors: string[];
}

const CATEGORIES: Category[] = ['work', 'personal', 'study'];
const PRIORITIES: Priority[] = ['low', 'medium', 'high'];

export const parseQuery = (raw: string): ParsedQuery => {
  const parsed: ParsedQuery = { freeText: '', errors: [] };
  if (!raw) return parsed;

  const tokens = raw.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
  const free: string[] = [];

  for (const rawToken of tokens) {
    const token = rawToken.replace(/^"|"$/g, '');
    if (!token) continue;

    if (token === '@me') {
      parsed.assigneeMe = true;
      continue;
    }
    if (token.startsWith('@')) {
      const email = token.slice(1);
      if (!email.includes('@')) {
        free.push(token);
        continue;
      }
      parsed.assigneeEmail = email;
      continue;
    }
    if (token.startsWith('#')) {
      const cat = token.slice(1).toLowerCase();
      if ((CATEGORIES as string[]).includes(cat)) {
        parsed.category = cat as Category;
      } else {
        free.push(token);
      }
      continue;
    }
    if (token.startsWith('due:')) {
      const v = token.slice(4).toLowerCase();
      if (v === 'overdue') parsed.dueOverdue = true;
      else if (v === 'today') parsed.dueToday = true;
      else if (v === 'week') parsed.dueWeek = true;
      else free.push(token);
      continue;
    }
    if (token.startsWith('priority:')) {
      const v = token.slice(9).toLowerCase();
      if ((PRIORITIES as string[]).includes(v)) parsed.priority = v as Priority;
      else free.push(token);
      continue;
    }
    if (token.startsWith('is:')) {
      const v = token.slice(3).toLowerCase();
      if (v === 'completed') parsed.isCompleted = true;
      else if (v === 'open') parsed.isOpen = true;
      else free.push(token);
      continue;
    }
    if (token.startsWith('column:')) {
      parsed.columnName = token.slice(7);
      continue;
    }
    free.push(token);
  }

  parsed.freeText = free.join(' ');
  return parsed;
};

export interface BuiltFragment {
  sql: string;
  params: unknown[];
}

export const buildFilterFragment = (
  parsed: ParsedQuery,
  userId: string,
  startIndex: number
): BuiltFragment => {
  const parts: string[] = [];
  const params: unknown[] = [];
  let idx = startIndex;

  if (parsed.assigneeMe) {
    parts.push(`t.assignee_id = $${idx}`);
    params.push(userId);
    idx += 1;
  } else if (parsed.assigneeEmail) {
    parts.push(
      `t.assignee_id IN (SELECT id FROM users WHERE LOWER(email) = LOWER($${idx}))`
    );
    params.push(parsed.assigneeEmail);
    idx += 1;
  }
  if (parsed.category) {
    parts.push(`t.category = $${idx}`);
    params.push(parsed.category);
    idx += 1;
  }
  if (parsed.priority) {
    parts.push(`t.priority = $${idx}`);
    params.push(parsed.priority);
    idx += 1;
  }
  if (parsed.isCompleted) parts.push("t.status = 'done'");
  if (parsed.isOpen) parts.push("t.status <> 'done'");
  if (parsed.dueOverdue) parts.push("t.due_date < NOW() AND t.status <> 'done'");
  if (parsed.dueToday)
    parts.push("(t.due_date AT TIME ZONE 'UTC')::date = CURRENT_DATE");
  if (parsed.dueWeek)
    parts.push("t.due_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'");
  if (parsed.columnName) {
    parts.push(
      `t.column_id IN (SELECT id FROM board_columns WHERE LOWER(name) = LOWER($${idx}))`
    );
    params.push(parsed.columnName);
    idx += 1;
  }

  return {
    sql: parts.length ? ` AND ${parts.join(' AND ')}` : '',
    params,
  };
};

const SORT_COLUMNS: Record<string, string> = {
  created_at: 't.created_at',
  updated_at: 't.updated_at',
  due_date: 't.due_date',
  title: 't.title',
  priority:
    "CASE t.priority WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 ELSE 4 END",
  // NULLS LAST so a task with no assignee does not sort to the top when the
  // order is ascending; a null is not "smaller" than a real value here.
  assignee: 't.assignee_id',
  category: 't.category',
};

const NULLABLE_SORTS = new Set(['due_date', 'assignee', 'category']);

export const buildOrderClause = (
  sort: string | undefined,
  order: string | undefined
): string => {
  const key = sort ?? 'created_at';
  const col = SORT_COLUMNS[key] ?? SORT_COLUMNS.created_at;
  const dir = order === 'asc' ? 'ASC' : 'DESC';
  const nulls = NULLABLE_SORTS.has(key) ? ' NULLS LAST' : '';
  return `ORDER BY ${col} ${dir}${nulls}, t.created_at DESC`;
};
