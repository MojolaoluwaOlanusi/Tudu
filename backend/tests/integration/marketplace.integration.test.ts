import request from 'supertest';
import app from '../../src/app';
import pool from '../../src/config/database';
import { auth, destroyUser, registerUser, TestUser } from './helpers';

/** Feature 5.6 - publishing and installing templates. */
describe('marketplace', () => {
  let proUser: TestUser;
  let proUser2: TestUser;
  let freeUser: TestUser;
  let templateId: string;

  beforeAll(async () => {
    proUser = await registerUser('marketplace-pro');
    proUser2 = await registerUser('marketplace-pro-2');
    freeUser = await registerUser('marketplace-free');

    // Both Pro users get an active subscription so requireFeature lets
    // publishing through. Same shape the Paystack webhook writes.
    await pool.query(
      "INSERT INTO subscriptions (user_id, plan_code, status) VALUES ($1, 'pro_monthly', 'active'), ($2, 'pro_monthly', 'active')",
      [proUser.id, proUser2.id]
    );

    // Ensure the author has a default board with three columns.
    await request(app).get('/api/boards').set(auth(proUser));
  }, 180_000);

  afterAll(async () => {
    await destroyUser(proUser);
    await destroyUser(proUser2);
    await destroyUser(freeUser);
  }, 60_000);

  it('refuses a free user publishing with 402', async () => {
    const res = await request(app)
      .post('/api/templates/publish')
      .set(auth(freeUser))
      .send({
        board_id: '00000000-0000-0000-0000-000000000000',
        name: 'Test',
      });
    expect(res.status).toBe(402);
    expect(res.body.feature).toBe('templates.publish');
  });

  it('publishes a template from a board snapshot', async () => {
    const boards = await request(app).get('/api/boards').set(auth(proUser));
    const boardId = boards.body[0].id;

    const res = await request(app)
      .post('/api/templates/publish')
      .set(auth(proUser))
      .send({
        board_id: boardId,
        name: 'My test template',
        description: 'A template from the integration test',
        category: 'Engineering',
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('My test template');
    templateId = res.body.id;
  });

  it('lists the published template in the marketplace', async () => {
    const res = await request(app).get('/api/templates/marketplace');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find((t: { id: string }) => t.id === templateId);
    expect(found).toBeDefined();
    expect(found.author_name).toBeDefined();
  });

  it('lets any signed-in user install the template', async () => {
    const res = await request(app)
      .post('/api/templates/marketplace/' + templateId + '/install')
      .set(auth(freeUser))
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('My test template');
    expect(res.body.column_count).toBeGreaterThanOrEqual(3);

    // Confirm the new board is on the free user.
    const boards = await request(app).get('/api/boards').set(auth(freeUser));
    const hasBoard = boards.body.some((b: { id: string }) => b.id === res.body.id);
    expect(hasBoard).toBe(true);
  });

  it('increments the install count', async () => {
    const res = await request(app).get('/api/templates/marketplace');
    const found = res.body.find((t: { id: string }) => t.id === templateId);
    expect(found.install_count).toBe(1);
  });

  it('lists the published template for the author', async () => {
    const res = await request(app).get('/api/templates/mine').set(auth(proUser));
    expect(res.status).toBe(200);
    expect(res.body.some((t: { id: string }) => t.id === templateId)).toBe(true);
  });

  it('refuses a free user trying to unpublish with 402', async () => {
    // A free user has no templates.publish feature at all, so the gate
    // fires before the ownership check. 402, not 404.
    const res = await request(app)
      .delete('/api/templates/' + templateId)
      .set(auth(freeUser));
    expect(res.status).toBe(402);
    expect(res.body.feature).toBe('templates.publish');
  });

  it('refuses a Pro non-author trying to unpublish with 404', async () => {
    // A second Pro user passes the feature gate but is not the author.
    // The ownership check inside unpublishTemplate fires - 404.
    const res = await request(app)
      .delete('/api/templates/' + templateId)
      .set(auth(proUser2));
    expect(res.status).toBe(404);
  });

  it('allows the author to unpublish and removes it from the marketplace', async () => {
    const res = await request(app)
      .delete('/api/templates/' + templateId)
      .set(auth(proUser));
    expect(res.status).toBe(200);

    const check = await request(app).get('/api/templates/marketplace');
    expect(check.body.some((t: { id: string }) => t.id === templateId)).toBe(false);
  });
});