import request from 'supertest';
import app from '../../src/app';
import { auth, destroyUser, registerUser, TestUser } from './helpers';

/** The onboarding seed endpoint, plus the templates list. */
describe('onboarding', () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await registerUser('onboarding');
  });

  afterAll(async () => {
    await destroyUser(user);
  });

  it('GET /api/onboarding/templates returns every built-in', async () => {
    const res = await request(app).get('/api/onboarding/templates').set(auth(user));
    expect(res.status).toBe(200);
    const slugs = res.body.map((t: { slug: string }) => t.slug).sort();
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

  it('POST /api/onboarding/seed applies a template to the first board', async () => {
    // Make sure the default board exists.
    await request(app).get('/api/boards').set(auth(user));

    const res = await request(app)
      .post('/api/onboarding/seed')
      .set(auth(user))
      .send({ template: 'team-sprint' });
    expect(res.status).toBe(200);
    expect(res.body.template).toBe('team-sprint');

    // The board now has five columns, and its five example cards.
    const columns = await request(app)
      .get(`/api/boards/${res.body.board_id}/columns`)
      .set(auth(user));
    expect(columns.body).toHaveLength(5);

    const tasks = await request(app).get('/api/tasks').set(auth(user));
    expect(tasks.body.length).toBeGreaterThanOrEqual(5);
    const titles = tasks.body.map((t: { title: string }) => t.title);
    expect(titles).toContain('Set up CI pipeline');
    expect(titles).toContain('Fix login button on mobile');
  });

  it('POST /api/onboarding/seed rejects an unknown template', async () => {
    const res = await request(app)
      .post('/api/onboarding/seed')
      .set(auth(user))
      .send({ template: 'not-a-template' });
    expect(res.status).toBe(400);
  });

  it('POST /api/onboarding/seed refuses a board that already has cards', async () => {
    // The previous test seeded five cards onto the caller's first board.
    const res = await request(app)
      .post('/api/onboarding/seed')
      .set(auth(user))
      .send({ template: 'personal' });
    expect(res.status).toBe(409);
  });
});
