/**
 * Per-user data isolation, checked through the real UI.
 *
 * The backend scopes every book query by user id (see
 * backend/src/models/books.js), so another account's books should not merely be
 * hidden - from this user's point of view they should not exist at all.
 */
import { request as playwrightRequest } from '@playwright/test';
import { authedTest as test, expect } from './fixtures.js';
import { fields, registerAccount, seedBooks, uniqueAccount, waitForAppReady } from './helpers.js';
import { FRONTEND_URL } from './paths.js';

/** Registers a second, unrelated account and gives it one book. */
async function createForeignBook() {
  const otherApi = await playwrightRequest.newContext({ baseURL: FRONTEND_URL });
  try {
    await registerAccount(otherApi, uniqueAccount());
    const [book] = await seedBooks(otherApi, [
      { title: 'Someone Elses Diary', author: 'A Different Person', status: 'reading', rating: 5 },
    ]);
    return book;
  } finally {
    await otherApi.dispose();
  }
}

test.describe('data isolation between accounts', () => {
  test("another user's book does not appear in my library", async ({ page }) => {
    const foreignBook = await createForeignBook();

    await page.goto('/books');
    await waitForAppReady(page);

    await expect(page.getByRole('heading', { name: 'Your library is empty' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: `${foreignBook.title} by ${foreignBook.author}` }),
    ).toHaveCount(0);
  });

  test("opening another user's book by URL shows the not-found page", async ({ page }) => {
    const foreignBook = await createForeignBook();

    await page.goto(`/books/${foreignBook.id}`);

    // Deliberately a 404 rather than 403, so the id is not confirmed to exist.
    await expect(page.getByRole('heading', { name: 'Book not found' })).toBeVisible();
    await expect(page.getByRole('heading', { name: "We couldn't find that book" })).toBeVisible();
    await expect(page.getByText(foreignBook.title)).toHaveCount(0);
  });

  test("editing another user's book shows the not-found page", async ({ page }) => {
    const foreignBook = await createForeignBook();

    await page.goto(`/books/${foreignBook.id}/edit`);

    await expect(page.getByRole('heading', { name: 'Book not found' })).toBeVisible();
    await expect(fields.title(page)).toHaveCount(0);
  });

  test("the API refuses to read, change or delete another user's book", async ({ api }) => {
    const foreignBook = await createForeignBook();

    const read = await api.get(`/api/books/${foreignBook.id}`);
    expect(read.status()).toBe(404);

    const update = await api.put(`/api/books/${foreignBook.id}`, {
      data: { title: 'Hijacked', author: 'Me', status: 'reading', rating: null, notes: '' },
    });
    expect(update.status()).toBe(404);

    const remove = await api.delete(`/api/books/${foreignBook.id}`);
    expect(remove.status()).toBe(404);
  });

  test('my dashboard stats only count my own books', async ({ page }) => {
    await createForeignBook();

    await page.goto('/');
    await waitForAppReady(page);

    await expect(page.getByRole('link', { name: 'Total books: 0. View these books' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Reading: 0. View these books' })).toBeVisible();
  });
});
