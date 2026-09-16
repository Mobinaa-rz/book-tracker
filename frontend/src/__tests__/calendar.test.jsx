/**
 * The reading calendar: the date maths it is built on, the month page itself,
 * the calendar dates in the book form, and the navbar link that gets you there.
 *
 * The page reads the clock, so nothing here hard-codes "the current month":
 * every expectation is derived from `todayKey()`, and the tests pass in any
 * month, including a leap February.
 */
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '../api/auth.js';
import { booksApi } from '../api/books.js';
import { calendarApi } from '../api/calendar.js';
import { ApiError } from '../api/client.js';
import { CalendarPage } from '../pages/CalendarPage.jsx';
import { AddBookPage } from '../pages/AddBookPage.jsx';
import { Navbar } from '../components/layout/Navbar.jsx';
import { LocationDisplay, renderWithProviders } from '../test/utils.jsx';
import * as calendar from '../lib/calendar.js';
import { formatDateOnly } from '../lib/format.js';

vi.mock('../api/auth.js', () => ({
  authApi: { me: vi.fn(), login: vi.fn(), register: vi.fn(), logout: vi.fn() },
}));

vi.mock('../api/books.js', () => ({
  booksApi: { list: vi.fn(), stats: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));

vi.mock('../api/calendar.js', () => ({ calendarApi: { range: vi.fn() } }));

/* ---------------------------------------------------------------- fixtures */

const today = calendar.todayKey();
const { year, month } = calendar.monthOfKey(today);
const thisMonth = calendar.monthLabel(year, month);
const lastDay = calendar.daysInMonth(year, month);
const dayInMonth = (day) => `${calendar.monthKey(year, month)}-${String(day).padStart(2, '0')}`;

const dune = { id: 1, title: 'Dune', author: 'Frank Herbert', status: 'finished', rating: 5 };
const piranesi = { id: 2, title: 'Piranesi', author: 'Susanna Clarke', status: 'reading', rating: null };

const event = (kind, date, book) => ({ date, kind, book });

/** A month response in the shape the API returns. */
function monthResponse(overrides = {}) {
  return {
    from: dayInMonth(1),
    to: dayInMonth(lastDay),
    events: [
      event('started', dayInMonth(1), dune),
      event('finished', dayInMonth(2), dune),
      event('started', dayInMonth(2), piranesi),
    ],
    summary: { started: 2, finished: 1, total: 3 },
    ...overrides,
  };
}

/** The day-number button for a date, found by the hook the page renders. */
const dayButton = (container, key) => container.querySelector(`[data-date="${key}"]`);

beforeEach(() => {
  for (const fn of Object.values(booksApi)) fn.mockReset();
  for (const fn of Object.values(calendarApi)) fn.mockReset();
  authApi.me.mockReset();
  calendarApi.range.mockResolvedValue(monthResponse());
});

/* ------------------------------------------------------- date maths (pure) */

describe('calendar date maths', () => {
  it('builds a six-week grid that starts on a Monday', () => {
    // September 2026 begins on a Tuesday, so the grid opens on Monday 31 August.
    const weeks = calendar.buildMonthGrid(2026, 8, '2026-09-12');
    const cells = weeks.flat();

    expect(weeks).toHaveLength(6);
    expect(cells).toHaveLength(42);
    expect(cells[0].key).toBe('2026-08-31');
    expect(cells[0].inMonth).toBe(false);
    expect(cells.filter((cell) => cell.inMonth)).toHaveLength(30);
    expect(cells.find((cell) => cell.key === '2026-09-12').isToday).toBe(true);
    expect(cells.filter((cell) => cell.isToday)).toHaveLength(1);
  });

  it('still starts on a Monday when the month begins on a Sunday', () => {
    // June 2025 begins on a Sunday: six leading days from May.
    const cells = calendar.buildMonthGrid(2025, 5, 'not-today').flat();

    expect(cells[0].key).toBe('2025-05-26');
    expect(cells.filter((cell) => cell.inMonth)).toHaveLength(30);
  });

  it('marks Saturday and Sunday as the weekend', () => {
    const secondWeek = calendar.buildMonthGrid(2026, 8, 'not-today')[1]; // 7-13 Sep

    expect(secondWeek.map((cell) => cell.isWeekend)).toEqual([
      false,
      false,
      false,
      false,
      false,
      true,
      true,
    ]);
  });

  it('spills into the next year when December needs it', () => {
    const cells = calendar.buildMonthGrid(2026, 11, 'not-today').flat();

    expect(cells[0].key).toBe('2026-11-30');
    expect(cells.at(-1).key).toBe('2027-01-10');
  });

  it('knows how long a month is, leap years included', () => {
    expect(calendar.monthRange(2026, 8)).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(calendar.monthRange(2024, 1)).toEqual({ from: '2024-02-01', to: '2024-02-29' });
    expect(calendar.monthRange(2026, 1)).toEqual({ from: '2026-02-01', to: '2026-02-28' });
  });

  it('rolls the year over when moving between months', () => {
    expect(calendar.addMonths(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(calendar.addMonths(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
    expect(calendar.addMonths(2026, 2, -13)).toEqual({ year: 2025, month: 1 });
  });

  it('rejects dates that do not exist, which Date would silently roll over', () => {
    expect(calendar.isValidKey('2026-02-30')).toBe(false);
    expect(calendar.isValidKey('2026-02-28')).toBe(true);
    expect(calendar.isValidKey('2024-02-29')).toBe(true); // a real leap day
    expect(calendar.isValidKey('2026-9-1')).toBe(false); // not zero-padded
    expect(calendar.isValidKey('nope')).toBe(false);
    expect(calendar.isValidKey(null)).toBe(false);
  });

  it('parses month keys from the URL, and rejects nonsense', () => {
    expect(calendar.parseMonthKey('2026-09')).toEqual({ year: 2026, month: 8 });
    expect(calendar.parseMonthKey('2026-13')).toBeNull();
    expect(calendar.parseMonthKey('2026-9')).toBeNull();
    expect(calendar.parseMonthKey('')).toBeNull();
  });

  it('groups events by day and keeps the order the API sent', () => {
    const grouped = calendar.groupEventsByDay([
      event('started', '2026-09-01', dune),
      event('finished', '2026-09-01', dune),
      event('started', '2026-09-05', piranesi),
    ]);

    expect(Object.keys(grouped)).toEqual(['2026-09-01', '2026-09-05']);
    expect(grouped['2026-09-01'].map((e) => e.kind)).toEqual(['started', 'finished']);
  });
});

describe('formatDateOnly', () => {
  it('renders a date-only string as the same day it names', () => {
    // `new Date('2026-03-10')` is UTC midnight, so formatting it locally shows
    // 9 March anywhere west of Greenwich. Parsing the parts by hand does not.
    expect(formatDateOnly('2026-03-10')).toBe('10 Mar 2026');
    expect(formatDateOnly('2026-01-01')).toBe('1 Jan 2026');
    expect(formatDateOnly('2026-12-31')).toBe('31 Dec 2026');
  });

  it('returns nothing for a missing or malformed value', () => {
    expect(formatDateOnly(null)).toBe('');
    expect(formatDateOnly('')).toBe('');
    expect(formatDateOnly('nonsense')).toBe('');
  });
});

/* ---------------------------------------------------------- the month page */

describe('CalendarPage', () => {
  it('shows a loading skeleton, then the month grid', async () => {
    renderWithProviders(<CalendarPage />, { route: '/calendar' });

    expect(screen.getByLabelText('Loading calendar')).toBeInTheDocument();

    expect(await screen.findByRole('table', { name: `Reading calendar for ${thisMonth}` })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Calendar' })).toBeInTheDocument();
    expect(screen.getByText(thisMonth)).toBeInTheDocument();
  });

  it('asks the API for exactly the month on screen', async () => {
    renderWithProviders(<CalendarPage />, { route: '/calendar' });
    await screen.findByRole('table');

    expect(calendarApi.range).toHaveBeenCalledWith({
      from: dayInMonth(1),
      to: dayInMonth(lastDay),
    });
  });

  it('reads the month from the URL', async () => {
    renderWithProviders(<CalendarPage />, { route: '/calendar?month=2026-03', path: '/calendar' });

    expect(await screen.findByText('March 2026')).toBeInTheDocument();
    expect(calendarApi.range).toHaveBeenCalledWith({ from: '2026-03-01', to: '2026-03-31' });
  });

  it('falls back to the current month when ?month= is nonsense', async () => {
    renderWithProviders(<CalendarPage />, { route: '/calendar?month=hacker', path: '/calendar' });
    await screen.findByRole('table');

    expect(calendarApi.range).toHaveBeenCalledWith({ from: dayInMonth(1), to: dayInMonth(lastDay) });
    expect(screen.getByText(thisMonth)).toBeInTheDocument();
  });

  it('summarises the month under the title', async () => {
    renderWithProviders(<CalendarPage />, { route: '/calendar' });

    expect(await screen.findByText('2 books started and 1 book finished')).toBeInTheDocument();
  });

  it('puts every event on its day, named by what happened', async () => {
    renderWithProviders(<CalendarPage />, { route: '/calendar' });
    const grid = await screen.findByRole('table');

    expect(within(grid).getByRole('link', { name: 'Started Dune' })).toBeInTheDocument();
    expect(within(grid).getByRole('link', { name: 'Finished Dune' })).toBeInTheDocument();
    expect(within(grid).getByRole('link', { name: 'Started Piranesi' })).toBeInTheDocument();
  });

  it('links an event straight to its book', async () => {
    renderWithProviders(<CalendarPage />, { route: '/calendar' });
    const grid = await screen.findByRole('table');

    expect(within(grid).getByRole('link', { name: 'Finished Dune' })).toHaveAttribute('href', '/books/1');
  });

  it('collapses a busy day to a "+N more" control', async () => {
    calendarApi.range.mockResolvedValue(
      monthResponse({
        events: [
          event('started', dayInMonth(3), dune),
          event('finished', dayInMonth(3), piranesi),
          event('started', dayInMonth(3), { id: 3, title: 'Circe', author: 'Madeline Miller', status: 'reading', rating: null }),
        ],
        summary: { started: 2, finished: 1, total: 3 },
      }),
    );
    renderWithProviders(<CalendarPage />, { route: '/calendar' });
    const grid = await screen.findByRole('table');

    expect(within(grid).getByRole('button', { name: '+1 more' })).toBeInTheDocument();
    expect(within(grid).queryByRole('link', { name: 'Started Circe' })).not.toBeInTheDocument();
  });

  it('selecting a day puts it in the URL and opens it in the panel', async () => {
    const { container } = renderWithProviders(
      <>
        <CalendarPage />
        <LocationDisplay />
      </>,
      { route: '/calendar', path: '/calendar' },
    );
    await screen.findByRole('table');

    await userEvent.click(dayButton(container, dayInMonth(2)));

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(`day=${dayInMonth(2)}`),
    );
    const panel = container.querySelector('.calendar-panel');
    expect(within(panel).getByRole('heading', { level: 2, name: calendar.dayLabel(dayInMonth(2)) })).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: 'Finished Dune by Frank Herbert' })).toHaveAttribute(
      'href',
      '/books/1',
    );
    expect(within(panel).getByRole('link', { name: 'Started Piranesi by Susanna Clarke' })).toBeInTheDocument();
  });

  it('marks the selected day as pressed', async () => {
    const { container } = renderWithProviders(<CalendarPage />, {
      route: `/calendar?day=${dayInMonth(2)}`,
      path: '/calendar',
    });
    await screen.findByRole('table');

    expect(dayButton(container, dayInMonth(2))).toHaveAttribute('aria-pressed', 'true');
    expect(dayButton(container, dayInMonth(3))).toHaveAttribute('aria-pressed', 'false');
  });

  it('moves to the next month and back again', async () => {
    const { container } = renderWithProviders(
      <>
        <CalendarPage />
        <LocationDisplay />
      </>,
      { route: '/calendar', path: '/calendar' },
    );
    await screen.findByRole('table');

    await userEvent.click(screen.getByRole('button', { name: 'Next month' }));

    const next = calendar.addMonths(year, month, 1);
    const nextKey = calendar.monthKey(next.year, next.month);
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(`month=${nextKey}`));
    expect(calendarApi.range).toHaveBeenLastCalledWith(calendar.monthRange(next.year, next.month));

    await userEvent.click(screen.getByRole('button', { name: 'Previous month' }));

    // Back to the current month: no ?month= at all, so the URL stays clean.
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/calendar$/));
    expect(dayButton(container, dayInMonth(1))).toBeInTheDocument();
  });

  it('offers a shortcut back to the current month, disabled while there', async () => {
    renderWithProviders(<CalendarPage />, { route: '/calendar' });
    await screen.findByRole('table');

    expect(screen.getByRole('button', { name: 'Today' })).toBeDisabled();
  });

  it('ignores a ?day= that belongs to a different month', async () => {
    const next = calendar.addMonths(year, month, 1);
    const { container } = renderWithProviders(<CalendarPage />, {
      route: `/calendar?month=${calendar.monthKey(next.year, next.month)}&day=${dayInMonth(2)}`,
      path: '/calendar',
    });
    await screen.findByRole('table');

    expect(container.querySelector('.calendar-panel')).toHaveTextContent('Choose a day');
    expect(dayButton(container, dayInMonth(2))).toBeNull();
  });

  it('explains an empty month instead of showing a blank grid', async () => {
    calendarApi.range.mockResolvedValue(
      monthResponse({ events: [], summary: { started: 0, finished: 0, total: 0 } }),
    );
    renderWithProviders(<CalendarPage />, { route: '/calendar' });

    expect(await screen.findByText(`Nothing logged in ${thisMonth} yet.`)).toBeInTheDocument();
    expect(
      screen.getByText(/A date is filled in for you when you set a book to Reading or Finished/),
    ).toBeInTheDocument();
    // The grid is still there to navigate with.
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('shows an empty day panel with a next step', async () => {
    calendarApi.range.mockResolvedValue(
      monthResponse({ events: [], summary: { started: 0, finished: 0, total: 0 } }),
    );
    const { container } = renderWithProviders(<CalendarPage />, {
      route: `/calendar?day=${dayInMonth(4)}`,
      path: '/calendar',
    });

    expect(await screen.findByText('Nothing on this day')).toBeInTheDocument();
    expect(within(container.querySelector('.calendar-panel')).getByRole('link', { name: 'Add a book' })).toHaveAttribute(
      'href',
      '/books/new',
    );
  });

  it('labels what the two colours mean', async () => {
    const { container } = renderWithProviders(<CalendarPage />, { route: '/calendar' });
    await screen.findByRole('table');

    // Colour is never the only signal: each swatch is paired with a word.
    const legend = container.querySelector('.calendar-legend');
    expect(legend).toHaveTextContent('Started');
    expect(legend).toHaveTextContent('Finished');
    expect(legend.querySelectorAll('li')).toHaveLength(2);
  });

  it('offers a retry when the calendar fails to load', async () => {
    calendarApi.range.mockRejectedValue(new ApiError(500, 'Server exploded'));
    renderWithProviders(<CalendarPage />, { route: '/calendar' });

    expect(await screen.findByText(/Couldn't load your calendar/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    calendarApi.range.mockResolvedValue(monthResponse());
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('table')).toBeInTheDocument();
  });
});

/* ------------------------------------------------- dates in the book form */

describe('book form calendar dates', () => {
  it('offers Started and Finished date fields', async () => {
    renderWithProviders(<AddBookPage />, { route: '/books/new' });

    expect(await screen.findByLabelText('Started')).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('Finished')).toHaveAttribute('type', 'date');
  });

  it('sends the dates the reader typed', async () => {
    booksApi.create.mockResolvedValue({ id: 9 });
    renderWithProviders(<AddBookPage />, {
      route: '/books/new',
      extraRoutes: <Route path="/books/:id" element={<LocationDisplay />} />,
    });

    await userEvent.type(await screen.findByLabelText(/Title/), 'Dune');
    await userEvent.type(screen.getByLabelText(/Author/), 'Frank Herbert');
    await userEvent.type(screen.getByLabelText('Started'), '2026-03-01');
    await userEvent.type(screen.getByLabelText('Finished'), '2026-03-20');
    await userEvent.click(screen.getByRole('button', { name: 'Add book' }));

    await waitFor(() => expect(booksApi.create).toHaveBeenCalled());
    expect(booksApi.create.mock.calls[0][0]).toMatchObject({
      start_date: '2026-03-01',
      finished_date: '2026-03-20',
    });
  });

  it('refuses to finish a book before it started, before calling the API', async () => {
    renderWithProviders(<AddBookPage />, { route: '/books/new' });

    await userEvent.type(await screen.findByLabelText(/Title/), 'Dune');
    await userEvent.type(screen.getByLabelText(/Author/), 'Frank Herbert');
    fireEvent.change(screen.getByLabelText('Started'), { target: { value: '2026-03-20' } });
    fireEvent.change(screen.getByLabelText('Finished'), { target: { value: '2026-03-01' } });
    await userEvent.click(screen.getByRole('button', { name: 'Add book' }));

    expect(await screen.findByText('Finished date cannot be before the start date')).toBeInTheDocument();
    expect(booksApi.create).not.toHaveBeenCalled();
  });

  it('shows a date error the server sends under the right field', async () => {
    booksApi.create.mockRejectedValue(
      new ApiError(400, 'Validation failed', {
        finished_date: 'Finished date must be a YYYY-MM-DD date',
      }),
    );
    renderWithProviders(<AddBookPage />, { route: '/books/new' });

    await userEvent.type(await screen.findByLabelText(/Title/), 'Dune');
    await userEvent.type(screen.getByLabelText(/Author/), 'Frank Herbert');
    await userEvent.click(screen.getByRole('button', { name: 'Add book' }));

    expect(await screen.findByText('Finished date must be a YYYY-MM-DD date')).toBeInTheDocument();
    // Reported against the field, not as a generic form error.
    expect(screen.getByLabelText('Finished')).toHaveAttribute('aria-invalid', 'true');
  });
});

/* ------------------------------------------------------------------ navbar */

describe('Navbar calendar link', () => {
  it('links to the calendar and marks it active while there', async () => {
    renderWithProviders(<Navbar />, { route: '/calendar', protectedPage: true });

    const link = await screen.findByRole('link', { name: 'Calendar' });
    expect(link).toHaveAttribute('href', '/calendar');
    expect(link).toHaveAttribute('aria-current', 'page');
  });
});
