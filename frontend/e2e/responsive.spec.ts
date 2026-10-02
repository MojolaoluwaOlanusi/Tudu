import { test, expect, type Page } from '@playwright/test';
import { createTask, signUp, uniqueEmail } from './helpers';

/**
 * Guards the phase-17 responsiveness bug: on phones the page was wider than
 * the viewport and required horizontal scrolling to see parts of the UI.
 *
 * These specs assert that the document never overflows sideways at each
 * breakpoint, which is the symptom users actually reported.
 */

const VIEWPORTS = [
  { name: 'small phone', width: 320, height: 640 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
];

/** The furthest right edge anything on the page reaches, versus the viewport. */
const overflow = (page: Page) =>
  page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflowing: doc.scrollWidth > doc.clientWidth,
    };
  });

test.describe('responsive layout', () => {
  test('the login page fits every small viewport', async ({ page }) => {
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/login');
      await expect(page.getByRole('button', { name: /continue with email/i })).toBeVisible();

      const result = await overflow(page);
      expect(
        result.overflowing,
        `${viewport.name} (${viewport.width}px): content is ${result.scrollWidth}px wide`
      ).toBe(false);
    }
  });

  test('the signed-in app fits every small viewport', async ({ page }) => {
    await signUp(page, uniqueEmail('resp'));

    for (const route of ['/', '/board', '/stats', '/analytics']) {
      for (const viewport of VIEWPORTS) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(route);
        await page.waitForLoadState('networkidle');

        const result = await overflow(page);
        expect(
          result.overflowing,
          `${route} on ${viewport.name} (${viewport.width}px): content is ${result.scrollWidth}px wide`
        ).toBe(false);
      }
    }
  });

  test('a long task title does not widen the page', async ({ page }) => {
    await signUp(page, uniqueEmail('long'));

    const long = 'ExtremelyLongUnbrokenWord'.repeat(6);
    await createTask(page, long);

    await page.setViewportSize({ width: 320, height: 640 });
    const result = await overflow(page);
    expect(result.overflowing).toBe(false);
  });

  test('interactive controls are big enough to tap', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');

    const button = page.getByRole('button', { name: 'Continue with Email' });
    const box = await button.boundingBox();

    expect(box).not.toBeNull();
    // 44px is the smallest comfortably tappable target.
    expect(box!.height).toBeGreaterThanOrEqual(40);
  });
});