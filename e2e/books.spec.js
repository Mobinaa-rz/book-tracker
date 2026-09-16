/**
 * Book management journeys: create, read, update, delete, search and filter.
 *
 * Every test here runs as a freshly registered account with an empty library,
 * so it starts from a known state. Books are seeded over the API and then
 * asserted on in the browser.
 */
import { authedTest as test, expect } from './fixtures.js';
import {
  backLink,
  expectToast,
  fields,
  fillBookForm,
  openDeleteDialog,
  pageTitle,
  sampleBook,
  statusBadge,
  waitForAppReady,
} from './helpers.js';

/** One of each status, with titles/authors distinct enough to search reliably. */
const LIBRARY = [
  { title: 'Dune', author: 'Frank Herbert', status: 'reading', rating: 5 },
  { title: 'Piranesi', author: 'Susanna Clarke', status: 'finished', rating: 4 },
  { title: 'The Dispossessed', author: 'Ursula K. Le Guin', status: 'want_to_read', rating: null },
];

/** Locator for a book card in the My Books grid. */
const bookCard = (page, title, author) =>
  page.getByRole('link', { name: `${title} by ${author}` });

test.describe('empty library', () => {
  test('shows the empty state and a way to add the first book', async ({ page }) => {
    await page.goto('/books');
    await waitForAppReady(page);

    await expect(page.getByRole('heading', { name: 'My Books' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your library is empty' })).toBeVisible();
    await expect(page.getByText('Add the first book you want to keep track of.')).toBeVisible();
    await expect(bookCard(page, LIBRARY[0].title, LIBRARY[0].author)).toHaveCount(0);

    // The empty state's call to action leads to the add form.
    await page.getByRole('link', { name: 'Add your first book' }).click();
    await expect(page).toHaveURL(/\/books\/new$/);
    await expect(page.getByRole('heading', { name: 'Add a book' })).toBeVisible();
  });

  test('shows a zeroed dashboard for a brand-new account', async ({ page, account }) => {
    await page.goto('/');
    await waitForAppReady(page);

    await expect(page.getByRole('heading', { name: `Welcome back, ${account.username}` })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Total books: 0. View these books' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Start your library' })).toBeVisible();
  });
});

test.describe('adding a book', () => {
  test('adds a book and lands on its details page', async ({ page }) => {
    await page.goto('/books/new');

    await fillBookForm(page, {
      title: sampleBook.title,
      author: sampleBook.author,
      notes: sampleBook.notes,
    });
    await page.getByRole('button', { name: 'Add book' }).click();

    await expectToast(page, 'Book added');

    // AddBookPage navigates to the new book's details page.
    await expect(page).toHaveURL(/\/books\/\d+$/);
    await expect(pageTitle(page, sampleBook.title)).toBeVisible();
    await expect(page.getByText(`by ${sampleBook.author}`)).toBeVisible();
    await expect(page.getByText(sampleBook.notes)).toBeVisible();

    // The form's default status is "Want to Read" and no rating was picked.
    await expect(statusBadge(page, 'Want to Read')).toBeVisible();
    await expect(page.getByText('Not rated')).toBeVisible();

    // And the book is really in the library, not just on screen.
    await backLink(page, 'My Books').click();
    await expect(page).toHaveURL(/\/books$/);
    await expect(bookCard(page, sampleBook.title, sampleBook.author)).toBeVisible();
  });

  test('requires a title and an author', async ({ page }) => {
    await page.goto('/books/new');

    await page.getByRole('button', { name: 'Add book' }).click();

    await expect(page.getByText('Title is required')).toBeVisible();
    await expect(page.getByText('Author is required')).toBeVisible();
    await expect(page).toHaveURL(/\/books\/new$/);
  });

  test('requires an author even when a title is given', async ({ page }) => {
    await page.goto('/books/new');

    await fillBookForm(page, { title: 'A title on its own' });
    await page.getByRole('button', { name: 'Add book' }).click();

    await expect(page.getByText('Author is required')).toBeVisible();
    await expect(page).toHaveURL(/\/books\/new$/);
  });

  test('records the chosen status and rating', async ({ page }) => {
    await page.goto('/books/new');

    await fillBookForm(page, {
      title: 'The Tombs of Atuan',
      author: 'Ursula K. Le Guin',
      status: 'Finished',
      rating: 5,
    });

    // The chip and the star picker both reflect the selection before saving.
    await expect(
      page.getByRole('radiogroup', { name: 'Status' }).getByRole('radio', { name: 'Finished' }),
    ).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('slider', { name: 'Rating' })).toHaveAttribute('aria-valuenow', '5');

    await page.getByRole('button', { name: 'Add book' }).click();

    await expect(page).toHaveURL(/\/books\/\d+$/);
    await expect(statusBadge(page, 'Finished')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Rated 5 out of 5' })).toBeVisible();
  });

  test('cancelling returns to My Books without saving', async ({ page }) => {
    await page.goto('/books/new');

    await fillBookForm(page, { title: 'Never Saved', author: 'Nobody' });
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page).toHaveURL(/\/books$/);
    await expect(bookCard(page, 'Never Saved', 'Nobody')).toHaveCount(0);
  });
});

test.describe('listing and searching', () => {
  test.beforeEach(async ({ seed }) => {
    await seed(LIBRARY);
  });

  test('lists every book with its status badge', async ({ page }) => {
    await page.goto('/books');
    await waitForAppReady(page);

    await expect(page.getByText('3 books in your library')).toBeVisible();
    for (const book of LIBRARY) {
      await expect(bookCard(page, book.title, book.author)).toBeVisible();
    }

    await expect(page.getByRole('link', { name: 'Dune by Frank Herbert' })).toContainText('Reading');
    await expect(page.getByRole('link', { name: 'Piranesi by Susanna Clarke' })).toContainText('Finished');
    await expect(page.getByRole('link', { name: 'The Dispossessed by Ursula K. Le Guin' })).toContainText(
      'Want to Read',
    );
  });

  test('searches by title and syncs the query to the URL', async ({ page }) => {
    await page.goto('/books');
    await waitForAppReady(page);

    await fields.search(page).fill('Dune');

    await expect(page).toHaveURL(/search=Dune/);
    await expect(page.getByText('Showing 1 of 3 books')).toBeVisible();
    await expect(bookCard(page, 'Dune', 'Frank Herbert')).toBeVisible();
    await expect(bookCard(page, 'Piranesi', 'Susanna Clarke')).toHaveCount(0);
  });

  test('searches by author', async ({ page }) => {
    await page.goto('/books');
    await waitForAppReady(page);

    await fields.search(page).fill('Clarke');

    await expect(page.getByText('Showing 1 of 3 books')).toBeVisible();
    await expect(bookCard(page, 'Piranesi', 'Susanna Clarke')).toBeVisible();
    await expect(bookCard(page, 'Dune', 'Frank Herbert')).toHaveCount(0);
  });

  test('searching is case-insensitive', async ({ page }) => {
    await page.goto('/books');
    await waitForAppReady(page);

    await fields.search(page).fill('dUNE');

    await expect(page.getByText('Showing 1 of 3 books')).toBeVisible();
    await expect(bookCard(page, 'Dune', 'Frank Herbert')).toBeVisible();
  });

  test('clears the search with the clear button', async ({ page }) => {
    await page.goto('/books');
    await waitForAppReady(page);

    const search = fields.search(page);
    await search.fill('Dune');
    await expect(page.getByText('Showing 1 of 3 books')).toBeVisible();

    await page.getByRole('button', { name: 'Clear search' }).click();

    await expect(search).toHaveValue('');
    await expect(page).not.toHaveURL(/search=/);
    for (const book of LIBRARY) {
      await expect(bookCard(page, book.title, book.author)).toBeVisible();
    }
  });

  test('filters by status using the chips', async ({ page }) => {
    await page.goto('/books');
    await waitForAppReady(page);

    const filters = page.getByRole('radiogroup', { name: 'Filter by status' });
    await filters.getByRole('radio', { name: 'Finished' }).click();

    await expect(page).toHaveURL(/status=finished/);
    await expect(filters.getByRole('radio', { name: 'Finished' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(bookCard(page, 'Piranesi', 'Susanna Clarke')).toBeVisible();
    await expect(bookCard(page, 'Dune', 'Frank Herbert')).toHaveCount(0);

    // Switching back to "All" restores the full library.
    await filters.getByRole('radio', { name: 'All' }).click();
    await expect(page).not.toHaveURL(/status=/);
    for (const book of LIBRARY) {
      await expect(bookCard(page, book.title, book.author)).toBeVisible();
    }
  });

  test('combines a search with a status filter', async ({ page }) => {
    await page.goto('/books');
    await waitForAppReady(page);

    const search = fields.search(page);
    await search.fill('Le Guin');
    // Wait for the debounced search to reach the URL before filtering, so the
    // two updates cannot race each other.
    await expect(page).toHaveURL(/search=/);

    await page.getByRole('radiogroup', { name: 'Filter by status' }).getByRole('radio', { name: 'Reading' }).click();

    await expect(page).toHaveURL(/search=/);
    await expect(page).toHaveURL(/status=reading/);
    // The author matches, but that book is "Want to Read", not "Reading".
    await expect(page.getByRole('heading', { name: 'No books match' })).toBeVisible();
  });

  test('shows a no-results state and can clear the filters', async ({ page }) => {
    await page.goto('/books');
    await waitForAppReady(page);

    await fields.search(page).fill('zzzz-no-such-book');

    await expect(page.getByRole('heading', { name: 'No books match' })).toBeVisible();
    await expect(page.getByText(/Nothing in your library matches/)).toBeVisible();

    await page.getByRole('button', { name: 'Clear filters' }).click();

    await expect(page).not.toHaveURL(/search=/);
    for (const book of LIBRARY) {
      await expect(bookCard(page, book.title, book.author)).toBeVisible();
    }
  });

  test('keeps the filters in the URL across a reload', async ({ page }) => {
    await page.goto('/books?status=reading');
    await waitForAppReady(page);

    await expect(bookCard(page, 'Dune', 'Frank Herbert')).toBeVisible();
    await expect(bookCard(page, 'Piranesi', 'Susanna Clarke')).toHaveCount(0);

    await page.reload();
    await waitForAppReady(page);

    await expect(page).toHaveURL(/status=reading/);
    await expect(bookCard(page, 'Dune', 'Frank Herbert')).toBeVisible();
    await expect(bookCard(page, 'Piranesi', 'Susanna Clarke')).toHaveCount(0);
  });

  test('ignores a status value that is not a real status', async ({ page }) => {
    await page.goto('/books?status=not_a_status');
    await waitForAppReady(page);

    // An invalid filter falls back to showing everything.
    for (const book of LIBRARY) {
      await expect(bookCard(page, book.title, book.author)).toBeVisible();
    }
  });
});

test.describe('book details', () => {
  test('opens a book from the grid', async ({ page, seed }) => {
    const [book] = await seed([LIBRARY[1]]);

    await page.goto('/books');
    await waitForAppReady(page);
    await bookCard(page, book.title, book.author).click();

    await expect(page).toHaveURL(new RegExp(`/books/${book.id}$`));
    await expect(pageTitle(page, book.title)).toBeVisible();
    await expect(page.getByText(`by ${book.author}`)).toBeVisible();
    await expect(page.getByRole('img', { name: 'Rated 4 out of 5' })).toBeVisible();
  });

  test('shows a not-found state for an unknown book id', async ({ page }) => {
    await page.goto('/books/999999');

    await expect(page.getByRole('heading', { name: 'Book not found' })).toBeVisible();
    await expect(page.getByRole('heading', { name: "We couldn't find that book" })).toBeVisible();

    await page.getByRole('link', { name: 'Back to My Books' }).click();
    await expect(page).toHaveURL(/\/books$/);
  });

  test('notes are shown when present and offered when absent', async ({ page, seed }) => {
    const [withNotes, withoutNotes] = await seed([
      { title: 'Has Notes', author: 'Author One', notes: 'A genuinely useful note.' },
      { title: 'No Notes', author: 'Author Two', notes: '' },
    ]);

    await page.goto(`/books/${withNotes.id}`);
    await expect(page.getByText('A genuinely useful note.')).toBeVisible();

    await page.goto(`/books/${withoutNotes.id}`);
    await expect(page.getByText('No notes yet.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Add notes' })).toBeVisible();
  });
});

test.describe('editing a book', () => {
  test('prefills the form, saves changes and persists them', async ({ page, seed }) => {
    const [book] = await seed([LIBRARY[0]]);

    await page.goto(`/books/${book.id}/edit`);
    await waitForAppReady(page);

    // The form starts with the stored values.
    await expect(fields.title(page)).toHaveValue(book.title);
    await expect(fields.author(page)).toHaveValue(book.author);
    await expect(
      page.getByRole('radiogroup', { name: 'Status' }).getByRole('radio', { name: 'Reading' }),
    ).toHaveAttribute('aria-checked', 'true');

    await fillBookForm(page, { title: 'Dune Messiah', status: 'Finished', rating: 3 });
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expectToast(page, 'Changes saved');
    await expect(page).toHaveURL(new RegExp(`/books/${book.id}$`));
    await expect(pageTitle(page, 'Dune Messiah')).toBeVisible();
    await expect(statusBadge(page, 'Finished')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Rated 3 out of 5' })).toBeVisible();

    // Still saved after a hard reload, so it really reached the database.
    await page.reload();
    await waitForAppReady(page);
    await expect(pageTitle(page, 'Dune Messiah')).toBeVisible();
  });

  test('cancelling an edit leaves the book untouched', async ({ page, seed }) => {
    const [book] = await seed([LIBRARY[0]]);

    await page.goto(`/books/${book.id}/edit`);
    await waitForAppReady(page);

    await fillBookForm(page, { title: 'This Will Not Be Saved' });
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page).toHaveURL(new RegExp(`/books/${book.id}$`));
    await expect(pageTitle(page, book.title)).toBeVisible();
    await expect(page.getByText('This Will Not Be Saved')).toHaveCount(0);
  });

  test('shows a not-found state when editing a deleted book', async ({ page }) => {
    await page.goto('/books/999999/edit');

    await expect(page.getByRole('heading', { name: 'Book not found' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to My Books' })).toBeVisible();
  });
});

test.describe('deleting a book', () => {
  test('asks for confirmation, then removes the book', async ({ page, seed }) => {
    const [book] = await seed([LIBRARY[0]]);

    await page.goto(`/books/${book.id}`);
    await waitForAppReady(page);

    const dialog = await openDeleteDialog(page);
    await expect(dialog).toContainText(`Delete “${book.title}”?`);
    await expect(dialog).toContainText("This can't be undone.");

    await dialog.getByRole('button', { name: 'Delete' }).click();

    await expectToast(page, 'Book deleted');
    await expect(page).toHaveURL(/\/books$/);
    await expect(bookCard(page, book.title, book.author)).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Your library is empty' })).toBeVisible();
  });

  test('cancelling the dialog keeps the book', async ({ page, seed }) => {
    const [book] = await seed([LIBRARY[0]]);

    await page.goto(`/books/${book.id}`);
    await waitForAppReady(page);

    const dialog = await openDeleteDialog(page);
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`/books/${book.id}$`));
    await expect(pageTitle(page, book.title)).toBeVisible();

    // And it is still in the library.
    await page.goto('/books');
    await waitForAppReady(page);
    await expect(bookCard(page, book.title, book.author)).toBeVisible();
  });

  test('the Escape key closes the dialog without deleting', async ({ page, seed }) => {
    const [book] = await seed([LIBRARY[0]]);

    await page.goto(`/books/${book.id}`);
    await waitForAppReady(page);

    const dialog = await openDeleteDialog(page);
    await page.keyboard.press('Escape');

    await expect(dialog).toBeHidden();
    await expect(pageTitle(page, book.title)).toBeVisible();
  });
});
