/**
 * The reading calendar, end to end.
 *
 * The interesting behaviour here is the coupling with reading status: setting a
 * book to Reading or Finished stamps today's date, a date typed into the form
 * wins over that stamp, and the month grid shows the result.
 *
 * The suite runs against the real clock, so nothing is hard-coded to a
 * particular month, and the days used for seeding are deliberately *not* today
 * - that is what makes "the date did not move" a meaningful assertion rather
 * than one that passes by coincidence on the first or second of the month.
 */
import { authedTest as test, expect } from './fixtures.js';
import {
  currentMonthLabel,
  dayOfCurrentMonth,
  fields,
  fillBookForm,
  longDate,
  pickStatusChip,
  todayKey,
  waitForAppReady,
} from './helpers.js';

/**
 * `count` distinct days of the current month, none of which is today.
 * Every month has at least 28 days, so this always succeeds.
 */
function daysThatAreNotToday(count) {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const days = [];
  for (let day = 1; day <= lastDay && days.length < count; day += 1) {
    if (day !== now.getDate()) days.push(day);
  }
  return days;
}

// Explicit arrow: `map(dayOfCurrentMonth)` would pass the array index in as the
// helper's `now` argument.
const [DAY_A, DAY_B, DAY_C] = daysThatAreNotToday(3).map((day) => dayOfCurrentMonth(day));

/** A library with dates in the current month, plus one book with none at all. */
const LIBRARY = [
  {
    title: 'Dune',
    author: 'Frank Herbert',
    status: 'finished',
    rating: 5,
    start_date: DAY_A,
    finished_date: DAY_B,
  },
  {
    title: 'Piranesi',
    author: 'Susanna Clarke',
    status: 'reading',
    rating: null,
    start_date: DAY_B,
  },
  { title: 'The Dispossessed', author: 'Ursula K. Le Guin', status: 'want_to_read', rating: null },
];

/** The month grid. */
const grid = (page) => page.getByRole('table');

/** The month name in the toolbar (the sr-only caption also mentions it). */
const monthLabel = (page) => page.locator('.calendar-toolbar__month');

/**
 * The month controls. Scoped deliberately: today's square is a button whose
 * accessible name starts with "Today", so an unscoped `getByRole('button',
 * { name: 'Today' })` matches two different controls.
 */
const toolbar = (page) => page.locator('.calendar-toolbar__actions');

/** The side panel that describes the selected day. */
const panel = (page) => page.locator('.calendar-panel');

/** The dates block on a book's details page. */
const dates = (page) => page.locator('.detail__dates');

/** The table cell for one date, found through the day button it contains. */
const dayCell = (page, key) =>
  page.locator('td').filter({ has: page.locator(`[data-date="${key}"]`) });

test.describe('the calendar month', () => {
  test('a brand-new account sees an empty month with a way forward', async ({ page }) => {
    await page.goto('/calendar');
    await waitForAppReady(page);

    await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();
    await expect(monthLabel(page)).toHaveText(currentMonthLabel());
    // The grid is still drawn: there is something to navigate even with no data.
    await expect(grid(page)).toBeVisible();

    await expect(page.locator('.page-subtitle')).toHaveText(
      `Nothing logged in ${currentMonthLabel()} yet.`,
    );
    await expect(
      page.getByText(/A date is filled in for you when you set a book to Reading/),
    ).toBeVisible();
    await expect(panel(page)).toContainText('Nothing on this day');
    await expect(panel(page).getByRole('link', { name: 'Add a book' })).toBeVisible();
  });

  test('shows each reading date on its day', async ({ page, seed }) => {
    await seed(LIBRARY);
    await page.goto('/calendar');
    await waitForAppReady(page);

    await expect(grid(page).getByRole('link', { name: 'Started Dune' })).toBeVisible();
    await expect(grid(page).getByRole('link', { name: 'Finished Dune' })).toBeVisible();
    await expect(grid(page).getByRole('link', { name: 'Started Piranesi' })).toBeVisible();

    // A book with no dates has nothing to show and stays off the calendar.
    await expect(page.getByText('The Dispossessed')).toHaveCount(0);

    await expect(page.locator('.page-subtitle')).toHaveText('2 books started and 1 book finished');
  });

  test('puts an event in the right cell', async ({ page, seed }) => {
    await seed(LIBRARY);
    await page.goto('/calendar');
    await waitForAppReady(page);

    await expect(dayCell(page, DAY_A).getByRole('link', { name: 'Started Dune' })).toBeVisible();
    await expect(dayCell(page, DAY_B).getByRole('link', { name: 'Finished Dune' })).toBeVisible();
    await expect(dayCell(page, DAY_B).getByRole('link', { name: 'Started Piranesi' })).toBeVisible();

    // A day with nothing on it is still part of the month, just empty.
    await expect(dayCell(page, DAY_C)).toHaveCount(1);
    await expect(dayCell(page, DAY_C).getByRole('link')).toHaveCount(0);
  });

  test('selecting a day opens it in the side panel and the URL', async ({ page, seed }) => {
    await seed(LIBRARY);
    await page.goto('/calendar');
    await waitForAppReady(page);

    await page.locator(`[data-date="${DAY_B}"]`).click();

    await expect(page).toHaveURL(new RegExp(`day=${DAY_B}`));
    await expect(
      panel(page).getByRole('link', { name: 'Finished Dune by Frank Herbert' }),
    ).toBeVisible();
    await expect(
      panel(page).getByRole('link', { name: 'Started Piranesi by Susanna Clarke' }),
    ).toBeVisible();
    // The chosen day is marked as pressed, so the selection is not colour alone.
    await expect(page.locator(`[data-date="${DAY_B}"]`)).toHaveAttribute('aria-pressed', 'true');
  });

  test('an event opens its book', async ({ page, seed }) => {
    const [book] = await seed([LIBRARY[0]]);
    await page.goto('/calendar');
    await waitForAppReady(page);

    await grid(page).getByRole('link', { name: 'Started Dune' }).click();

    await expect(page).toHaveURL(new RegExp(`/books/${book.id}$`));
    await expect(page.getByRole('heading', { level: 1, name: 'Dune' })).toBeVisible();
  });

  test('the month can be changed, and Today comes back to a clean URL', async ({ page, seed }) => {
    await seed(LIBRARY);
    await page.goto('/calendar');
    await waitForAppReady(page);

    await expect(toolbar(page).getByRole('button', { name: 'Today' })).toBeDisabled();

    await toolbar(page).getByRole('button', { name: 'Next month' }).click();

    await expect(page).toHaveURL(/month=/);
    await expect(monthLabel(page)).not.toHaveText(currentMonthLabel());
    // The seeded dates belong to the month we left.
    await expect(grid(page).getByRole('link', { name: 'Started Dune' })).toHaveCount(0);

    await toolbar(page).getByRole('button', { name: 'Today' }).click();

    await expect(page).toHaveURL(/\/calendar$/);
    await expect(monthLabel(page)).toHaveText(currentMonthLabel());
    await expect(grid(page).getByRole('link', { name: 'Started Dune' })).toBeVisible();
  });

  test('a deep link to a month and day survives a reload', async ({ page }) => {
    await page.goto('/calendar?month=2026-03&day=2026-03-15');
    await waitForAppReady(page);

    await expect(monthLabel(page)).toHaveText('March 2026');
    await expect(panel(page)).toContainText('15 March 2026');

    await page.reload();
    await waitForAppReady(page);

    await expect(monthLabel(page)).toHaveText('March 2026');
    await expect(panel(page)).toContainText('15 March 2026');
  });

  test('a nonsense month in the URL falls back to the current one', async ({ page }) => {
    await page.goto('/calendar?month=not-a-month');
    await waitForAppReady(page);

    await expect(monthLabel(page)).toHaveText(currentMonthLabel());
    await expect(grid(page)).toBeVisible();
  });
});

test.describe('reading status drives the calendar', () => {
  test('setting a book to Reading stamps today', async ({ page, seed }) => {
    const [book] = await seed([
      {
        title: 'The Left Hand of Darkness',
        author: 'Ursula K. Le Guin',
        status: 'want_to_read',
        rating: null,
      },
    ]);

    await page.goto(`/books/${book.id}/edit`);
    await pickStatusChip(page, 'Reading');
    await page.getByRole('button', { name: 'Save changes' }).click();

    // The date was filled in server-side, so it shows up on the book...
    await expect(dates(page)).toContainText(`Started ${longDate(todayKey())}`);

    // ...and on today's square of the calendar.
    await page.goto('/calendar');
    await waitForAppReady(page);
    await expect(
      dayCell(page, todayKey()).getByRole('link', { name: 'Started The Left Hand of Darkness' }),
    ).toBeVisible();
  });

  test('setting a book to Finished stamps today', async ({ page, seed }) => {
    const [book] = await seed([
      { title: 'Piranesi', author: 'Susanna Clarke', status: 'reading', rating: null, start_date: DAY_A },
    ]);

    await page.goto(`/books/${book.id}/edit`);
    await pickStatusChip(page, 'Finished');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(dates(page)).toContainText(`Finished ${longDate(todayKey())}`);
    // The start date that was already there is left alone.
    await expect(dates(page)).toContainText(`Started ${longDate(DAY_A)}`);
  });

  test('editing a book without changing its status does not restamp', async ({ page, seed }) => {
    const [book] = await seed([LIBRARY[0]]); // finished, DAY_A -> DAY_B

    await page.goto(`/books/${book.id}/edit`);
    await fields.notes(page).fill('Re-read the appendix.');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(dates(page)).toContainText(`Started ${longDate(DAY_A)}`);
    await expect(dates(page)).toContainText(`Finished ${longDate(DAY_B)}`);
    // "Added" legitimately shows today; what must not have moved are the two
    // reading dates, so today must not appear as either of them.
    await expect(dates(page)).not.toContainText(`Started ${longDate(todayKey())}`);
    await expect(dates(page)).not.toContainText(`Finished ${longDate(todayKey())}`);
  });

  test('a date typed into the form wins over the stamp', async ({ page, seed }) => {
    const [book] = await seed([
      { title: 'Circe', author: 'Madeline Miller', status: 'want_to_read', rating: null },
    ]);

    await page.goto(`/books/${book.id}/edit`);
    await pickStatusChip(page, 'Finished');
    await fields.finished(page).fill(DAY_C); // DAY_C is never today
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(dates(page)).toContainText(`Finished ${longDate(DAY_C)}`);
    await expect(dates(page)).not.toContainText(`Finished ${longDate(todayKey())}`);
  });

  test('a date can be cleared again', async ({ page, seed }) => {
    const [book] = await seed([LIBRARY[0]]);

    await page.goto(`/books/${book.id}/edit`);
    await expect(fields.started(page)).toHaveValue(DAY_A);
    await fields.started(page).fill('');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(dates(page)).not.toContainText(/Started/);
    // Clearing one date leaves the other alone.
    await expect(dates(page)).toContainText(`Finished ${longDate(DAY_B)}`);
  });
});

test.describe('calendar dates in the book form', () => {
  test('a new book can be given both dates', async ({ page }) => {
    await page.goto('/books/new');

    await fillBookForm(page, {
      title: 'The Dispossessed',
      author: 'Ursula K. Le Guin',
      status: 'Finished',
      rating: 5,
      start_date: DAY_A,
      finished_date: DAY_B,
    });
    await page.getByRole('button', { name: 'Add book' }).click();

    await expect(dates(page)).toContainText(`Started ${longDate(DAY_A)}`);
    await expect(dates(page)).toContainText(`Finished ${longDate(DAY_B)}`);

    // And the book is on the calendar for both days.
    await page.goto('/calendar');
    await waitForAppReady(page);
    await expect(
      dayCell(page, DAY_A).getByRole('link', { name: 'Started The Dispossessed' }),
    ).toBeVisible();
    await expect(
      dayCell(page, DAY_B).getByRole('link', { name: 'Finished The Dispossessed' }),
    ).toBeVisible();
  });

  test('the form refuses to finish a book before it started', async ({ page }) => {
    await page.goto('/books/new');

    await fillBookForm(page, {
      title: 'Dune',
      author: 'Frank Herbert',
      start_date: DAY_B, // later than DAY_A
      finished_date: DAY_A,
    });
    await page.getByRole('button', { name: 'Add book' }).click();

    await expect(page.getByText('Finished date cannot be before the start date')).toBeVisible();
    // Nothing was submitted, so the reader is still on the form with their work.
    await expect(page).toHaveURL(/\/books\/new$/);
    await expect(fields.title(page)).toHaveValue('Dune');
  });
});
