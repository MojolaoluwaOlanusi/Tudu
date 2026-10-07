import request from 'supertest';
import app from '../../src/app';
import { auth, destroyUser, registerUser, TestUser } from './helpers';

/**
 * Phase 1.1 - custom columns & board flexibility.
 *
 * The load-bearing guarantee these tests defend is that a board can be
 * customised without `tasks.status` ever disagreeing with where the card
 * actually sits: analytics, filters and the activity log all read `status`.
 */
describe('boards and columns', () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await registerUser('boards');
  });

  afterAll(async () => {
    await destroyUser(user);
  });

  /** The first board, created on demand by GET /api/boards. */
  const firstBoard = async () => {
    const res = await request(app).get('/api/boards').set(auth(user));
    expect(res.status).toBe(200);
    return res.body[0];
  };

  it('gives a brand new account a default board with the three classic columns', async () => {
    const board = await firstBoard();

    expect(board.name).toBe('My board');
    expect(board.column_count).toBe(3);

    const cols = await request(app)
      .get(`/api/boards/${board.id}/columns`)
      .set(auth(user));
    expect(cols.status).toBe(200);
    expect(cols.body.map((c: { name: string }) => c.name)).toEqual(['To-do', 'Doing', 'Done']);
    expect(cols.body.map((c: { stage: string }) => c.stage)).toEqual(['todo', 'doing', 'done']);
  });

  it('is idempotent - listing twice does not invent a second board', async () => {
    const first = await firstBoard();
    const second = await firstBoard();
    expect(second.id).toBe(first.id);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/boards');
    expect(res.status).toBe(401);
  });

  it('creates a board seeded with the three default columns', async () => {
    const res = await request(app)
      .post('/api/boards')
      .set(auth(user))
      .send({ name: '  Marketing  ' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Marketing');

    const cols = await request(app)
      .get(`/api/boards/${res.body.id}/columns`)
      .set(auth(user));
    expect(cols.body).toHaveLength(3);
  });

  it('rejects a blank board name', async () => {
    const res = await request(app).post('/api/boards').set(auth(user)).send({ name: '   ' });
    expect(res.status).toBe(400);
  });

  it('adds a column to the end of the board', async () => {
    const board = await firstBoard();
    const res = await request(app)
      .post(`/api/boards/${board.id}/columns`)
      .set(auth(user))
      .send({ name: 'In review', stage: 'doing', color: 'violet', wip_limit: 3 });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('In review');
    expect(res.body.stage).toBe('doing');
    expect(res.body.color).toBe('violet');
    expect(res.body.wip_limit).toBe(3);
    expect(res.body.position).toBe(3);

    const cols = await request(app)
      .get(`/api/boards/${board.id}/columns`)
      .set(auth(user));
    expect(cols.body).toHaveLength(4);
    expect(cols.body[3].name).toBe('In review');
  });

  it('rejects a WIP limit that is not a positive whole number', async () => {
    const board = await firstBoard();
    const res = await request(app)
      .post(`/api/boards/${board.id}/columns`)
      .set(auth(user))
      .send({ name: 'Bad', wip_limit: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/WIP limit/i);
  });

  it('rejects an unknown stage and an unknown colour', async () => {
    const board = await firstBoard();

    const stage = await request(app)
      .post(`/api/boards/${board.id}/columns`)
      .set(auth(user))
      .send({ name: 'Nope', stage: 'archived' });
    expect(stage.status).toBe(400);

    const colour = await request(app)
      .post(`/api/boards/${board.id}/columns`)
      .set(auth(user))
      .send({ name: 'Nope', color: 'chartreuse' });
    expect(colour.status).toBe(400);
  });

  it('renames a column and clears its WIP limit with an explicit null', async () => {
    const board = await firstBoard();
    const cols = await request(app)
      .get(`/api/boards/${board.id}/columns`)
      .set(auth(user));
    const target = cols.body.find((c: { name: string }) => c.name === 'In review');

    const res = await request(app)
      .put(`/api/columns/${target.id}`)
      .set(auth(user))
      .send({ name: 'QA', wip_limit: null });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('QA');
    expect(res.body.wip_limit).toBeNull();
  });

  it('rejects an empty column name', async () => {
    const board = await firstBoard();
    const cols = await request(app)
      .get(`/api/boards/${board.id}/columns`)
      .set(auth(user));

    const res = await request(app)
      .put(`/api/columns/${cols.body[0].id}`)
      .set(auth(user))
      .send({ name: '  ' });
    expect(res.status).toBe(400);
  });

  /**
   * The whole point of the phase: a card moved onto a custom column reports
   * that column's stage as its status, so analytics and filters stay truthful.
   */
  it('derives status from the column a card is moved to', async () => {
    const board = await firstBoard();
    const cols = await request(app)
      .get(`/api/boards/${board.id}/columns`)
      .set(auth(user));
    const done = cols.body.find((c: { stage: string }) => c.stage === 'done');

    const created = await request(app)
      .post('/api/tasks')
      .set(auth(user))
      .send({ title: 'Board column task' });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('todo');

    const moved = await request(app)
      .patch(`/api/tasks/${created.body.id}/status`)
      .set(auth(user))
      .send({ status: 'todo', column_id: done.id });

    expect(moved.status).toBe(200);
    // The column wins over whatever status the client also sent.
    expect(moved.body.status).toBe('done');
    expect(moved.body.column_id).toBe(done.id);
  });

  it('leaves a status-only move in the matching column', async () => {
    const board = await firstBoard();
    const cols = await request(app)
      .get(`/api/boards/${board.id}/columns`)
      .set(auth(user));
    const qa = cols.body.find((c: { stage: string }) => c.stage === 'doing');

    const created = await request(app)
      .post('/api/tasks')
      .set(auth(user))
      .send({ title: 'Status only task' });

    // Explicitly park it in the custom "QA" column (stage: doing).
    await request(app)
      .patch(`/api/tasks/${created.body.id}/status`)
      .set(auth(user))
      .send({ column_id: qa.id });

    // A legacy status-only move to the same stage must not evict it.
    const res = await request(app)
      .patch(`/api/tasks/${created.body.id}/status`)
      .set(auth(user))
      .send({ status: 'doing' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('doing');
    expect(res.body.column_id).toBe(qa.id);
  });

  it('refuses to delete the last remaining column', async () => {
    const created = await request(app)
      .post('/api/boards')
      .set(auth(user))
      .send({ name: 'Single column' });
    const boardId = created.body.id;

    // Empty the board down to one column.
    for (let i = 0; i < 2; i += 1) {
      const cols = await request(app)
        .get(`/api/boards/${boardId}/columns`)
        .set(auth(user));
      await request(app)
        .delete(`/api/columns/${cols.body[cols.body.length - 1].id}`)
        .set(auth(user));
    }

    const remaining = await request(app)
      .get(`/api/boards/${boardId}/columns`)
      .set(auth(user));
    expect(remaining.body).toHaveLength(1);

    const res = await request(app)
      .delete(`/api/columns/${remaining.body[0].id}`)
      .set(auth(user));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least one column/i);
  });

  it('moves cards to a sibling of the same stage instead of deleting them', async () => {
    const created = await request(app)
      .post('/api/boards')
      .set(auth(user))
      .send({ name: 'Rehome board' });
    const boardId = created.body.id;

    const second = await request(app)
      .post(`/api/boards/${boardId}/columns`)
      .set(auth(user))
      .send({ name: 'Second todo', stage: 'todo' });

    const cols = await request(app)
      .get(`/api/boards/${boardId}/columns`)
      .set(auth(user));
    const firstTodo = cols.body.find((c: { name: string }) => c.name === 'To-do');

    const task = await request(app)
      .post('/api/tasks')
      .set(auth(user))
      .send({ title: 'Will be rehomed' });
    await request(app)
      .patch(`/api/tasks/${task.body.id}/status`)
      .set(auth(user))
      .send({ column_id: second.body.id });

    const res = await request(app)
      .delete(`/api/columns/${second.body.id}`)
      .set(auth(user));

    expect(res.status).toBe(200);
    expect(res.body.moved_tasks).toBe(1);
    expect(res.body.fallback_column_id).toBe(firstTodo.id);

    // The card survives, still 'todo', now parked in its sibling.
    const after = await request(app)
      .get(`/api/tasks/${task.body.id}`)
      .set(auth(user));
    expect(after.status).toBe(200);
    expect(after.body.status).toBe('todo');
    expect(after.body.column_id).toBe(firstTodo.id);
  });

  it('reorders columns when given the complete list', async () => {
    const board = await firstBoard();
    const cols = await request(app)
      .get(`/api/boards/${board.id}/columns`)
      .set(auth(user));
    const reversed = [...cols.body].reverse();

    const res = await request(app)
      .put('/api/columns/reorder')
      .set(auth(user))
      .send({ column_ids: reversed.map((c: { id: string }) => c.id) });

    expect(res.status).toBe(200);
    expect(res.body.map((c: { id: string }) => c.id)).toEqual(
      reversed.map((c: { id: string }) => c.id)
    );
    expect(res.body.map((c: { position: number }) => c.position)).toEqual([0, 1, 2, 3]);

    // Put them back so later assertions see the classic order.
    await request(app)
      .put('/api/columns/reorder')
      .set(auth(user))
      .send({ column_ids: cols.body.map((c: { id: string }) => c.id) });
  });

  it('rejects an incomplete or duplicated reorder', async () => {
    const board = await firstBoard();
    const cols = await request(app)
      .get(`/api/boards/${board.id}/columns`)
      .set(auth(user));
    const ids = cols.body.map((c: { id: string }) => c.id);

    const partial = await request(app)
      .put('/api/columns/reorder')
      .set(auth(user))
      .send({ column_ids: [ids[0]] });
    expect(partial.status).toBe(400);
    expect(partial.body.error).toMatch(/every column/i);

    const dupes = await request(app)
      .put('/api/columns/reorder')
      .set(auth(user))
      .send({ column_ids: [ids[0], ids[0], ids[1], ids[2]] });
    expect(dupes.status).toBe(400);
    expect(dupes.body.error).toMatch(/duplicate/i);
  });

  it("rejects another user's column and board", async () => {
    const other = await registerUser('boards-other');
    try {
      const mine = await firstBoard();
      const cols = await request(app)
        .get(`/api/boards/${mine.id}/columns`)
        .set(auth(user));

      const asOther = await request(app)
        .put(`/api/columns/${cols.body[0].id}`)
        .set(auth(other))
        .send({ name: 'Hijacked' });
      expect(asOther.status).toBe(404);

      const board = await request(app)
        .get(`/api/boards/${mine.id}`)
        .set(auth(other));
      expect(board.status).toBe(404);

      const del = await request(app)
        .delete(`/api/columns/${cols.body[0].id}`)
        .set(auth(other));
      expect(del.status).toBe(404);
    } finally {
      await destroyUser(other);
    }
  });

  it('refuses to delete the last board', async () => {
    const first = await firstBoard();
    const mine = await request(app).get('/api/boards').set(auth(user));
    for (const board of mine.body) {
      if (board.id !== first.id) {
        await request(app).delete(`/api/boards/${board.id}`).set(auth(user));
      }
    }

    const last = await request(app).get('/api/boards').set(auth(user));
    expect(last.body).toHaveLength(1);

    const res = await request(app)
      .delete(`/api/boards/${last.body[0].id}`)
      .set(auth(user));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least one board/i);
  });
});


