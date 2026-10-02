import { expect, type Page } from '@playwright/test';

/** Shared fixtures and locators for the end-to-end specs. */

export const PASSWORD = 'Passw0rd!23';

export const uniqueEmail = (label: string) =>
  `e2e-${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.test`;

/**
 * The card belonging to a task, identified by its heading.
 *
 * Scoping is deliberate. A bare getByText(title) also matches the title still
 * sitting in the open "New task" form and the <option> in the activity filter,
 * so it resolves to three elements and trips Playwright's strict mode.
 */
export const taskCard = (page: Page, title: string) =>
  page.locator('div.card').filter({
    has: page.getByRole('heading', { name: title, exact: true }),
  });

/** Registers through the UI and lands on the task list. */
export async function signUp(
  page: Page,
  email: string,
  opts: { keepOnboardingPrompt?: boolean } = {}
) {
  await page.goto('/login');

  await page.getByRole('button', { name: 'Continue with Email' }).click();
  await page.getByRole('button', { name: /sign up|create account/i }).click();

  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /sign up|create account/i }).click();

  // Signing up registers the account, stores the token and then loads the task
  // list, so this needs more room than a plain assertion.
  await expect(page.getByRole('heading', { name: /my tasks/i })).toBeVisible({
    timeout: 30_000,
  });

  // Every brand new account is offered the onboarding tour. Specs that are not
  // about onboarding must clear it, or its modal sits over the page and swallows
  // the clicks they are trying to make. Pass `keepOnboardingPrompt` to assert
  // on it instead.
  if (!opts.keepOnboardingPrompt) {
    const prompt = page.getByTestId('onboarding-prompt');
    if (await prompt.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: /maybe later/i }).click();
      await expect(prompt).toBeHidden();
    }
  }
}

/** Creates a task through the form and waits for its card to render. */
export async function createTask(page: Page, title: string) {
  // Wait for the create to actually persist. The card appears immediately on an
  // optimistic placeholder whose id is not yet real, so acting on it (marking
  // it done) would send that placeholder to the API and come back 500.
  const persisted = page.waitForResponse(
    (response) => {
      const path = new URL(response.url()).pathname;
      return path === '/api/tasks' && response.request().method() === 'POST';
    },
    { timeout: 30_000 }
  );

  await page.getByRole('button', { name: /new task/i }).click();
  await page.getByLabel(/title/i).fill(title);
  await page.getByRole('button', { name: /save|create/i }).click();

  await persisted;

  const card = taskCard(page, title);
  await expect(card).toBeVisible();
  return card;
}
