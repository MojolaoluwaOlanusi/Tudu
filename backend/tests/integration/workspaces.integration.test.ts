import request from 'supertest';
import app from '../../src/app';
import pool from '../../src/config/database';
import { auth, destroyUser, registerUser, TestUser } from './helpers';

/** Phase 1.2 - workspaces, roles, and who may touch a team board's tasks. */
describe('workspaces and team boards', () => {
  let admin: TestUser;
  let member: TestUser;
  let outsider: TestUser;
  let workspaceId: string;
  let boardId: string;

  type Col = { id: string; stage: string };
  const columnsOf = async (user: TestUser, id: string) =>
    (await request(app).get(`/api/boards/${id}/columns`).set(auth(user))).body as Col[];

  beforeAll(async () => {
    admin = await registerUser('ws-admin');
    member = await registerUser('ws-member');
    outsider = await registerUser('ws-outsider');

    const created = await request(app).post('/api/workspaces').set(auth(admin)).send({ name: 'Team A' });
    expect(created.status).toBe(201);
    workspaceId = created.body.id;
    boardId = created.body.board_id;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM workspaces WHERE id = $1', [workspaceId]);
    await destroyUser(admin);
    await destroyUser(member);
    await destroyUser(outsider);
  });

  it('starts a workspace with a usable board and the creator as admin', async () => {
    const boards = await request(app).get('/api/boards').set(auth(admin));
    const team = boards.body.find((b: { id: string }) => b.id === boardId);
    expect(team.role).toBe('admin');
    expect(team.workspace_id).toBe(workspaceId);
    expect((await columnsOf(admin, boardId)).length).toBe(3);
  });

  it('keeps the board hidden until the invitation is accepted', async () => {
    const invite = await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set(auth(admin))
      .send({ email: member.email, role: 'member' });
    expect(invite.status).toBe(201);

    const before = await request(app).get('/api/boards').set(auth(member));
    expect(before.body.some((b: { id: string }) => b.id === boardId)).toBe(false);
    expect((await request(app).get(`/api/boards/${boardId}`).set(auth(member))).status).toBe(404);

    const pending = await request(app).get('/api/workspaces/invites').set(auth(member));
    expect(pending.body[0].workspace_id).toBe(workspaceId);

    const accepted = await request(app)
      .post(`/api/workspaces/${workspaceId}/respond`)
      .set(auth(member))
      .send({ status: 'accepted' });
    expect(accepted.status).toBe(200);

    const after = await request(app).get('/api/boards').set(auth(member));
    expect(after.body.find((b: { id: string }) => b.id === boardId).role).toBe('member');
  });

  it('refuses a second invite and an unknown email', async () => {
    const dup = await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set(auth(admin))
      .send({ email: member.email });
    expect(dup.status).toBe(409);

    const unknown = await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set(auth(admin))
      .send({ email: 'nobody-here@example.invalid' });
    expect(unknown.status).toBe(404);
  });

  it('lets a member create, see, move and edit a teammate\'s task', async () => {
    const cols = await columnsOf(member, boardId);
    const todo = cols.find((c) => c.stage === 'todo')!;
    const doing = cols.find((c) => c.stage === 'doing')!;

    const made = await request(app)
      .post('/api/tasks')
      .set(auth(admin))
      .send({ title: 'Shared card', board_id: boardId });
    expect(made.status).toBe(201);
    expect(made.body.column_id).toBe(todo.id);

    const seen = await request(app).get('/api/tasks').query({ scope: 'all' }).set(auth(member));
    expect(seen.body.some((t: { id: string }) => t.id === made.body.id)).toBe(true);

    // The default List query still only returns my own tasks.
    const mine = await request(app).get('/api/tasks').set(auth(member));
    expect(mine.body.some((t: { id: string }) => t.id === made.body.id)).toBe(false);

    const moved = await request(app)
      .patch(`/api/tasks/${made.body.id}/status`)
      .set(auth(member))
      .send({ column_id: doing.id });
    expect(moved.status).toBe(200);
    expect(moved.body.status).toBe('doing');

    const edited = await request(app)
      .put(`/api/tasks/${made.body.id}`)
      .set(auth(member))
      .send({ title: 'Renamed by a member' });
    expect(edited.status).toBe(200);
  });

  it('assigns a task to a member, and not to an outsider', async () => {
    const made = await request(app)
      .post('/api/tasks')
      .set(auth(admin))
      .send({ title: 'Assign me', board_id: boardId });

    const ok = await request(app)
      .patch(`/api/tasks/${made.body.id}/assignee`)
      .set(auth(admin))
      .send({ assignee_id: member.id });
    expect(ok.status).toBe(200);
    expect(ok.body.assignee_id).toBe(member.id);

    const bad = await request(app)
      .patch(`/api/tasks/${made.body.id}/assignee`)
      .set(auth(admin))
      .send({ assignee_id: outsider.id });
    expect(bad.status).toBe(400);
  });

  it('keeps members out of admin-only actions', async () => {
    const cols = await columnsOf(member, boardId);
    const rename = await request(app).put(`/api/boards/${boardId}`).set(auth(member)).send({ name: 'Nope' });
    expect(rename.status).toBe(404);
    const del = await request(app).delete(`/api/columns/${cols[0].id}`).set(auth(member));
    expect(del.status).toBe(404);
    const invite = await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set(auth(member))
      .send({ email: outsider.email });
    expect(invite.status).toBe(404);
  });

  it('gives viewers read-only access', async () => {
    await request(app)
      .put(`/api/workspaces/${workspaceId}/members/${member.id}`)
      .set(auth(admin))
      .send({ role: 'viewer' });

    const made = await request(app)
      .post('/api/tasks')
      .set(auth(admin))
      .send({ title: 'Look but do not touch', board_id: boardId });

    const read = await request(app).get(`/api/tasks/${made.body.id}`).set(auth(member));
    expect(read.status).toBe(200);

    const write = await request(app)
      .put(`/api/tasks/${made.body.id}`)
      .set(auth(member))
      .send({ title: 'Changed' });
    expect(write.status).toBe(404);

    const create = await request(app)
      .post('/api/tasks')
      .set(auth(member))
      .send({ title: 'Viewer task', board_id: boardId });
    expect(create.status).toBe(404);

    await request(app)
      .put(`/api/workspaces/${workspaceId}/members/${member.id}`)
      .set(auth(admin))
      .send({ role: 'member' });
  });

  it('hides a team board and its tasks from people outside the workspace', async () => {
    expect((await request(app).get(`/api/boards/${boardId}`).set(auth(outsider))).status).toBe(404);
    const all = await request(app).get('/api/tasks').query({ scope: 'all' }).set(auth(outsider));
    expect(all.body.some((t: { board_id: string }) => t.board_id === boardId)).toBe(false);
  });

  it('never leaves a workspace without an admin', async () => {
    const demote = await request(app)
      .put(`/api/workspaces/${workspaceId}/members/${admin.id}`)
      .set(auth(admin))
      .send({ role: 'member' });
    expect(demote.status).toBe(409);

    const leave = await request(app)
      .delete(`/api/workspaces/${workspaceId}/members/${admin.id}`)
      .set(auth(admin));
    expect(leave.status).toBe(409);
  });

  it('ends access, and clears assignments, when a member leaves', async () => {
    const made = await request(app)
      .post('/api/tasks')
      .set(auth(admin))
      .send({ title: 'Leaver task', board_id: boardId });
    await request(app)
      .patch(`/api/tasks/${made.body.id}/assignee`)
      .set(auth(admin))
      .send({ assignee_id: member.id });

    const left = await request(app)
      .delete(`/api/workspaces/${workspaceId}/members/${member.id}`)
      .set(auth(member));
    expect(left.status).toBe(200);

    expect((await request(app).get(`/api/boards/${boardId}`).set(auth(member))).status).toBe(404);
    const task = await request(app).get(`/api/tasks/${made.body.id}`).set(auth(admin));
    expect(task.body.assignee_id).toBeNull();
  });

  it('lets an invitee decline', async () => {
    await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set(auth(admin))
      .send({ email: outsider.email });
    const declined = await request(app)
      .post(`/api/workspaces/${workspaceId}/respond`)
      .set(auth(outsider))
      .send({ status: 'declined' });
    expect(declined.status).toBe(200);
    const left = await request(app).get('/api/workspaces/invites').set(auth(outsider));
    expect(left.body).toHaveLength(0);
  });
});
