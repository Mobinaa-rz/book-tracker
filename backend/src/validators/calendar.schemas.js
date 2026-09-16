import { z } from 'zod';

/**
 * Widest range the calendar endpoint will serve.
 *
 * A month view needs ~31 days; this leaves room for a year view or an activity
 * heatmap without letting a caller ask for every date a user has ever stored.
 */
export const MAX_RANGE_DAYS = 366;

/**
 * Whole days between two 'YYYY-MM-DD' strings, counting both ends.
 *
 * Parsed as UTC on purpose: these are date-only values with no timezone, and
 * measuring the gap between two of them must not depend on the server's local
 * offset or on a DST change falling inside the range.
 */
export function daysInRange(from, to) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000) + 1;
}

function isoDate(field) {
  return z.iso.date({ error: `${field} must be a date in YYYY-MM-DD format` });
}

// Query string for GET /api/calendar?from=&to=
// Both bounds are required: "the current month" is the browser's judgement
// (it knows the reader's timezone), not the server's.
export const calendarQuerySchema = z
  .object({
    from: isoDate('from'),
    to: isoDate('to'),
  })
  // 'YYYY-MM-DD' strings compare chronologically, so no parsing is needed.
  .refine(({ from, to }) => from <= to, {
    path: ['to'],
    message: 'to must be on or after from',
  })
  .refine(({ from, to }) => daysInRange(from, to) <= MAX_RANGE_DAYS, {
    path: ['to'],
    message: `Date range is too wide (at most ${MAX_RANGE_DAYS} days)`,
  });
