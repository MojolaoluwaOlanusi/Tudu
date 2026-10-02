import type { Status, StatusChange, Task } from '../../types/task';

export const COLUMNS: { status: Status; title: string }[] = [
  { status: 'todo', title: 'To-do' },
  { status: 'doing', title: 'Doing' },
  { status: 'done', title: 'Done' },
];

/**
 * A drop target is either a column id ("todo") or another card's id, in which
 * case the card's current status decides the column.
 *
 * Returns null when the target is unknown, which the caller treats as "do
 * nothing" rather than guessing a destination.
 */
export const resolveTargetStatus = (
  overId: string,
  tasks: Pick<Task, 'id' | 'status'>[]
): Status | null => {
  if (COLUMNS.some((column) => column.status === overId)) return overId as Status;
  return tasks.find((task) => task.id === overId)?.status ?? null;
};

/**
 * The status updates to send when cards are dropped on `targetStatus`.
 *
 * Tasks already in that column are excluded, so a drop that changes nothing
 * produces an empty array and the caller skips the request entirely.
 */
export const buildMoveUpdates = (
  tasks: Pick<Task, 'id' | 'status'>[],
  idsToMove: string[],
  targetStatus: Status
): StatusChange[] =>
  tasks
    .filter((task) => idsToMove.includes(task.id) && task.status !== targetStatus)
    .map((task) => ({ id: task.id, status: targetStatus }));

/** True when `isAlready` equals `status`, i.e. the drop would be a no-op. */
export const isNoOpMove = (isAlready: Status | undefined, status: Status): boolean =>
  isAlready === status;