/**
 * Calendar maths for the reading calendar.
 *
 * Everything here speaks in date-only 'YYYY-MM-DD' strings ("keys"), because
 * that is what the API stores and returns. Keys are built from *local* date
 * parts and parsed back into a local midnight Date, so a day never shifts when
 * the browser's timezone differs from UTC. `toISOString()` is deliberately not
 * used anywhere in this file: it reports the UTC date, which is already
 * tomorrow for a reader east of Greenwich and still yesterday for one west of
 * it - the exact off-by-one a reading calendar must not have.
 *
 * The functions are pure (except `todayKey`, which reads the clock through a
 * parameter that tests can override), so the tricky date logic is unit-tested
 * on its own rather than through the DOM.
 */

/** Months are 0-based everywhere in this file, like `Date.prototype.getMonth`. */

/** The kinds of calendar event a book can produce, and how each is coloured.
 *  `status` names an existing status token, so the calendar reuses the app's
 *  semantic colours instead of inventing new ones. */
export const EVENT_KINDS = {
  started: { label: 'Started', status: 'reading' },
  finished: { label: 'Finished', status: 'finished' },
};

/** How many events a day cell shows before collapsing to "+N more". */
export const MAX_EVENTS_PER_DAY_CELL = 2;

/** Weeks start on Monday, matching the en-GB formatting used elsewhere. */
export const WEEKDAY_LABELS = [
  { short: 'Mon', long: 'Monday' },
  { short: 'Tue', long: 'Tuesday' },
  { short: 'Wed', long: 'Wednesday' },
  { short: 'Thu', long: 'Thursday' },
  { short: 'Fri', long: 'Friday' },
  { short: 'Sat', long: 'Saturday' },
  { short: 'Sun', long: 'Sunday' },
];

const KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

const monthFormatter = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });
const dayFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const pad = (value) => String(value).padStart(2, '0');

/** A local Date -> 'YYYY-MM-DD'. */
export function toKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 'YYYY-MM-DD' -> a local Date at midnight. Invalid input yields Invalid Date. */
export function fromKey(key) {
  if (typeof key !== 'string' || !KEY_PATTERN.test(key)) return new Date(NaN);
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Today's key, in the reader's own timezone. */
export function todayKey(now = new Date()) {
  return toKey(now);
}

/**
 * True for a real calendar date in 'YYYY-MM-DD' form.
 * The round trip catches values `Date` would silently roll over, such as
 * '2026-02-30' (which becomes 2 March) - important because these strings come
 * from the URL, where anyone can type anything.
 */
export function isValidKey(key) {
  if (typeof key !== 'string' || !KEY_PATTERN.test(key)) return false;
  return toKey(fromKey(key)) === key;
}

/** 'YYYY-MM' for a local year and 0-based month. */
export function monthKey(year, month) {
  return `${year}-${pad(month + 1)}`;
}

/** 'YYYY-MM' -> { year, month }, or null when it is not a real month. */
export function parseMonthKey(key) {
  if (typeof key !== 'string' || !MONTH_KEY_PATTERN.test(key)) return null;
  const [year, month] = key.split('-').map(Number);
  return { year, month: month - 1 };
}

/** The year and month of a date key. */
export function monthOfKey(key) {
  const date = fromKey(key);
  return { year: date.getFullYear(), month: date.getMonth() };
}

/** Same month and year? */
export function isSameMonth(a, b) {
  return a.year === b.year && a.month === b.month;
}

/** Moves a year/month pair by `delta` months (negative goes backwards). */
export function addMonths(year, month, delta) {
  const total = year * 12 + month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

/** How many days a month has. */
export function daysInMonth(year, month) {
  // Day 0 of the next month is the last day of this one.
  return new Date(year, month + 1, 0).getDate();
}

/** The first and last day of a month, as inclusive keys for the API. */
export function monthRange(year, month) {
  return {
    from: `${monthKey(year, month)}-01`,
    to: `${monthKey(year, month)}-${pad(daysInMonth(year, month))}`,
  };
}

/** "September 2026" */
export function monthLabel(year, month) {
  return monthFormatter.format(new Date(year, month, 1));
}

/** "Saturday, 12 September 2026" - the accessible name of a day. */
export function dayLabel(key) {
  const date = fromKey(key);
  return Number.isNaN(date.getTime()) ? '' : dayFormatter.format(date);
}

/**
 * The six weeks of a month view: 42 days, starting on the Monday on or before
 * the 1st and spilling into the neighbouring months so the grid is always
 * rectangular (a fixed height means the page does not jump between months).
 *
 * Days outside the month are included and flagged, so they can be rendered
 * dimmed and left out of the month's own counts.
 */
export function buildMonthGrid(year, month, today = todayKey()) {
  const firstWeekday = new Date(year, month, 1).getDay(); // 0 = Sunday
  const leadingDays = (firstWeekday + 6) % 7; // Monday-first offset
  const startDay = 1 - leadingDays;

  const weeks = [];
  for (let week = 0; week < 6; week += 1) {
    const days = [];
    for (let index = 0; index < 7; index += 1) {
      const date = new Date(year, month, startDay + week * 7 + index);
      const key = toKey(date);
      days.push({
        key,
        day: date.getDate(),
        inMonth: date.getMonth() === month,
        isToday: key === today,
        // With Monday first, positions 5 and 6 are Saturday and Sunday.
        isWeekend: index >= 5,
      });
    }
    weeks.push(days);
  }

  return weeks;
}

/**
 * Groups calendar events by their date key, preserving the API's order
 * (chronological, "started" before "finished" within a day).
 * Returns a plain object so callers can look a day up directly.
 */
export function groupEventsByDay(events = []) {
  const byDay = {};
  for (const event of events) {
    (byDay[event.date] ??= []).push(event);
  }
  return byDay;
}

/** Events that fall inside the given month (the grid also shows neighbours). */
export function eventsInMonth(events = [], year, month) {
  const prefix = monthKey(year, month);
  return events.filter((event) => event.date.startsWith(prefix));
}
