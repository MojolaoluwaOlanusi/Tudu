import { test, expect } from '@playwright/test';
import { createTask, PASSWORD, signUp, uniqueEmail } from './helpers';

/**
 * The two flows that matter most: an account can be created and signed into,
 * and a task can be created then completed.
 */

test.describe('authentication', () => {
  test('a new user can sign up and reach their task list', async ({ page }) => {
    await signUp(page, uniqueEmail('signup'));
    await expect(page).toHaveURL(/\/$/);
  });

  test('signing in again with the same credentials works', async ({ page }) => {
    const email = uniqueEmail('relogin');
    await signUp(page, email);

    // Sign out, then sign back in.
    await page.getByRole('button', { name: /logout/i }).click();
    await expect(page.getByRole('button', { name: /continue with email/i })).toBeVisible();

    await page.getByRole('button', { name: 'Continue with Email' }).click();
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole('button', { name: /sign in|log in/i }).click();

    await expect(page.getByRole('heading', { name: /my tasks/i })).toBeVisible();
  });

  test('a wrong password is rejected without signing in', async ({ page }) => {
    const email = uniqueEmail('badpass');
    await signUp(page, email);
    await page.getByRole('button', { name: /logout/i }).click();

    await page.getByRole('button', { name: 'Continue with Email' }).click();
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill('definitely-wrong');
    await page.getByRole('button', { name: /sign in|log in/i }).click();

    await expect(page.getByText(/invalid|incorrect|wrong|failed/i)).toBeVisible();
  });
});

test.describe('task lifecycle', () => {
  test('a task can be created, completed and struck through', async ({ page }) => {
    await signUp(page, uniqueEmail('task'));

    const title = `E2E task ${Date.now()}`;
    const card = await createTask(page, title);

    // Complete it via the status dropdown.
    await card.getByLabel('Change task status').selectOption('done');

    await expect(card.getByRole('heading', { name: title, exact: true })).toHaveClass(
      /line-through/
    );
    // Assert the saved value, not just the optimistic one: the row is painted
    // done immediately, and only the saved state proves the update was accepted.
    await expect(card.getByLabel('Change task status')).toHaveValue('done');
  });

  test('completing a task shows the confetti burst', async ({ page }) => {
    await signUp(page, uniqueEmail('confetti'));

    const title = `Confetti ${Date.now()}`;
    const card = await createTask(page, title);

    await card.getByLabel('Change task status').selectOption('done');

    // Regression guard for the phase-17 context bug that silenced confetti.
    //
    // The card flips to done optimistically, but the burst deliberately waits
    // for the server to accept the change, so it lands a round trip later -
    // and the pieces only live for 2.2s once they appear. Polling starts here,
    // before the burst, so a generous timeout is safe: a slow response delays
    // the pieces rather than making this assertion miss them.
    await expect(page.locator('.confetti-piece').first()).toBeVisible({
      timeout: 20_000,
    });
  });
});