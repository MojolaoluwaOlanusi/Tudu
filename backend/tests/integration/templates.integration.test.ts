import request from 'supertest';
import app from '../../src/app';
import { auth, destroyUser, registerUser, TestUser } from './helpers';

/** Feature 4.9 - list built-in templates and install one as a new board. */
describe('board templates', () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await registerUser('templates');
  });

  afterAll(async () => {
    await destroyUser(user);
  });

  it('GET /api/templates lists every built-in template', async () => {
    const res = await request(app).get('/api/templates').set(auth(user));
    expect(res.status).toBe(200);
    const slugs = (res.body as { slug: string }[]).map((t) => t.slug).sort();
    expect(slugs).toEqual([
      'blank',
      'bug-tracker',
      'content-calendar',
      'freelancer-projects',
      'personal',
      'student-kanban',
      'team-sprint',
    ]);
  });

  it('installs a template as a new board with the template columns and cards', async () => {
    const before = await request(app).get('/api/boards').set(auth(user));
    const countBefore = (before.body as unknown[]).length;

    const install = await request(app)
      .post('/api/templates/bug-tracker/install')
      .set(auth(user))
      .send({});
    expect(install.status).toBe(201);
    expect(install.body.name).toBe('Bug tracker');

    const boardId = install.body.id;
    const columns = await request(app)
      .get('/api/boards/' + boardId + '/columns')
      .set(auth(user));
    expect(columns.body).toHaveLength(6);
    expect(columns.body.map((c: { name: string }) => c.name)).toContain('QA');

    const after = await request(app).get('/api/boards').set(auth(user));
    expect((after.body as unknown[]).length).toBe(countBefore + 1);
  });

  it('honours a name override', async () => {
    const install = await request(app)
      .post('/api/templates/student-kanban/install')
      .set(auth(user))
      .send({ name: 'Spring semester' });
    expect(install.status).toBe(201);
    expect(install.body.name).toBe('Spring semester');
  });

  it('installs the blank template as an empty board', async () => {
    const install = await request(app)
      .post('/api/templates/blank/install')
      .set(auth(user))
      .send({});
    expect(install.status).toBe(201);

    const columns = await request(app)
      .get('/api/boards/' + install.body.id + '/columns')
      .set(auth(user));
    expect(columns.body).toHaveLength(3);

    const tasks = await request(app)
      .get('/api/tasks')
      .query({ scope: 'all' })
      .set(auth(user));
    const onBoard = (tasks.body as { board_id: string }[]).filter(
      (t) => t.board_id === install.body.id
    );
    expect(onBoard).toHaveLength(0);
  });

  it('returns 404 for an unknown template slug', async () => {
    const res = await request(app)
      .post('/api/templates/does-not-exist/install')
      .set(auth(user))
      .send({});
    expect(res.status).toBe(404);
  });

  it('refuses to install into a workspace the caller is not a member of', async () => {
    const other = await registerUser('templates-other');
    try {
      const theirWorkspace = await request(app)
        .post('/api/workspaces')
        .set(auth(other))
        .send({ name: 'Their space' });

      const res = await request(app)
        .post('/api/templates/personal/install')
        .set(auth(user))
        .send({ workspace_id: theirWorkspace.body.id });
      expect(res.status).toBe(404);
    } finally {
      await destroyUser(other);
    }
  });
});
