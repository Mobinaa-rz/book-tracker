import { Skeleton } from '../ui/Skeleton.jsx';
import { WEEKDAY_LABELS } from '../../lib/calendar.js';

/**
 * Grid-shaped loading placeholder: the same 7 x 6 shape as the real calendar,
 * so the page holds its height while data arrives instead of jumping.
 */
export function CalendarSkeleton() {
  return (
    <div className="card calendar-skeleton" aria-hidden="true">
      <div className="calendar-skeleton__weekdays">
        {WEEKDAY_LABELS.map((weekday) => (
          <Skeleton key={weekday.long} width="2rem" height="0.75rem" />
        ))}
      </div>
      <div className="calendar-skeleton__days">
        {Array.from({ length: 42 }, (_, index) => (
          <Skeleton key={index} className="calendar-skeleton__day" />
        ))}
      </div>
    </div>
  );
}
