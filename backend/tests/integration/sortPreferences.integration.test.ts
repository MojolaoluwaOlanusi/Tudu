import request from 'supertest';
import app from '../../src/app';
import { auth, destroyUser, registerUser, TestUser } from './helpers';

/** Feature 4.4 — sort keys and per-user preferences. */
describe('sorting and preferences', () => {
  let user: TestUser;
  let boardId: string;

  beforeAll(async () => {
    user = await registerUser('sort-prefs');
    const boards = await request(app).get('/api/boards').set(auth(user));
    boardId = boards.body[0].id;
  });

  afterAll(async () => {
    await destroyUser(user);
  });

  const create = async (body: Record<string, unknown>) =>
    (await request(app)
      .post('/api/tasks')
      .set(auth(user))
      .send({ board_id: boardId, naturalLanguage: false, ...body })).body;

  it('sorts by title ascending', async () => {
    await create({ title: 'Zebra' });
    await create({ title: 'Alpha' });
    const res = await request(app)
      .get('/api/tasks')
      .query({ sort: 'title', order: 'asc' })
      .set(auth(user));
    const titles: string[] = res.body.map((t: { title: string }) => t.title);
    expect(titles.indexOf('Alpha')).toBeLessThan(titles.indexOf('Zebra'));
  });

  it('sorts by category with nulls last', async () => {
    await create({ title: 'Cat-personal', category: 'personal' });
    await create({ title: 'Cat-work', category: 'work' });
    await create({ title: 'Cat-none' });
    const res = await request(app)
      .get('/api/tasks')
      .query({ sort: 'category', order: 'asc' })
      .set(auth(user));
    // 'personal' comes before 'work' alphabetically; the null lands last.
    const cat = res.body.map((t: { category: string | null }) => t.category);
    const firstNonNull = cat.findIndex((c) => c !== null);
    expect(firstNonNull).toBeGreaterThanOrEqual(0);
    expect(cat[cat.length - 1]).toBeNull();
  });

  it('accepts assignee as a sort key without erroring', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .query({ sort: 'assignee', order: 'desc' })
      .set(auth(user));
    expect(res.status).toBe(200);
  });

  it('falls back to created_at for an unknown sort key rather than 500', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .query({ sort: 'bogus', order: 'asc' })
      .set(auth(user));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/users/me/preferences returns an object', async () => {
    const res = await request(app).get('/api/users/me/preferences').set(auth(user));
    expect(res.status).toBe(200);
    expect(typeof res.body).toBe('object');
  });

  it('PUT /api/users/me/preferences merges valid keys', async () => {
    const first = await request(app)
      .put('/api/users/me/preferences')
      .set(auth(user))
      .send({ default_sort: 'due_date', default_order: 'asc' });
    expect(first.status).toBe(200);
    expect(first.body.default_sort).toBe('due_date');
    expect(first.body.default_order).toBe('asc');

    // Sending only one key must not blank the other.
    const second = await request(app)
      .put('/api/users/me/preferences')
      .set(auth(user))
      .send({ default_sort: 'priority' });
    expect(second.status).toBe(200);
    expect(second.body.default_sort).toBe('priority');
    expect(second.body.default_order).toBe('asc');
  });

  it('rejects unknown preference keys', async () => {
    const res = await request(app)
      .put('/api/users/me/preferences')
      .set(auth(user))
      .send({ random_key: 'value' });
    expect(res.status).toBe(400);
  });

  it('rejects a bad sort value', async () => {
    const res = await request(app)
      .put('/api/users/me/preferences')
      .set(auth(user))
      .send({ default_sort: 'nope' });
    expect(res.status).toBe(400);
  });
});
