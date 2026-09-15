/**
 * Authentication and route-guard journeys, driven through the real UI.
 *
 * These specs use the logged-out `test` fixture on purpose: the whole point is
 * to see the app the way a visitor without a session sees it. Where a test
 * needs an existing account to sign into, it creates one over the API first so
 * the browser work stays focused on the behaviour under test.
 */
import { test, expect } from './fixtures.js';
import {
  expectToast,
  fields,
  loginThroughUi,
  registerAccount,
  registerThroughUi,
  waitForAppReady,
} from './helpers.js';

test.describe('registration', () => {
  test('creates an account and lands on the dashboard', async ({ page, account }) => {
    await registerThroughUi(page, account);

    await expect(page).toHaveURL(/\/$/);
    await waitForAppReady(page);

    await expect(page.getByRole('heading', { name: `Welcome back, ${account.username}` })).toBeVisible();
    await expectToast(page, `Welcome, ${account.username}!`);

    // The navbar replaces the auth layout once the session exists.
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await expect(page.getByText(account.username).first()).toBeVisible();
  });

  test('blocks an invalid form with client-side errors', async ({ page }) => {
    await page.goto('/register');

    await fields.username(page).fill('ab'); // too short
    await fields.email(page).fill('not-an-email');
    await fields.password(page).fill('short'); // fewer than 8 characters
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('Username must be at least 3 characters')).toBeVisible();
    await expect(page.getByText('Enter a valid email address')).toBeVisible();
    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();

    // Still on the register page - nothing was submitted.
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
  });

  test('rejects a username with invalid characters', async ({ page }) => {
    await page.goto('/register');

    await fields.username(page).fill('has spaces!');
    await fields.email(page).fill('spaces@example.com');
    await fields.password(page).fill('Corr3ct-Horse-Battery');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('Only letters, numbers and underscores')).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
  });

  test('surfaces the server error when the email is already registered', async ({ page, api, account }) => {
    // The account already exists, so the server (not the client) must reject it.
    await registerAccount(api, account);

    await registerThroughUi(page, account);

    await expect(page.getByText('This email is already registered')).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
    // The rejected form must not log anybody in.
    await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
  });
});

test.describe('login', () => {
  test('signs in with valid credentials', async ({ page, api, account }) => {
    await registerAccount(api, account);

    await loginThroughUi(page, account);

    await expect(page).toHaveURL(/\/$/);
    await waitForAppReady(page);
    await expect(page.getByRole('heading', { name: `Welcome back, ${account.username}` })).toBeVisible();
  });

  test('rejects a wrong password without revealing which field was wrong', async ({ page, api, account }) => {
    await registerAccount(api, account);

    await loginThroughUi(page, { ...account, password: 'Definitely-Wrong-Pass' });

    // The API deliberately returns one message for a bad email *or* password.
    await expect(page.getByRole('alert').filter({ hasText: 'Invalid email or password' })).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
  });

  test('rejects an unknown email with the same generic message', async ({ page }) => {
    await loginThroughUi(page, { email: 'nobody@example.com', password: 'Corr3ct-Horse-Battery' });

    await expect(page.getByRole('alert').filter({ hasText: 'Invalid email or password' })).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('blocks an empty form with client-side errors', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('session lifecycle', () => {
  test('logs out and returns to the login page', async ({ page, api, account }) => {
    await registerAccount(api, account);
    await loginThroughUi(page, account);
    await expect(page.getByRole('heading', { name: `Welcome back, ${account.username}` })).toBeVisible();

    await page.getByRole('button', { name: 'Log out' }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('survives a full page reload (the session lives in an httpOnly cookie)', async ({ page, api, account }) => {
    await registerAccount(api, account);
    await loginThroughUi(page, account);
    await expect(page.getByRole('heading', { name: `Welcome back, ${account.username}` })).toBeVisible();

    await page.reload();

    await waitForAppReady(page);
    await expect(page.getByRole('heading', { name: `Welcome back, ${account.username}` })).toBeVisible();
  });

  test('once logged out, a protected page redirects back to login', async ({ page, api, account }) => {
    await registerAccount(api, account);
    await loginThroughUi(page, account);

    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/books');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });
});

test.describe('route guards', () => {
  test('sends a guest to /login and returns them to the page they wanted', async ({ page, api, account }) => {
    await registerAccount(api, account);

    // Ask for a deep, filtered URL while logged out.
    await page.goto('/books?status=reading');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

    // After signing in we should land on the original destination, not just "/".
    await fields.email(page).fill(account.email);
    await fields.password(page).fill(account.password);
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page).toHaveURL(/\/books\?status=reading$/);
    await expect(page.getByRole('heading', { name: 'My Books' })).toBeVisible();
  });

  test('sends a guest to /login from the dashboard route', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('sends an already-signed-in visitor away from /login', async ({ page, api, account }) => {
    await registerAccount(api, account);
    await loginThroughUi(page, account);
    await expect(page.getByRole('heading', { name: `Welcome back, ${account.username}` })).toBeVisible();

    await page.goto('/login');

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: `Welcome back, ${account.username}` })).toBeVisible();
  });

  test('links between the login and register pages', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: 'Create an account' }).click();
    await expect(page).toHaveURL(/\/register$/);

    await page.getByRole('link', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('an unknown URL sends a guest to /login rather than the 404 page', async ({ page }) => {
    // The catch-all route lives inside ProtectedRoute, so a logged-out visitor
    // is bounced to the login page before the 404 page can ever render.
    // (The 404 page itself is covered in navigation.spec.js, when signed in.)
    await page.goto('/definitely-not-a-page');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Page not found' })).toHaveCount(0);
  });
});
