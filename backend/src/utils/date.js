/**
 * Date-only helpers for the calendar columns.
 *
 * Calendar dates are 'YYYY-MM-DD' strings with no time and no timezone, so
 * "today" must be built from *local* time. `new Date().toISOString()` reports
 * the UTC date instead, which is already tomorrow for a reader east of
 * Greenwich and still yesterday for one west of it - exactly the off-by-one a
 * reading calendar should not have.
 */

/** Formats a Date as a local 'YYYY-MM-DD' string. */
export function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Today's date as a local 'YYYY-MM-DD' string. */
export function todayKey() {
  return dateKey(new Date());
}
