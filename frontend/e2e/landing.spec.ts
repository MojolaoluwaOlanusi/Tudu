import { test, expect } from '@playwright/test';

test.describe('landing page', () => {
  test('renders the hero and both CTAs for signed-out visitors', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /Kanban that\s+just works/i })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Try the demo/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Start free/i }).first()).toBeVisible();
  });

  test('shows Free, Pro and Enterprise pricing cards', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /^Free$/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Pro$/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Enterprise$/ })).toBeVisible();
  });

  test('"Try the demo" lands the visitor on a seeded board', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Try the demo/i }).first().click();
    await expect(page.getByText(/Try the AI breakdown/i)).toBeVisible({ timeout: 20_000 });
  });
});
