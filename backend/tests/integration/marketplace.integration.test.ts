import request from 'supertest';
import app from '../../src/app';
import pool from '../../src/config/database';
import { auth, destroyUser, registerUser, TestUser } from './helpers';

/** Feature 5.6 + 5.6b - publishing, installing and paying for templates. */
describe('marketplace', () => {
  let proUser: TestUser;
  let proUser2: TestUser;
  let freeUser: TestUser;
  let templateId: string;

  beforeAll(async () => {
    proUser = await registerUser('marketplace-pro');
    proUser2 = await registerUser('marketplace-pro-2');
    freeUser = await registerUser('marketplace-free');

    await pool.query(
      "INSERT INTO subscriptions (user_id, plan_code, status) VALUES ($1, 'pro_monthly', 'active'), ($2, 'pro_monthly', 'active')",
      [proUser.id, proUser2.id]
    );

    // Give proUser a publisher profile so paid publishing works.
    await pool.query(
      `INSERT INTO publisher_profiles
        (user_id, business_name, bank_code, bank_name, account_number, account_name, subaccount_code, payout_status)
       VALUES ($1, 'Test Publisher', '058', 'GTBank', '0123456789', 'TEST PUBLISHER', 'ACCT_test_123', 'active')`,
      [proUser.id]
    );

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

  it('rejects a paid publish with a price below ₦100', async () => {
    const boards = await request(app).get('/api/boards').set(auth(proUser));
    const boardId = boards.body[0].id;
    const res = await request(app)
      .post('/api/templates/publish')
      .set(auth(proUser))
      .send({
        board_id: boardId,
        name: 'Too cheap',
        price_kobo: 5000,
      });
    expect(res.status).toBe(400);
  });

  it('publishes a free template from a board snapshot', async () => {
    const boards = await request(app).get('/api/boards').set(auth(proUser));
    const boardId = boards.body[0].id;

    const res = await request(app)
      .post('/api/templates/publish')
      .set(auth(proUser))
      .send({
        board_id: boardId,
        name: 'My free template',
        description: 'A template from the integration test',
        category: 'Engineering',
        price_kobo: 0,
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('My free template');
    templateId = res.body.id;
  });

  it('lists the published template in the marketplace', async () => {
    const res = await request(app).get('/api/templates/marketplace');
    expect(res.status).toBe(200);
    const found = res.body.find((t: { id: string }) => t.id === templateId);
    expect(found).toBeDefined();
    expect(found.price_kobo).toBe(0);
  });

  it('lets any signed-in user install a free template', async () => {
    const res = await request(app)
      .post('/api/templates/marketplace/' + templateId + '/install')
      .set(auth(freeUser))
      .send({});
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('My free template');
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

  it('lets a non-author try to unpublish and gets 404', async () => {
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

  it('lets a downgraded Free user unpublish their own template (Option B)', async () => {
    const boards = await request(app).get('/api/boards').set(auth(proUser));
    const boardId = boards.body[0].id;

    const tpl = await request(app)
      .post('/api/templates/publish')
      .set(auth(proUser))
      .send({ board_id: boardId, name: 'Downgrade test', price_kobo: 0 });

    // Simulate a downgrade: cancel the subscription.
    await pool.query(
      "UPDATE subscriptions SET status = 'cancelled' WHERE user_id = $1",
      [proUser.id]
    );

    const del = await request(app)
      .delete('/api/templates/' + tpl.body.id)
      .set(auth(proUser));
    expect(del.status).toBe(200);

    // Restore Pro for any later tests in this file.
    await pool.query(
      "UPDATE subscriptions SET status = 'active' WHERE user_id = $1",
      [proUser.id]
    );
  });

  it('a paid template cannot be installed without a purchase', async () => {
    const boards = await request(app).get('/api/boards').set(auth(proUser));
    const boardId = boards.body[0].id;

    const tpl = await request(app)
      .post('/api/templates/publish')
      .set(auth(proUser))
      .send({
        board_id: boardId,
        name: 'Paid template',
        price_kobo: 200000,
      });
    expect(tpl.status).toBe(201);

    const install = await request(app)
      .post('/api/templates/marketplace/' + tpl.body.id + '/install')
      .set(auth(freeUser))
      .send({});
    expect(install.status).toBe(402);
    expect(install.body.price_kobo).toBe(200000);
  });

  it('the author can install their own paid template without paying', async () => {
    const boards = await request(app).get('/api/boards').set(auth(proUser));
    const boardId = boards.body[0].id;

    const tpl = await request(app)
      .post('/api/templates/publish')
      .set(auth(proUser))
      .send({
        board_id: boardId,
        name: 'Author paid template',
        price_kobo: 200000,
      });
    expect(tpl.status).toBe(201);

    const install = await request(app)
      .post('/api/templates/marketplace/' + tpl.body.id + '/install')
      .set(auth(proUser))
      .send({});
    expect(install.status).toBe(201);
  });
});
