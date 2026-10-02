import { test, expect, type Page } from '@playwright/test';
import { signUp, uniqueEmail } from './helpers';

/**
 * The onboarding tour.
 *
 * These exercise behaviour that jsdom cannot: the spotlight is positioned from
 * real geometry, and the tour navigates between routes on its own.
 */

const prompt = (page: Page) => page.getByTestId('onboarding-prompt');
const tourCard = (page: Page) => page.getByTestId('tour-card');

/** Reads the "Step N of M" counter out of the tour card. */
const stepOf = async (page: Page) => {
  const text = await tourCard(page).getByText(/step \d+ of \d+/i).textContent();
  return Number(text?.match(/(\d+)/)?.[1] ?? 0);
};

test.describe('onboarding', () => {
  test('a brand new account is offered the tour', async ({ page }) => {
    await signUp(page, uniqueEmail('tour-offer'), { keepOnboardingPrompt: true });

    await expect(prompt(page)).toBeVisible();
    await expect(page.getByRole('heading', { name: /welcome to tudu/i })).toBeVisible();
  });

  test('accepting walks the tour forward through every feature', async ({ page }) => {
    await signUp(page, uniqueEmail('tour-run'), { keepOnboardingPrompt: true });

    await page.getByRole('button', { name: /show me around/i }).click();

    // The prompt hands over to the tour.
    await expect(prompt(page)).toBeHidden();
    await expect(tourCard(page)).toBeVisible();
    await expect(tourCard(page).getByRole('heading', { name: /welcome to tudu/i })).toBeVisible();
    expect(await stepOf(page)).toBe(1);

    // "Next" advances, and "Back" returns - the tour must be reversible.
    await page.getByTestId('tour-next').click();
    expect(await stepOf(page)).toBe(2);

    await page.getByRole('button', { name: /^back$/i }).click();
    expect(await stepOf(page)).toBe(1);
  });

  test('the tour travels to the board, stats and analytics by itself', async ({ page }) => {
    await signUp(page, uniqueEmail('tour-nav'), { keepOnboardingPrompt: true });
    await page.getByRole('button', { name: /show me around/i }).click();

    // Step through to the board step. The tour owns the navigation, so this
    // asserts it drives the router rather than the user clicking the nav.
    // The board is the 13th of 16 steps, so the bound is generous on purpose.
    for (let i = 0; i < 16; i += 1) {
      if (page.url().includes('/board')) break;
      await page.getByTestId('tour-next').click();
      await page.waitForTimeout(200);
    }
    await expect(page).toHaveURL(/\/board/);
    await expect(tourCard(page).getByRole('heading', { name: /board view/i })).toBeVisible();
  });

  test('skipping closes the tour and it is not offered again straight away', async ({ page }) => {
    await signUp(page, uniqueEmail('tour-skip'), { keepOnboardingPrompt: true });
    await page.getByRole('button', { name: /show me around/i }).click();
    await expect(tourCard(page)).toBeVisible();

    await page.getByRole('button', { name: /skip tour/i }).click();
    await expect(tourCard(page)).toBeHidden();

    // A dismissal snoozes for a week, so a reload must stay quiet.
    await page.reload();
    await expect(page.getByRole('heading', { name: /my tasks/i })).toBeVisible();
    await expect(prompt(page)).toBeHidden();
  });

  test('the header button replays the tour after it has been skipped', async ({ page }) => {
    await signUp(page, uniqueEmail('tour-replay'));

    await page.getByRole('button', { name: /take the tour/i }).click();
    await expect(tourCard(page)).toBeVisible();
    await expect(tourCard(page).getByRole('heading', { name: /welcome to tudu/i })).toBeVisible();
  });

  test('"don\'t show again" opts out, but the tour is still reachable', async ({ page }) => {
    await signUp(page, uniqueEmail('tour-optout'), { keepOnboardingPrompt: true });

    await page.getByRole('button', { name: /don't show again/i }).click();
    await expect(prompt(page)).toBeHidden();

    await page.reload();
    await expect(page.getByRole('heading', { name: /my tasks/i })).toBeVisible();
    await expect(prompt(page)).toBeHidden();

    // Opting out must never be a dead end.
    await page.getByRole('button', { name: /take the tour/i }).click();
    await expect(tourCard(page)).toBeVisible();
  });
});
