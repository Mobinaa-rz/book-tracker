/**
 * Fixtures for the e2e specs.
 *
 * Two entry points, so intent is obvious in every spec:
 *
 *   `test`       - a plain browser with no session. Used by the auth specs,
 *                  which need to see the app as a logged-out visitor.
 *   `authedTest` - a browser context that is already signed in as a brand-new,
 *                  unique account. Used by the book/dashboard/ownership specs
 *                  so they can skip the login dance and start from a
 *                  known-empty library.
 *
 * Every test gets its own account. Because the API scopes every query by user
 * (see backend/src/models/books.js), that alone gives full data isolation -
 * no test can ever observe another test's books.
 */
import { test as base, expect, request as playwrightRequest } from '@playwright/test';
import { registerAccount, seedBooks, uniqueAccount } from './helpers.js';
import { FRONTEND_URL } from './paths.js';

/** API-level fixtures shared by both entry points. */
const withApi = base.extend({
  /**
   * An API client pointed at the app's own origin, so calls travel through the
   * same Vite `/api` proxy the browser uses - no CORS, no second base URL, and
   * the session cookie it receives is valid for the pages under test.
   */
  api: async ({}, use) => {
    const context = await playwrightRequest.newContext({ baseURL: FRONTEND_URL });
    await use(context);
    await context.dispose();
  },

  /** Credentials for a fresh, unique account (not registered until asked). */
  account: async ({}, use) => {
    await use(uniqueAccount());
  },
});

/**
 * Signed-in tests.
 *
 * `session` is an *auto* fixture: it runs for every test in this file set, so
 * the account is registered exactly once and every consumer (`context`, `seed`,
 * or a spec that only uses `api`) sees the same authenticated session. Without
 * this, fixtures that each registered the account would race and the second
 * registration would be rejected as a duplicate.
 */
export const authedTest = withApi.extend({
  /** Registers the account over the API and yields the resulting storage state. */
  session: [
    async ({ api, account }, use) => {
      await registerAccount(api, account);
      // Reuse the session cookie the API client just received.
      await use(await api.storageState());
    },
    { auto: true },
  ],

  /** Overrides the standard `context`, so the built-in `page` is signed in. */
  context: async ({ browser, session }, use) => {
    const context = await browser.newContext({ storageState: session });
    await use(context);
    await context.close();
  },

  /** `seed([{ title, author, ... }])` creates books owned by this test's account. */
  seed: async ({ api, session }, use) => {
    expect(session.cookies.length, 'the session should hold a cookie').toBeGreaterThan(0);
    await use((books) => seedBooks(api, books));
  },
});

/** Logged-out tests. */
export const test = withApi;

export { expect };
