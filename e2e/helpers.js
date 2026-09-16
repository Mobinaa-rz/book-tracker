/**
 * Shared helpers for the e2e specs.
 *
 * The guiding rule: seed through the API, assert through the UI. Creating
 * accounts and books with HTTP calls keeps the tests fast and focused on the
 * behaviour they are actually about, while everything the user can see is still
 * verified in a real browser. The register/login *forms* get their own specs
 * that drive them through the UI.
 */
import { expect } from '@playwright/test';

let counter = 0;

/**
 * Builds credentials for a brand-new account. Every test gets its own, so
 * tests never see each other's books (the API scopes every query by user).
 */
export function uniqueAccount(overrides = {}) {
  counter += 1;
  const stamp = `${Date.now().toString(36)}${counter}`;
  return {
    username: `e2e_${stamp}`,
    email: `e2e_${stamp}@example.com`,
    password: 'Corr3ct-Horse-Battery',
    ...overrides,
  };
}

/** Registers an account over the API and returns the created user. */
export async function registerAccount(api, credentials) {
  const response = await api.post('/api/auth/register', { data: credentials });
  expect(response.status(), 'the e2e account should register successfully').toBe(201);
  const body = await response.json();
  return body.user;
}

/** A book that satisfies every validation rule in backend/src/validators. */
export const sampleBook = {
  title: 'The Left Hand of Darkness',
  author: 'Ursula K. Le Guin',
  status: 'reading',
  rating: 4,
  notes: 'Winter is a great setting for a story about trust.',
};

/** Creates books over the API and returns them in the order given. */
export async function seedBooks(api, books) {
  const created = [];
  for (const book of books) {
    const response = await api.post('/api/books', { data: { ...sampleBook, ...book } });
    expect(response.status(), 'seeding a book should succeed').toBe(201);
    created.push((await response.json()).book);
  }
  return created;
}

/**
 * Waits for the session check in AuthContext to settle.
 * Protected pages render a spinner first; auth pages render a card.
 */
export async function waitForAppReady(page) {
  await expect(page.locator('.loading-screen')).toHaveCount(0, { timeout: 15_000 });
}

/**
 * Form controls, located by their label.
 *
 * Two quirks of this app's `Field` component are handled here once, so specs
 * never have to think about them:
 *
 *   - Required fields render an asterisk *inside* the label, so their text is
 *     "Title*" rather than "Title". Those match on a prefix.
 *   - The password control ships a toggle button labelled "Show password",
 *     which a loose `getByLabel('Password')` would also match. Anchoring the
 *     pattern excludes it.
 */
export const fields = {
  username: (page) => page.getByLabel(/^Username$/),
  email: (page) => page.getByLabel(/^Email$/),
  password: (page) => page.getByLabel(/^Password$/),
  title: (page) => page.getByLabel(/^Title/),
  author: (page) => page.getByLabel(/^Author/),
  notes: (page) => page.getByLabel(/^Notes/),
  search: (page) => page.getByLabel(/^Search by title or author$/),
  // The two calendar dates. Anchored because "Finished" is also the label of a
  // status chip, and a loose match would be ambiguous.
  started: (page) => page.getByLabel(/^Started$/),
  finished: (page) => page.getByLabel(/^Finished$/),
};

/**
 * Dates for the calendar specs.
 *
 * The suite runs against the real clock and the real browser timezone, so these
 * anchor to whatever "now" is instead of a hard-coded month - a spec written
 * against September 2026 would silently test nothing a year later. The browser
 * Playwright drives inherits this process's timezone, so both sides agree on
 * what today is.
 */
export function currentMonthKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** A 'YYYY-MM-DD' date inside the current month. */
export function dayOfCurrentMonth(day, now = new Date()) {
  return `${currentMonthKey(now)}-${String(day).padStart(2, '0')}`;
}

/** Today, as the 'YYYY-MM-DD' date the calendar stores. */
export function todayKey(now = new Date()) {
  return dayOfCurrentMonth(now.getDate(), now);
}

/** How the calendar toolbar names the current month, e.g. "September 2026". */
export function currentMonthLabel(now = new Date()) {
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(now);
}

/**
 * Formats a 'YYYY-MM-DD' date the way the book details page shows it
 * ("15 Sep 2026"). Built from the parts, never from `new Date(key)`, which
 * would read the string as UTC and show the previous day west of Greenwich.
 */
export function longDate(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(year, month - 1, day),
  );
}

/** Fills the login form and submits it. */
export async function loginThroughUi(page, { email, password }) {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await fields.email(page).fill(email);
  await fields.password(page).fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
}

/** Fills the registration form and submits it. */
export async function registerThroughUi(page, { username, email, password }) {
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  await fields.username(page).fill(username);
  await fields.email(page).fill(email);
  await fields.password(page).fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
}

/**
 * Fills the shared book form (Add and Edit use the same component).
 * Only the keys present in `values` are touched.
 */
export async function fillBookForm(page, values) {
  if (values.title !== undefined) await fields.title(page).fill(values.title);
  if (values.author !== undefined) await fields.author(page).fill(values.author);
  if (values.notes !== undefined) await fields.notes(page).fill(values.notes);
  if (values.status !== undefined) await pickStatusChip(page, values.status);
  if (values.rating !== undefined) await pickRating(page, values.rating);
  if (values.start_date !== undefined) await fields.started(page).fill(values.start_date);
  if (values.finished_date !== undefined) await fields.finished(page).fill(values.finished_date);
}

/** Clicks one of the status chips ("Want to Read" | "Reading" | "Finished"). */
export async function pickStatusChip(page, label) {
  await page.getByRole('radiogroup', { name: 'Status' }).getByRole('radio', { name: label }).click();
}

/** Clicks a star in the rating picker. */
export async function pickRating(page, stars) {
  await page.getByRole('button', { name: `Rate ${stars} of 5` }).click();
}

/** Opens the delete confirmation dialog on the book details page. */
export async function openDeleteDialog(page) {
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  const dialog = page.locator('dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Asserts a toast with the given text appeared. */
export async function expectToast(page, text) {
  await expect(page.getByRole('status').filter({ hasText: text })).toBeVisible();
}

/**
 * The status badge ("Want to Read" | "Reading" | "Finished").
 *
 * Matched exactly, because a book's details page now also shows the reader's own
 * dates - "Finished 15 Sept 2026" - and a substring match finds both the badge
 * and that date, which Playwright refuses to guess between.
 */
export const statusBadge = (page, label) => page.getByText(label, { exact: true });

/**
 * The page's main `<h1>`.
 *
 * The details page renders a book's title twice - once in the PageHeader `<h1>`
 * and again in the hero `<h2>` - so scoping by level keeps locators strict.
 */
export const pageTitle = (page, title) => page.getByRole('heading', { level: 1, name: title });

/**
 * A PageHeader "back" link. Scoped to `#main` because the navbar can contain a
 * link with the same name (e.g. "My Books" appears in both).
 */
export const backLink = (page, label) =>
  page.locator('#main').getByRole('link', { name: label, exact: true });
