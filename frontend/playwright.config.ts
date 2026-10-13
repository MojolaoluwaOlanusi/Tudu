import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests for the critical user flows.
 *
 * Playwright starts both dev servers: the frontend on :5173 and the backend
 * on :5000. `reuseExistingServer: true` means a server you started yourself
 * is reused rather than fought over, so this works the same whether you run
 * `npm run dev` in another terminal or let Playwright do it for you.
 */
export default defineConfig({
  testDir: './e2e',
  // Generous: each test drives a full sign-up plus a task mutation, and a cold
  // dev server on a slow machine can spend most of 30s just on the first load.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  // A stray console error should not fail a run, but it is printed.
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      // iPhone 12 profile, used by the responsive specs.
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      // Runs the backend from the sibling folder. Playwright waits until
      // /api/public/stats answers 200, so the server is fully ready before
      // any test starts — not merely bound to its port.
      command: 'npm --prefix ../backend run dev',
      url: 'http://localhost:5000/api/public/stats',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});