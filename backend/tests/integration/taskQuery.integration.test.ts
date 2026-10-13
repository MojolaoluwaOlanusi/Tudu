import request from 'supertest';
import app from '../../src/app';
import { auth, destroyUser, registerUser, TestUser } from './helpers';

/** The query language behind the List view search box. */
describe('power filters', () => {
  let user: TestUser;
  let boardId: string;

  beforeAll(async () => {
    user = await registerUser('query');
    const boards = await request(app).get('/api/boards').set(auth(user));
    boardId = boards.body[0].id;
  });

  afterAll(async () => {
    await destroyUser(user);
  });

  const create = async (body: Record<string, unknown>) =>
    (await request(app).post('/api/tasks').set(auth(user)).send({ board_id: boardId, ...body }))
      .body;

  const search = async (q: string) => {
    const res = await request(app).get('/api/tasks').query({ search: q }).set(auth(user));
    return res.body as { title: string }[];
  };

  const titlesOf = (rows: { title: string }[]) => rows.map((t) => t.title).sort();

  it('finds tasks by bare text (the old behaviour)', async () => {
    await create({ title: 'Fix the login button' });
    await create({ title: 'Write the newsletter' });
    expect(titlesOf(await search('login'))).toEqual(['Fix the login button']);
  });

  it('filters by category with #tag', async () => {
    await create({ title: 'A work task', category: 'work' });
    await create({ title: 'A study task', category: 'study' });
    expect(titlesOf(await search('#work'))).toEqual(['A work task']);
    expect(titlesOf(await search('#study'))).toEqual(['A study task']);
  });

  it('falls back to free text for an unknown #tag', async () => {
    // `naturalLanguage: false` stores the title verbatim. With NLP on, the
    // parser strips "#urgent" (it is not a known category) before the row
    // is written, so searching for it would find nothing.
    await create({ title: 'The #urgent memo', naturalLanguage: false });
    expect(titlesOf(await search('#urgent'))).toEqual(['The #urgent memo']);
  });

  it('filters by priority with priority:', async () => {
    await create({ title: 'High one', priority: 'high' });
    await create({ title: 'Low one', priority: 'low' });
    const high = await search('priority:high');
    expect(high.map((t) => t.title)).toContain('High one');
    expect(high.map((t) => t.title)).not.toContain('Low one');
  });

  it('filters by is:open and is:completed', async () => {
    await create({ title: 'Open one', status: 'todo' });
    const done = await create({ title: 'Done one' });
    await request(app)
      .put(`/api/tasks/${done.id}`)
      .set(auth(user))
      .send({ status: 'done' });

    const open = titlesOf(await search('is:open'));
    const completed = titlesOf(await search('is:completed'));
    expect(open).toContain('Open one');
    expect(completed).toContain('Done one');
    expect(open).not.toContain('Done one');
    expect(completed).not.toContain('Open one');
  });

  it('filters by due:overdue', async () => {
    const past = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    await create({ title: 'Overdue task', due_date: past });
    const overdue = titlesOf(await search('due:overdue'));
    expect(overdue).toContain('Overdue task');
  });

  it('composes operators with AND', async () => {
    await create({ title: 'Combo', category: 'work', priority: 'high' });
    await create({ title: 'Work but low', category: 'work', priority: 'low' });
    const combo = titlesOf(await search('#work priority:high'));
    expect(combo).toContain('Combo');
    expect(combo).not.toContain('Work but low');
  });

  it('sorts by due_date ascending', async () => {
    const soon = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const later = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString();
    await create({ title: 'Later due', due_date: later });
    await create({ title: 'Soon due', due_date: soon });

    const res = await request(app)
      .get('/api/tasks')
      .query({ sort: 'due_date', order: 'asc' })
      .set(auth(user));
    const titles: string[] = res.body.map((t: { title: string }) => t.title);
    const iSoon = titles.indexOf('Soon due');
    const iLater = titles.indexOf('Later due');
    expect(iSoon).toBeGreaterThanOrEqual(0);
    expect(iLater).toBeGreaterThan(iSoon);
  });
});
