import { Link } from 'react-router-dom';
import { CalendarDays, Plus } from 'lucide-react';
import { EVENT_KINDS, dayLabel } from '../../lib/calendar.js';
import { Button, EmptyState, StarRating } from '../ui/index.js';
import { BookCover } from '../books/BookCover.jsx';

/** "Started" / "Finished" pill. Reuses the status badge colours, with a word
 *  beside the colour so the meaning never depends on sight alone. */
export function EventKindBadge({ kind }) {
  const meta = EVENT_KINDS[kind];
  return (
    <span className={`badge badge--${meta.status}`}>
      <span className="badge__dot" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

/**
 * The side panel: everything that happened on the selected day.
 *
 * Three states, following the rest of the app - no day chosen yet, a day with
 * nothing on it (with a next step), and a day with events to open.
 */
export function CalendarEventList({ date, events }) {
  return (
    <section className="card calendar-panel" aria-labelledby="calendar-panel-heading">
      <h2 id="calendar-panel-heading" className="calendar-panel__title">
        {date ? dayLabel(date) : 'Choose a day'}
      </h2>

      {!date ? (
        <p className="calendar-panel__hint">
          Select a date in the calendar to see what you started or finished that day.
        </p>
      ) : events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nothing on this day"
          description="Dates appear here when you set a book to Reading or Finished, or when you fill them in yourself."
          actions={
            <Button variant="secondary" to="/books/new" icon={Plus}>
              Add a book
            </Button>
          }
        />
      ) : (
        <ul className="calendar-panel__list">
          {events.map((event) => (
            <li key={`${event.kind}-${event.book.id}`}>
              <Link
                to={`/books/${event.book.id}`}
                className="calendar-panel__item"
                aria-label={`${EVENT_KINDS[event.kind].label} ${event.book.title} by ${event.book.author}`}
              >
                <BookCover title={event.book.title} size="sm" />
                <span className="calendar-panel__info">
                  <span className="calendar-panel__book-title">{event.book.title}</span>
                  <span className="calendar-panel__author">by {event.book.author}</span>
                </span>
                <span className="calendar-panel__meta">
                  <EventKindBadge kind={event.kind} />
                  {event.book.rating ? <StarRating value={event.book.rating} showValue={false} /> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
