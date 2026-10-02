import request from 'supertest';
import app from '../../src/app';
import pool from '../../src/config/database';

/**
 * Integration tests run against the real configured database.
 *
 * Every test creates its own throwaway user with a random email and deletes
 * that user afterwards; because users cascade-delete their tasks, sessions and
 * activity rows, no fixture data survives a run.
 */

export const uniqueEmail = (label: string): string =>
  `itest-${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.test`;

export const PASSWORD = 'Passw0rd!23';

export interface TestUser {
  id: string;
  token: string;
  email: string;
}

/** Registers a fresh user and returns its id, token and email. */
export const registerUser = async (label = 'user'): Promise<TestUser> => {
  const email = uniqueEmail(label);
  const res = await request(app).post('/auth/register').send({ email, password: PASSWORD });
  if (res.status !== 201 && res.status !== 200) {
    throw new Error(`register failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  const body = res.body ?? {};
  return {
    id: body.user?.id ?? body.id,
    token: body.token,
    email,
  };
};

export const auth = (user: TestUser) => ({ Authorization: `Bearer ${user.token}` });

/**
 * Removes a user and everything that cascades from them.
 *
 * Note there is deliberately no pool cleanup helper here. Jest runs every
 * suite in the same process, so a suite calling pool.end() in afterAll would
 * poison every suite that ran afterwards. The lingering socket is handled by
 * `forceExit` in jest.config.js instead.
 */
export const destroyUser = async (user: { id: string }): Promise<void> => {
  if (!user?.id) return;
  await pool.query('DELETE FROM users WHERE id = $1', [user.id]);
};