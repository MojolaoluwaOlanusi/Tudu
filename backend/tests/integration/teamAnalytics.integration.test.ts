import request from 'supertest';
import app from '../../src/app';
import pool from '../../src/config/database';
import { auth, destroyUser, registerUser, TestUser } from './helpers';

/** Feature 5.11 - team analytics access and aggregates. */
describe('team analytics', () => {
  let admin: TestUser;
  let member: TestUser;
  let outsider: TestUser;
  let freeUser: TestUser;
  let workspaceId: string;
  let boardId: string;

  beforeAll(async () => {
    admin = await registerUser('ta-admin');
    member = await registerUser('ta-member');
    outsider = await registerUser('ta-outsider');
    freeUser = await registerUser('ta-free');

    // admin, member and outsider are all Pro so they pass requireFeature
    // and reach the role check. freeUser has no subscription, so the
    // feature gate returns 402 before the role check ever runs.
    await pool.query("INSERT INTO subscriptions (user_id, plan_code, status) VALUES ($1, 'pro_monthly', 'active'), ($2, 'pro_monthly', 'active'), ($3, 'pro_monthly', 'active')", [admin.id, member.id, outsider.id]);

    const ws = await request(app).post('/api/workspaces').set(auth(admin)).send({ name: 'Team A' });
    workspaceId = ws.body.id;
    boardId = ws.body.board_id;

    await request(app).post(`/api/workspaces/${workspaceId}/members`).set(auth(admin)).send({ email: member.email, role: 'member' });
    await request(app).post(`/api/workspaces/${workspaceId}/respond`).set(auth(member)).send({ status: 'accepted' });

    // 3 tasks: 2 done, 1 todo, one of them assigned to member.
    const t1 = await request(app).post('/api/tasks').set(auth(admin)).send({ title: 'Done 1', board_id: boardId });
    const t2 = await request(app).post('/api/tasks').set(auth(admin)).send({ title: 'Done 2', board_id: boardId });
    const t3 = await request(app).post('/api/tasks').set(auth(admin)).send({ title: 'Todo', board_id: boardId });

    await request(app).patch(`/api/tasks/${t1.body.id}/status`).set(auth(admin)).send({ status: 'done' });
    await request(app).patch(`/api/tasks/${t2.body.id}/status`).set(auth(admin)).send({ status: 'done' });
    await request(app).patch(`/api/tasks/${t3.body.id}/assignee`).set(auth(admin)).send({ assignee_id: member.id });
  }, 180_000);

  afterAll(async () => {
    await destroyUser(admin);
    await destroyUser(member);
    await destroyUser(outsider);
    await destroyUser(freeUser);
  }, 60_000);

  it('returns 404 to a Pro user who is not a workspace member', async () => {
    const res = await request(app)
      .get(`/api/analytics/team/${workspaceId}`)
      .set(auth(outsider));
    expect(res.status).toBe(404);
  });

  it('returns 402 to a Free user, even if they are a member (gate runs before the role check)', async () => {
    const res = await request(app)
      .get(`/api/analytics/team/${workspaceId}`)
      .set(auth(freeUser));
    expect(res.status).toBe(402);
    expect(res.body.feature).toBe('analytics.team');
  });

  it('admin sees the overview, leaderboard and burndown', async () => {
    const res = await request(app)
      .get(`/api/analytics/team/${workspaceId}`)
      .set(auth(admin));
    expect(res.status).toBe(200);
    expect(res.body.workspace.role).toBe('admin');
    expect(res.body.overview.tasks.total).toBe(3);
    expect(res.body.overview.tasks.done).toBe(2);
    expect(res.body.overview.completionRate).toBe(67);
    expect(Array.isArray(res.body.burndown)).toBe(true);
    expect(res.body.burndown.length).toBe(7);   // week range
    expect(res.body.byMember.length).toBe(2);    // admin + member
    const m = res.body.byMember.find((row: { email: string }) => row.email === member.email);
    expect(m).toBeDefined();
    expect(m.role).toBe('member');
  });

  it('a member can read team analytics too', async () => {
    const res = await request(app)
      .get(`/api/analytics/team/${workspaceId}`)
      .set(auth(member));
    expect(res.status).toBe(200);
    expect(res.body.workspace.role).toBe('member');
  });

  it('soft-deleted tasks do not count', async () => {
    const task = await request(app).post('/api/tasks').set(auth(admin)).send({ title: 'Gone', board_id: boardId });
    await request(app).delete(`/api/tasks/${task.body.id}`).set(auth(admin));
    const res = await request(app).get(`/api/analytics/team/${workspaceId}`).set(auth(admin));
    expect(res.body.overview.tasks.total).toBe(3);
  });
});
