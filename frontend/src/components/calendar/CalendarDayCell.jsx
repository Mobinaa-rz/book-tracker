import { Link } from 'react-router-dom';
import { EVENT_KINDS, MAX_EVENTS_PER_DAY_CELL, dayLabel } from '../../lib/calendar.js';

/**
 * One day of the month grid.
 *
 * The day number is a button that selects the day (shown in the side panel);
 * the events below it are links straight to the book, so a full month can be
 * browsed without ever opening the panel. Both are keyboard reachable, and the
 * day button carries the whole date as its accessible name - a bare "12" is
 * useless once focus leaves the row of weekday headings.
 *
 * Days from the neighbouring months are rendered to keep the grid rectangular,
 * but are dimmed and inert: they belong to another month's view, reachable with
 * previous / next.
 */
export function CalendarDayCell({ day, events, selected, onSelect }) {
  const classes = [
    'calendar-day',
    !day.inMonth && 'calendar-day--outside',
    day.isWeekend && day.inMonth && 'calendar-day--weekend',
    day.isToday && 'calendar-day--today',
    selected && 'calendar-day--selected',
  ]
    .filter(Boolean)
    .join(' ');

  if (!day.inMonth) {
    return (
      <td className={classes}>
        <span className="calendar-day__number calendar-day__number--outside">{day.day}</span>
      </td>
    );
  }

  const shown = events.slice(0, MAX_EVENTS_PER_DAY_CELL);
  const hidden = events.length - shown.length;
  const count = events.length;
  // The whole date, not a bare "12": once focus moves off the weekday heading
  // row, a number on its own says nothing. "today" is part of the name too, so
  // the day is identified without relying on its ring or the visible flag.
  const label = [
    day.isToday ? 'Today' : null,
    dayLabel(day.key),
    count ? `${count} ${count === 1 ? 'event' : 'events'}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <td className={classes}>
      <div className="calendar-day__head">
        <button
          type="button"
          className="calendar-day__number"
          data-date={day.key}
          aria-label={label}
          aria-pressed={selected}
          onClick={() => onSelect(day.key)}
        >
          {day.day}
        </button>
        {day.isToday && <span className="calendar-day__today-flag">Today</span>}
      </div>

      {shown.length > 0 && (
        <ul className="calendar-day__events">
          {shown.map((event) => {
            const kind = EVENT_KINDS[event.kind];
            return (
              <li key={`${event.kind}-${event.book.id}`}>
                <Link
                  to={`/books/${event.book.id}`}
                  className={`calendar-event calendar-event--${kind.status}`}
                  title={`${kind.label}: ${event.book.title}`}
                  aria-label={`${kind.label} ${event.book.title}`}
                >
                  <span className="calendar-event__dot" aria-hidden="true" />
                  <span className="calendar-event__title">{event.book.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {hidden > 0 && (
        <button type="button" className="calendar-day__more" onClick={() => onSelect(day.key)}>
          +{hidden} more
        </button>
      )}
    </td>
  );
}
