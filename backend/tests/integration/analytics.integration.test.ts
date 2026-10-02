import request from 'supertest';
import app from '../../src/app';
import { registerUser, destroyUser, auth, type TestUser } from './helpers';

/** The three analytics endpoints over real data, plus their auth boundary. */
describe('analytics endpoints', () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await registerUser('analytics');

    // Two work tasks and one personal, so the pie chart has several slices.
    const made: string[] = [];
    for (const [title, category, priority] of [
      ['Alpha', 'work', 'high'],
      ['Bravo', 'work', 'medium'],
      ['Charlie', 'personal', 'low'],
    ] as const) {
      const res = await request(app)
        .post('/api/tasks')
        .set(auth(user))
        .send({ title, category, priority });
      made.push(res.body.id ?? res.body.data?.id);
    }

    await request(app)
      .patch(`/api/tasks/${made[0]}/status`)
      .set(auth(user))
      .send({ status: 'done' });
    await request(app)
      .patch(`/api/tasks/${made[1]}/status`)
      .set(auth(user))
      .send({ status: 'done' });

    for (const [taskId, duration] of [
      [made[0], 25],
      [made[0], 25],
      [made[2], 50],
    ] as const) {
      const start = await request(app)
        .post('/api/pomodoro/start')
        .set(auth(user))
        .send({ taskId, duration });
      const sessionId = start.body.id ?? start.body.data?.session?.id;
      await request(app)
        .post('/api/pomodoro/complete')
        .set(auth(user))
        .send({ sessionId });
    }
  });

  afterAll(async () => {
    await destroyUser(user);
  });

  describe('/overview', () => {
    it('counts tasks and derives a completion rate', async () => {
      const res = await request(app).get('/api/analytics/overview').set(auth(user));

      expect(res.status).toBe(200);
      expect(res.body.tasks.total).toBe(3);
      expect(res.body.tasks.done).toBe(2);
      expect(res.body.completionRate).toBe(67);
      expect(res.body.byPriority.high).toBe(1);
      expect(res.body.byCategory.work).toBe(2);
    });

    it('reports lifetime focus time', async () => {
      const res = await request(app).get('/api/analytics/overview').set(auth(user));
      expect(res.body.focus.minutes).toBe(100);
      expect(res.body.focus.sessions).toBe(3);
    });

    it('requires authentication', async () => {
      expect((await request(app).get('/api/analytics/overview')).status).toBe(401);
    });
  });

  describe('/completed-tasks', () => {
    it.each([
      ['week', 7, 'day'],
      ['month', 30, 'day'],
      ['quarter', 12, 'week'],
    ])('buckets %s into %i %s buckets', async (range, expected, granularity) => {
      const res = await request(app)
        .get(`/api/analytics/completed-tasks?range=${range}`)
        .set(auth(user));

      expect(res.status).toBe(200);
      expect(res.body.buckets).toHaveLength(expected);
      expect(res.body.granularity).toBe(granularity);
      expect(res.body.total).toBe(2);
    });

    it('never repeats a bucket key', async () => {
      const res = await request(app)
        .get('/api/analytics/completed-tasks?range=quarter')
        .set(auth(user));

      const keys: string[] = res.body.buckets.map((b: { key: string }) => b.key);
      expect(new Set(keys).size).toBe(keys.length);
    });

    it('falls back to the week range for nonsense input', async () => {
      const res = await request(app)
        .get('/api/analytics/completed-tasks?range=fortnight')
        .set(auth(user));

      expect(res.body.range).toBe('week');
    });

    it('requires authentication', async () => {
      expect((await request(app).get('/api/analytics/completed-tasks')).status).toBe(401);
    });
  });

  describe('/time-spent', () => {
    it('splits focus time by category with shares summing to 100', async () => {
      const res = await request(app)
        .get('/api/analytics/time-spent?range=month')
        .set(auth(user));

      expect(res.status).toBe(200);
      expect(res.body.totalMinutes).toBe(100);

      const work = res.body.byCategory.find((c: { category: string }) => c.category === 'work');
      const personal = res.body.byCategory.find(
        (c: { category: string }) => c.category === 'personal'
      );
      expect(work.minutes).toBe(50);
      expect(personal.minutes).toBe(50);

      const shares = res.body.byCategory.reduce(
        (sum: number, c: { share: number }) => sum + c.share,
        0
      );
      expect(shares).toBe(100);
    });

    it('requires authentication', async () => {
      expect((await request(app).get('/api/analytics/time-spent')).status).toBe(401);
    });
  });
});