import { test, expect, type Page } from '@playwright/test';

/**
 * The two flows that matter most: an account can be created and signed into,
 * and a task can be created then completed.
 */

const uniqueEmail = (label: string) =>
  `e2e-${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.test`;

const PASSWORD = 'Passw0rd!23';

/** Registers through the UI and lands on the task list. */
async function signUp(page: Page, email: string) {
  await page.goto('/login');

  await page.getByRole('button', { name: 'Continue with Email' }).click();
  await page.getByRole('button', { name: /sign up|create account/i }).click();

  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /sign up|create account/i }).click();

  await expect(page.getByRole('heading', { name: /my tasks/i })).toBeVisible();
}

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

    await page.getByRole('button', { name: /new task/i }).click();
    await page.getByLabel(/title/i).fill(title);
    await page.getByRole('button', { name: /save|create/i }).click();

    const card = page.getByText(title);
    await expect(card).toBeVisible();

    // Complete it via the status dropdown.
    const statusSelect = card.locator('xpath=ancestor::div[contains(@class,"card")]').getByLabel('Change task status');
    await statusSelect.selectOption('done');

    await expect(card).toHaveClass(/line-through/);
  });

  test('completing a task shows the confetti burst', async ({ page }) => {
    await signUp(page, uniqueEmail('confetti'));

    const title = `Confetti ${Date.now()}`;
    await page.getByRole('button', { name: /new task/i }).click();
    await page.getByLabel(/title/i).fill(title);
    await page.getByRole('button', { name: /save|create/i }).click();

    const card = page.getByText(title);
    await card.locator('xpath=ancestor::div[contains(@class,"card")]').getByLabel('Change task status').selectOption('done');

    // Regression guard for the phase-17 context bug that silenced confetti.
    await expect(page.locator('.confetti-piece').first()).toBeVisible();
  });
});