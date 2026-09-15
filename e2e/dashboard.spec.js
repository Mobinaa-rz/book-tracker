/**
 * Dashboard journeys: the summary stat cards, the "Recently added" list and the
 * links that connect the dashboard to filtered views of the library.
 */
import { authedTest as test, expect } from './fixtures.js';
import { pageTitle, waitForAppReady } from './helpers.js';

const LIBRARY = [
  { title: 'Dune', author: 'Frank Herbert', status: 'reading', rating: 5 },
  { title: 'Piranesi', author: 'Susanna Clarke', status: 'finished', rating: 4 },
  { title: 'The Dispossessed', author: 'Ursula K. Le Guin', status: 'want_to_read', rating: null },
  { title: 'The Tombs of Atuan', author: 'Ursula K. Le Guin', status: 'want_to_read', rating: null },
];

/** Locator for one of the four stat cards. */
const statCard = (page, label, value) =>
  page.getByRole('link', { name: `${label}: ${value}. View these books` });

test.describe('dashboard summary', () => {
  test.beforeEach(async ({ seed }) => {
    await seed(LIBRARY);
  });

  test('counts the library by status', async ({ page, account }) => {
    await page.goto('/');
    await waitForAppReady(page);

    await expect(page.getByRole('heading', { name: `Welcome back, ${account.username}` })).toBeVisible();
    await expect(page.getByText("Here's an overview of your library.")).toBeVisible();

    await expect(statCard(page, 'Total books', 4)).toBeVisible();
    await expect(statCard(page, 'Want to Read', 2)).toBeVisible();
    await expect(statCard(page, 'Reading', 1)).toBeVisible();
    await expect(statCard(page, 'Finished', 1)).toBeVisible();
  });

  test('stat cards link to the matching filtered view', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    await statCard(page, 'Finished', 1).click();

    await expect(page).toHaveURL(/\/books\?status=finished$/);
    await expect(page.getByRole('heading', { name: 'My Books' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Piranesi by Susanna Clarke' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Dune by Frank Herbert' })).toHaveCount(0);
  });

  test('the total-books card links to the unfiltered library', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    await statCard(page, 'Total books', 4).click();

    await expect(page).toHaveURL(/\/books$/);
    for (const book of LIBRARY) {
      await expect(page.getByRole('link', { name: `${book.title} by ${book.author}` })).toBeVisible();
    }
  });
});

test.describe('recently added', () => {
  test('lists the newest books first and links to their details', async ({ page, seed }) => {
    const books = await seed(LIBRARY);

    await page.goto('/');
    await waitForAppReady(page);

    await expect(page.getByRole('heading', { name: 'Recently added' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View all' })).toBeVisible();

    // Books are ordered by created_at DESC with an id DESC tie-break, so the
    // most recently seeded book is the first row.
    const newest = books[books.length - 1];
    const firstRow = page.locator('.book-row').first();
    await expect(firstRow).toContainText(newest.title);
    await expect(firstRow).toContainText(newest.author);

    await expect(page.locator('.book-row')).toHaveCount(LIBRARY.length);

    await firstRow.click();
    await expect(page).toHaveURL(new RegExp(`/books/${newest.id}$`));
    await expect(pageTitle(page, newest.title)).toBeVisible();
  });

  test('"View all" leads to My Books', async ({ page, seed }) => {
    await seed(LIBRARY);

    await page.goto('/');
    await waitForAppReady(page);

    await page.getByRole('link', { name: 'View all' }).click();

    await expect(page).toHaveURL(/\/books$/);
    await expect(page.getByText('4 books in your library')).toBeVisible();
  });

  test('offers a first book when the library is empty', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    await expect(page.getByRole('heading', { name: 'Start your library' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View all' })).toHaveCount(0);
    await expect(page.locator('.book-row')).toHaveCount(0);

    await page.getByRole('link', { name: 'Add your first book' }).click();
    await expect(page).toHaveURL(/\/books\/new$/);
  });

  test('caps the recent list at five books', async ({ page, seed }) => {
    await seed(
      Array.from({ length: 7 }, (_, index) => ({
        title: `Volume ${index + 1}`,
        author: 'Prolific Author',
        status: 'reading',
        rating: null,
        notes: '',
      })),
    );

    await page.goto('/');
    await waitForAppReady(page);

    await expect(statCard(page, 'Total books', 7)).toBeVisible();
    await expect(page.locator('.book-row')).toHaveCount(5);
  });
});
