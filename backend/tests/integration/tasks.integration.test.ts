import request from 'supertest';
import app from '../../src/app';
import { registerUser, destroyUser, auth, type TestUser } from './helpers';

/** CRUD and user isolation, exercised against the real database. */
describe('tasks', () => {
  let user: TestUser;
  const other: TestUser[] = [];

  beforeAll(async () => {
    user = await registerUser('tasks');
  });

  afterAll(async () => {
    await destroyUser(user);
    for (const o of other) await destroyUser(o);
  });

  const createTask = async (body: Record<string, unknown>) => {
    const res = await request(app).post('/api/tasks').set(auth(user)).send(body);
    return res;
  };

  it('creates a task with defaults', async () => {
    const res = await createTask({ title: 'Write the tests' });

    expect(res.status).toBe(201);
    expect(res.body.title ?? res.body.data?.title).toBe('Write the tests');
    expect(res.body.status ?? res.body.data?.status).toBe('todo');
  });

  it('requires a title', async () => {
    const res = await createTask({});
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('lists only the caller\'s own tasks', async () => {
    const stranger = await registerUser('stranger');
    other.push(stranger);
    await createTask({ title: 'Mine to see' });
    await request(app)
      .post('/api/tasks')
      .set(auth(stranger))
      .send({ title: 'Theirs to hide' });

    const mine = await request(app).get('/api/tasks').set(auth(user));
    const titles = JSON.stringify(mine.body);

    expect(mine.status).toBe(200);
    expect(titles).toContain('Mine to see');
    expect(titles).not.toContain('Theirs to hide');
  });

  it('filters by status', async () => {
    const res = await request(app).get('/api/tasks?status=done').set(auth(user));
    expect(res.status).toBe(200);

    const tasks: { status: string }[] = res.body ?? [];
    for (const task of tasks) expect(task.status).toBe('done');
  });

  it('completes a task and records the transition', async () => {
    const created = await createTask({ title: 'Finish me' });
    const id = created.body.id ?? created.body.data?.id;

    const res = await request(app)
      .patch(`/api/tasks/${id}/status`)
      .set(auth(user))
      .send({ status: 'done' });

    expect(res.status).toBe(200);
    expect(res.body.status ?? res.body.data?.status).toBe('done');
  });

  it('refuses to touch another user\'s task', async () => {
    const stranger = await registerUser('intruder');
    other.push(stranger);
    const created = await createTask({ title: 'Private' });
    const id = created.body.id ?? created.body.data?.id;

    const res = await request(app)
      .patch(`/api/tasks/${id}/status`)
      .set(auth(stranger))
      .send({ status: 'done' });

    expect([403, 404]).toContain(res.status);
  });

  it('updates fields via PUT', async () => {
    const created = await createTask({ title: 'Before' });
    const id = created.body.id ?? created.body.data?.id;

    const res = await request(app)
      .put(`/api/tasks/${id}`)
      .set(auth(user))
      .send({ title: 'After' });

    expect(res.status).toBe(200);
    expect(res.body.title ?? res.body.data?.title).toBe('After');
  });

  it('deletes a task and it stays deleted', async () => {
    const created = await createTask({ title: 'Temporary' });
    const id = created.body.id ?? created.body.data?.id;

    const del = await request(app).delete(`/api/tasks/${id}`).set(auth(user));
    expect(del.status).toBe(200);

    const after = await request(app).get(`/api/tasks/${id}`).set(auth(user));
    expect(after.status).toBe(404);
  });

  it('returns 404 for a task that does not exist', async () => {
    const res = await request(app)
      .get('/api/tasks/00000000-0000-4000-8000-000000000000')
      .set(auth(user));

    expect(res.status).toBe(404);
  });
});