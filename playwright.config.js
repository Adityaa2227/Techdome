// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the Techdome QA assignment (target: https://techdome.io).
 * @see https://playwright.dev/docs/test-configuration
 *
 * HARD CONSTRAINT: load tests must never exceed 5 concurrent users.
 * The `load` project runs with a single worker; the load spec itself
 * opens exactly 5 browser contexts (= 5 users).
 */

const MOBILE_SPECS = '**/e2e/**/*.mobile.spec.js';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Live third-party site: one retry absorbs network blips; flaky passes are flagged in the report.
  retries: process.env.CI ? 2 : 1,
  // Hard ceiling on worker processes across all projects, kept well below the 5-user limit.
  // 2, not more: techdome.io showed 20 s TTFB spikes and dropped connections under light
  // parallel traffic during exploration, so a gentle suite is both polite and less flaky.
  workers: process.env.CI ? 1 : 2,
  // Generous budgets for a live site with slow spikes (see docs/site-exploration.md §10).
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: 'https://techdome.io',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
  },

  projects: [
    // Run order: 'run-order' (no-op) → all functional suites → 'load' as its teardown.
    // Guarantees the 5 load users never overlap other test traffic in a full run.
    // Single-suite npm scripts pass --no-deps so they don't trigger the load test.
    {
      name: 'run-order',
      testMatch: '**/run-order.setup.js',
      teardown: 'load',
    },
    {
      name: 'e2e',
      dependencies: ['run-order'],
      testMatch: '**/e2e/**/*.spec.js',
      testIgnore: MOBILE_SPECS,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-375',
      testMatch: MOBILE_SPECS,
      dependencies: ['run-order'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'tablet-768',
      testMatch: MOBILE_SPECS,
      dependencies: ['run-order'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'integration',
      testMatch: '**/integration/**/*.spec.js',
      dependencies: ['run-order'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'security',
      testMatch: '**/security/**/*.spec.js',
      dependencies: ['run-order'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'load',
      testMatch: '**/load/**/*.spec.js',
      // Teardown of 'run-order' → runs LAST. One worker; the spec itself opens exactly 5 users.
      workers: 1,
      fullyParallel: false,
      retries: 0, // a retry would re-hit the site and skew results
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
