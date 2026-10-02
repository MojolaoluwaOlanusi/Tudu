import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests for the critical user flows.
 *
 * The frontend dev server is started automatically; the backend is expected to
 * already be running on :5000 (`reuseExistingServer` means a dev server you
 * started yourself is reused rather than fighting over the port).
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
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});