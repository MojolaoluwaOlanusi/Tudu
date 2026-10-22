import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  enqueue,
  listQueue,
  removeFromQueue,
  enqueueConflict,
  listConflicts,
  removeConflict,
  conflictCount,
} from '../lib/offlineQueue';

describe('offlineQueue conflicts', () => {
  beforeEach(async () => {
    for (const op of await listQueue()) await removeFromQueue(op.id);
    for (const c of await listConflicts()) await removeConflict(c.id);
  });

  it('stores and lists conflicts separately from the queue', async () => {
    await enqueueConflict({
      id: 'c1',
      type: 'update',
      payload: { id: 't1', task: { title: 'New' } },
      baseline: { title: 'Old' },
      currentState: { title: 'Something else' },
      conflictFields: ['title'],
      conflictReason: 'Fields changed on the server',
      createdAt: Date.now(),
    });
    expect(await conflictCount()).toBe(1);
    expect((await listConflicts())[0].conflictFields).toEqual(['title']);
  });

  it('removes a conflict by id', async () => {
    await enqueueConflict({
      id: 'c2',
      type: 'update',
      payload: { id: 't1', task: { title: 'New' } },
      baseline: { title: 'Old' },
      currentState: { title: 'Other' },
      conflictFields: ['title'],
      conflictReason: 'x',
      createdAt: Date.now(),
    });
    await removeConflict('c2');
    expect(await conflictCount()).toBe(0);
  });

  it('keeps batch mutations queueable', async () => {
    await enqueue({
      id: 'b1',
      type: 'batchDelete',
      payload: ['t1', 't2', 't3'],
      createdAt: Date.now(),
    });
    await enqueue({
      id: 'b2',
      type: 'batchAssign',
      payload: { ids: ['t1'], assigneeId: 'u1' },
      createdAt: Date.now(),
    });
    const queue = await listQueue();
    expect(queue.map((o) => o.type)).toEqual(['batchDelete', 'batchAssign']);
  });
});
