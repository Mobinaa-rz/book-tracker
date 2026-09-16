import { EVENT_KINDS } from '../../lib/calendar.js';

/**
 * What the two colours in the grid mean.
 *
 * Each entry pairs its colour with a word, following the app's rule that colour
 * is never the only signal. The classes reuse the existing status colours
 * (Reading blue, Finished green) rather than adding new ones, so the calendar
 * reads the same as the badges and chips everywhere else.
 */
export function CalendarLegend() {
  return (
    <ul className="calendar-legend">
      {Object.entries(EVENT_KINDS).map(([kind, meta]) => (
        <li key={kind} className={`calendar-legend__item calendar-legend__item--${meta.status}`}>
          <span className="calendar-legend__dot" aria-hidden="true" />
          {meta.label}
        </li>
      ))}
    </ul>
  );
}
