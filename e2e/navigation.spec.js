/**
 * Navigation and the app shell: the navbar, client-side routing between pages,
 * and the 404 page as a logged-in visitor sees it.
 */
import { authedTest as test, expect } from './fixtures.js';
import { backLink, waitForAppReady } from './helpers.js';

test.describe('navbar', () => {
  test('shows the signed-in user and the four main links', async ({ page, account }) => {
    await page.goto('/');
    await waitForAppReady(page);

    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'My Books' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Calendar' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Add Book' })).toBeVisible();
    await expect(page.getByText(account.username).first()).toBeVisible();
  });

  test('routes between the main pages without a full reload', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    const nav = page.getByRole('navigation', { name: 'Main' });

    await nav.getByRole('link', { name: 'My Books' }).click();
    await expect(page).toHaveURL(/\/books$/);
    await expect(page.getByRole('heading', { name: 'My Books' })).toBeVisible();

    await nav.getByRole('link', { name: 'Calendar' }).click();
    await expect(page).toHaveURL(/\/calendar$/);
    await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();

    await nav.getByRole('link', { name: 'Add Book' }).click();
    await expect(page).toHaveURL(/\/books\/new$/);
    await expect(page.getByRole('heading', { name: 'Add a book' })).toBeVisible();

    await nav.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText("Here's an overview of your library.")).toBeVisible();
  });

  test('the current page is marked as active in the navigation', async ({ page }) => {
    await page.goto('/books');
    await waitForAppReady(page);

    // NavLink adds an "active" class to the link for the current route.
    await expect(page.getByRole('navigation', { name: 'Main' }).getByText('My Books')).toHaveClass(
      /active/,
    );
  });

  test('the brand links back to the dashboard', async ({ page }) => {
    await page.goto('/books/new');
    await waitForAppReady(page);

    await page.getByRole('link', { name: 'Book Tracker home' }).click();

    await expect(page).toHaveURL(/\/$/);
  });

  test('the log out control is reachable from every page', async ({ page }) => {
    await page.goto('/books');
    await waitForAppReady(page);

    await page.getByRole('button', { name: 'Log out' }).click();

    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('routing', () => {
  test('an unknown URL shows the 404 page with a way back to the dashboard', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');

    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    await expect(page.getByText("The page you're looking for doesn't exist.")).toBeVisible();

    await page.getByRole('link', { name: 'Go to Dashboard' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('a deep unknown URL under /books also 404s', async ({ page }) => {
    await page.goto('/books/1/notes/preview');

    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  });

  test('back links return to the previous list', async ({ page }) => {
    await page.goto('/books/new');
    await waitForAppReady(page);

    await backLink(page, 'My Books').click();

    await expect(page).toHaveURL(/\/books$/);
    await expect(page.getByRole('heading', { name: 'My Books' })).toBeVisible();
  });
});
