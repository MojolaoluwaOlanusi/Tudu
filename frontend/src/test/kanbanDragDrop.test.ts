import { describe, it, expect } from 'vitest';
import {
  COLUMNS,
  resolveTargetStatus,
  buildMoveUpdates,
  isNoOpMove,
} from '../components/kanban/logic';

/**
 * Drag-and-drop behaviour.
 *
 * The dnd-kit pointer gestures themselves cannot be simulated reliably in
 * jsdom, so the decision logic that a drop depends on is extracted into
 * `logic.ts` and tested directly. These are the exact rules the board runs.
 */
const tasks = [
  { id: 'a', status: 'todo' as const },
  { id: 'b', status: 'doing' as const },
  { id: 'c', status: 'done' as const },
];

describe('COLUMNS', () => {
  it('exposes the three board columns in order', () => {
    expect(COLUMNS.map((c) => c.status)).toEqual(['todo', 'doing', 'done']);
  });
});

describe('resolveTargetStatus', () => {
  it('accepts a column id directly', () => {
    expect(resolveTargetStatus('todo', tasks)).toBe('todo');
    expect(resolveTargetStatus('doing', tasks)).toBe('doing');
    expect(resolveTargetStatus('done', tasks)).toBe('done');
  });

  it('infers the column from the card that was dropped on', () => {
    // Dropping a card onto another card should adopt that card's column.
    expect(resolveTargetStatus('b', tasks)).toBe('doing');
    expect(resolveTargetStatus('c', tasks)).toBe('done');
  });

  it('returns null for an unknown target so the caller can bail out', () => {
    expect(resolveTargetStatus('nope', tasks)).toBeNull();
    expect(resolveTargetStatus('', tasks)).toBeNull();
  });
});

describe('buildMoveUpdates', () => {
  it('moves a single card to the target column', () => {
    expect(buildMoveUpdates(tasks, ['a'], 'done')).toEqual([
      { id: 'a', status: 'done' },
    ]);
  });

  it('moves a multi-selection together', () => {
    const updates = buildMoveUpdates(tasks, ['a', 'b'], 'done');
    expect(updates).toEqual([
      { id: 'a', status: 'done' },
      { id: 'b', status: 'done' },
    ]);
  });

  it('skips cards already in the target column', () => {
    // "c" is already done, so dropping the selection on Done must not include it.
    const updates = buildMoveUpdates(tasks, ['a', 'c'], 'done');
    expect(updates).toEqual([{ id: 'a', status: 'done' }]);
  });

  it('returns nothing when every selected card is already there', () => {
    expect(buildMoveUpdates(tasks, ['c'], 'done')).toEqual([]);
  });

  it('returns nothing for an empty selection', () => {
    expect(buildMoveUpdates(tasks, [], 'done')).toEqual([]);
  });

  it('ignores ids that are not on the board', () => {
    expect(buildMoveUpdates(tasks, ['ghost'], 'done')).toEqual([]);
  });
});

describe('isNoOpMove', () => {
  it('treats a drop into the current column as a no-op', () => {
    expect(isNoOpMove('doing', 'doing')).toBe(true);
  });

  it('treats any change of column as a real move', () => {
    expect(isNoOpMove('todo', 'done')).toBe(false);
    expect(isNoOpMove(undefined, 'done')).toBe(false);
  });
});