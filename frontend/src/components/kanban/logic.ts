import type { Status, StatusChange, Task } from '../../types/task';

export const COLUMNS: { status: Status; title: string }[] = [
  { status: 'todo', title: 'To-do' },
  { status: 'doing', title: 'Doing' },
  { status: 'done', title: 'Done' },
];

/**
 * A column in the shape the board renders.
 *
 * Real columns come from `GET /api/boards/:id/columns`. `FALLBACK_COLUMNS`
 * stands in while that request is loading, or when the backend predates this
 * phase - and deliberately keeps `id === status`, so the droppable ids and the
 * drag rules are exactly what they were before columns became custom.
 */
export interface ColumnLike {
  id: string;
  name: string;
  stage: Status;
  color?: string;
  wip_limit?: number | null;
  task_count?: number;
  over_wip_limit?: boolean;
}

export const FALLBACK_COLUMNS: ColumnLike[] = COLUMNS.map((c) => ({
  id: c.status,
  name: c.title,
  stage: c.status,
}));

/**
 * Which column a card belongs to.
 *
 * `column_id` wins so a card parked in a custom column stays there. A card
 * that predates columns (`column_id` null) lands in the first column carrying
 * its status - the same rule the backend applies when it rehomes a card.
 */
export const columnForTask = (
  task: Pick<Task, 'status' | 'column_id'>,
  columns: ColumnLike[]
): ColumnLike | null => {
  if (task.column_id) {
    const exact = columns.find((c) => c.id === task.column_id);
    if (exact) return exact;
  }
  return columns.find((c) => c.stage === (task.status ?? 'todo')) ?? null;
};

/**
 * The column a drop targets.
 *
 * A drop target is either a column id ("todo" for the fallback columns, a UUID
 * for real ones) or another card's id, in which case that card's column is the
 * destination. Null when the target is unknown, which the caller treats as
 * "do nothing" rather than guessing a destination.
 */
export const resolveTargetColumn = (
  overId: string,
  tasks: Pick<Task, 'id' | 'status' | 'column_id'>[],
  columns: ColumnLike[] = FALLBACK_COLUMNS
): ColumnLike | null => {
  const direct = columns.find((c) => c.id === overId);
  if (direct) return direct;
  const task = tasks.find((t) => t.id === overId);
  return task ? columnForTask(task, columns) : null;
};

/**
 * The stage a drop lands on. `columns` is optional so callers (and tests) that
 * only care about the three classic columns can keep passing two arguments.
 */
export const resolveTargetStatus = (
  overId: string,
  tasks: Pick<Task, 'id' | 'status'>[],
  columns?: ColumnLike[] | null
): Status | null => {
  const column = columns?.find((c) => c.id === overId);
  if (column) return column.stage;
  if (COLUMNS.some((c) => c.status === overId)) return overId as Status;
  return tasks.find((task) => task.id === overId)?.status ?? null;
};

/**
 * The updates to send when cards are dropped on `targetStatus`.
 *
 * `targetColumnId` is included when the caller knows the exact destination
 * column, which is what keeps two columns sharing a stage distinct. Tasks
 * already in that column are excluded, so a drop that changes nothing produces
 * an empty array and the caller skips the request entirely.
 */
export const buildMoveUpdates = (
  tasks: Pick<Task, 'id' | 'status' | 'column_id'>[],
  idsToMove: string[],
  targetStatus: Status,
  targetColumnId?: string | null
): StatusChange[] =>
  tasks
    .filter(
      (task) =>
        idsToMove.includes(task.id) &&
        (task.status !== targetStatus ||
          (targetColumnId != null && task.column_id !== targetColumnId))
    )
    .map((task) =>
      // Only name a column when the caller actually has a real one. The
      // fallback columns use the status string as their id, which the backend
      // would reject as a malformed UUID, so those moves stay status-only.
      targetColumnId != null
        ? { id: task.id, status: targetStatus, column_id: targetColumnId }
        : { id: task.id, status: targetStatus }
    );

/** True when `isAlready` equals `status`, i.e. the drop would be a no-op. */
export const isNoOpMove = (isAlready: Status | undefined, status: Status): boolean =>
  isAlready === status;