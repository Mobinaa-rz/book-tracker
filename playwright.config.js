/**
 * Playwright configuration for the Book Tracker end-to-end suite.
 *
 * The suite runs against the real stack: a genuine Express + SQLite backend and
 * the real Vite dev server, with a real browser driving the UI. Nothing is
 * mocked - the browser talks to `/api` on its own origin exactly as it does in
 * development, and Vite proxies those calls to the backend.
 *
 * Both servers are started automatically by `webServer` below, so a whole run is
 * a single command: `npm run test:e2e`.
 */
import { defineConfig, devices } from '@playwright/test';
import { resolveChromium } from './e2e/browser-source.js';
import { BACKEND_URL, FRONTEND_URL, backendEnv, frontendEnv } from './e2e/paths.js';

// Which browser we drive. Usually Playwright's own; see e2e/browser-source.js
// for the fallback used on networks where Playwright's CDN is unreachable.
const chromium = resolveChromium();
console.log(`[playwright] chromium source: ${chromium.source}`);

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.js',

  // Specs are independent (each gets its own account), so run them in parallel.
  fullyParallel: true,

  // Fail the run if a test accidentally left `.only` behind in CI.
  forbidOnly: Boolean(process.env.CI),

  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,

  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],

  outputDir: 'test-results',

  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: FRONTEND_URL,
    actionTimeout: 10_000,
    navigationTimeout: 20_000,

    // Collect evidence only when something goes wrong.
    // Note: no `video` here - recording needs the ffmpeg binary, which is a
    // separate Playwright download. Traces are strictly more useful for
    // debugging (DOM snapshots, network, console) and need nothing extra.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          // `undefined` means "use Playwright's own browser" - the normal case.
          executablePath: chromium.executablePath,
          args: chromium.args,
          env: chromium.env,
        },
      },
    },
  ],

  /**
   * Start the backend first, then the frontend. Playwright waits for each `url`
   * to answer before running a single test.
   *
   * `reuseExistingServer` means a developer who already has `npm run dev` going
   * will not get a port clash - Playwright just uses what is already running.
   */
  webServer: [
    {
      command: 'node src/server.js',
      cwd: './backend',
      url: `${BACKEND_URL}/api/health`,
      env: backendEnv,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npm run dev',
      cwd: './frontend',
      url: FRONTEND_URL,
      env: frontendEnv,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
