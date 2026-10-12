import request from 'supertest';
import app from '../../src/app';
import { auth, destroyUser, registerUser, TestUser } from './helpers';

/**
 * Phase 1.1b - every task lives on exactly one board, in a column whose stage
 * equals its status, no matter which endpoint changed it.
 */
describe('board integrity', () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await registerUser('integrity');
  });

  afterAll(async () => {
    await destroyUser(user);
  });

  type Col = { id: string; name: string; stage: string };

  const boards = async () =>
    (await request(app).get('/api/boards').set(auth(user))).body as { id: string; name: string }[];

  const columnsOf = async (boardId: string) =>
    (await request(app).get(`/api/boards/${boardId}/columns`).set(auth(user))).body as Col[];

  const stageColumn = (cols: Col[], stage: string) => cols.find((c) => c.stage === stage)!;

  it('adopts tasks created before the first board existed', async () => {
    const early = await request(app).post('/api/tasks').set(auth(user)).send({ title: 'Before any board' });
    expect(early.status).toBe(201);

    const [board] = await boards(); // first call creates the default board and adopts the task
    const cols = await columnsOf(board.id);

    const after = await request(app).get(`/api/tasks/${early.body.id}`).set(auth(user));
    expect(after.body.board_id).toBe(board.id);
    expect(after.body.column_id).toBe(stageColumn(cols, 'todo').id);
  });

  it('puts a new task on the default board, in the column for its status', async () => {
    const [board] = await boards();
    const cols = await columnsOf(board.id);

    const res = await request(app).post('/api/tasks').set(auth(user)).send({ title: 'Plain new task' });
    expect(res.status).toBe(201);
    expect(res.body.board_id).toBe(board.id);
    expect(res.body.column_id).toBe(stageColumn(cols, 'todo').id);
  });

  it('creates a task on the board it was asked for', async () => {
    const other = await request(app).post('/api/boards').set(auth(user)).send({ name: 'Second board' });
    const cols = await columnsOf(other.body.id);

    const res = await request(app)
      .post('/api/tasks')
      .set(auth(user))
      .send({ title: 'On the second board', board_id: other.body.id });

    expect(res.status).toBe(201);
    expect(res.body.board_id).toBe(other.body.id);
    expect(res.body.column_id).toBe(stageColumn(cols, 'todo').id);
  });

  it("rejects a board or column that is not the caller's", async () => {
    const stranger = await registerUser('stranger');
    try {
      const theirs = (await request(app).get('/api/boards').set(auth(stranger))).body[0];
      const res = await request(app)
        .post('/api/tasks')
        .set(auth(user))
        .send({ title: 'Sneaky', board_id: theirs.id });
      expect(res.status).toBe(404);
    } finally {
      await destroyUser(stranger);
    }
  });

  it('keeps the column in step when only the status changes (List dropdown)', async () => {
    const [board] = await boards();
    const cols = await columnsOf(board.id);

    const task = await request(app).post('/api/tasks').set(auth(user)).send({ title: 'Dropdown task' });

    // Drag it into Done...
    await request(app)
      .patch(`/api/tasks/${task.body.id}/status`)
      .set(auth(user))
      .send({ column_id: stageColumn(cols, 'done').id });

    // ...then use the List view's status dropdown, which is PUT /api/tasks/:id.
    const res = await request(app)
      .put(`/api/tasks/${task.body.id}`)
      .set(auth(user))
      .send({ status: 'doing' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('doing');
    expect(res.body.column_id).toBe(stageColumn(cols, 'doing').id);
  });

  it("moves a task to another board when it is dropped into that board's column", async () => {
    const other = await request(app).post('/api/boards').set(auth(user)).send({ name: 'Drop target' });
    const cols = await columnsOf(other.body.id);

    const task = await request(app).post('/api/tasks').set(auth(user)).send({ title: 'Wanderer' });
    const res = await request(app)
      .patch(`/api/tasks/${task.body.id}/status`)
      .set(auth(user))
      .send({ column_id: stageColumn(cols, 'doing').id });

    expect(res.status).toBe(200);
    expect(res.body.board_id).toBe(other.body.id);
    expect(res.body.status).toBe('doing');
  });

  it('asks for confirmation before deleting a board that still has tasks', async () => {
    const doomed = await request(app).post('/api/boards').set(auth(user)).send({ name: 'Doomed' });
    await request(app).post('/api/tasks').set(auth(user)).send({ title: 'Goes too', board_id: doomed.body.id });

    const refused = await request(app).delete(`/api/boards/${doomed.body.id}`).set(auth(user));
    expect(refused.status).toBe(409);
    expect(refused.body.task_count).toBe(1);

    const done = await request(app)
      .delete(`/api/boards/${doomed.body.id}`)
      .query({ confirm: 'true' })
      .set(auth(user));
    expect(done.status).toBe(200);
  });

  it('never leaves a task whose status disagrees with its column', async () => {
    const all = await request(app).get('/api/tasks').set(auth(user));
    const cache = new Map<string, Col>();
    for (const board of await boards()) {
      for (const col of await columnsOf(board.id)) cache.set(col.id, col);
    }
    for (const task of all.body as { column_id: string | null; status: string }[]) {
      if (!task.column_id) continue;
      expect(cache.get(task.column_id)?.stage).toBe(task.status);
    }
  });
});
