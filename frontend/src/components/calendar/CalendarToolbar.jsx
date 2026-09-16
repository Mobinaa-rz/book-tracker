import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { monthLabel } from '../../lib/calendar.js';

/**
 * Month navigation for the calendar: the month being viewed, a way back to the
 * current month, and previous / next.
 *
 * The month name lives in a polite live region so changing month is announced
 * rather than happening silently for a screen-reader user.
 */
export function CalendarToolbar({ year, month, onPrevious, onNext, onToday, isCurrentMonth, busy }) {
  return (
    <div className="calendar-toolbar">
      <p className="calendar-toolbar__month" aria-live="polite">
        {monthLabel(year, month)}
      </p>

      <div className="calendar-toolbar__actions">
        <Button variant="secondary" size="sm" onClick={onToday} disabled={isCurrentMonth || busy}>
          Today
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={ChevronLeft}
          iconOnly
          onClick={onPrevious}
          disabled={busy}
          aria-label="Previous month"
        />
        <Button
          variant="secondary"
          size="sm"
          icon={ChevronRight}
          iconOnly
          onClick={onNext}
          disabled={busy}
          aria-label="Next month"
        />
      </div>
    </div>
  );
}
