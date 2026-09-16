import { WEEKDAY_LABELS } from '../../lib/calendar.js';
import { CalendarDayCell } from './CalendarDayCell.jsx';

/**
 * The month itself, as a real table.
 *
 * A `<table>` is used rather than a CSS grid of divs because that is what a
 * calendar is: row and column headers give a screen reader the weekday and the
 * week for free, and the `<caption>` names the month being shown.
 *
 * `eventsByDay` only holds this month's events (the API is asked for exactly
 * this range), so neighbouring-month cells are passed none.
 */
export function CalendarMonthGrid({ weeks, eventsByDay, selectedDate, onSelectDate, label }) {
  return (
    // The wrapper carries the card border and radius, and clips the table's
    // corners - `overflow: hidden` on a <table> itself is not reliable.
    <div className="calendar-grid-wrap">
      <table className="calendar-grid">
        <caption className="sr-only">Reading calendar for {label}</caption>
        <thead>
          <tr>
            {WEEKDAY_LABELS.map((weekday) => (
              <th key={weekday.long} scope="col">
                <span aria-hidden="true">{weekday.short}</span>
                <span className="sr-only">{weekday.long}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0].key}>
              {week.map((day) => (
                <CalendarDayCell
                  key={day.key}
                  day={day}
                  events={day.inMonth ? (eventsByDay[day.key] ?? []) : []}
                  selected={day.key === selectedDate}
                  onSelect={onSelectDate}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
