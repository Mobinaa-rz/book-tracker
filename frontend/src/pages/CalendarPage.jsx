import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { calendarApi } from '../api/calendar.js';
import { useApi } from '../lib/useApi.js';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import { pluralize } from '../lib/format.js';
import {
  addMonths,
  buildMonthGrid,
  groupEventsByDay,
  isSameMonth,
  isValidKey,
  monthKey,
  monthLabel,
  monthOfKey,
  monthRange,
  parseMonthKey,
  todayKey,
} from '../lib/calendar.js';
import { Alert, Button, PageHeader } from '../components/ui/index.js';
import { CalendarToolbar } from '../components/calendar/CalendarToolbar.jsx';
import { CalendarMonthGrid } from '../components/calendar/CalendarMonthGrid.jsx';
import { CalendarEventList } from '../components/calendar/CalendarEventList.jsx';
import { CalendarLegend } from '../components/calendar/CalendarLegend.jsx';
import { CalendarSkeleton } from '../components/calendar/CalendarSkeleton.jsx';

export function CalendarPage() {
  useDocumentTitle('Calendar');
  const [searchParams, setSearchParams] = useSearchParams();

  const today = todayKey();
  const currentMonth = monthOfKey(today);

  // The month and the chosen day both live in the URL, so a calendar view can be
  // linked to, refreshed and stepped back through - the same rule My Books
  // follows for search and status. Anything unparseable falls back to today's
  // month rather than erroring: a bad ?month= is not worth a broken page.
  const { year, month } = parseMonthKey(searchParams.get('month') ?? '') ?? currentMonth;
  const viewingCurrentMonth = isSameMonth({ year, month }, currentMonth);

  const requestedDay = searchParams.get('day') ?? '';
  const dayIsInThisMonth =
    isValidKey(requestedDay) && isSameMonth(monthOfKey(requestedDay), { year, month });
  // With no day chosen, today is the natural focus - but only in a month that
  // contains it, so opening March does not silently highlight a day in September.
  const selectedDate = dayIsInThisMonth ? requestedDay : viewingCurrentMonth ? today : null;

  // The API is asked for exactly this month, so its summary describes precisely
  // what the grid shows and no client-side re-counting is needed.
  const { from, to } = monthRange(year, month);
  const { data, error, loading, refreshing, retry } = useApi(() => calendarApi.range({ from, to }), [
    from,
    to,
  ]);

  const events = data?.events ?? [];
  const summary = data?.summary;
  const label = monthLabel(year, month);
  const eventsByDay = useMemo(() => groupEventsByDay(events), [events]);
  const weeks = useMemo(() => buildMonthGrid(year, month, today), [year, month, today]);

  function updateParams(changes) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setSearchParams(next, { replace: true });
  }

  function goToMonth(target) {
    // The current month needs no ?month= at all, so "Today" returns to a clean
    // URL. The chosen day is dropped because it belongs to the month we left.
    updateParams({
      month: isSameMonth(target, currentMonth) ? '' : monthKey(target.year, target.month),
      day: '',
    });
  }

  const subtitle = !summary
    ? 'When you started and finished your books.'
    : summary.total === 0
      ? `Nothing logged in ${label} yet.`
      : `${pluralize(summary.started, 'book')} started and ${pluralize(summary.finished, 'book')} finished`;

  return (
    <>
      <PageHeader
        title="Calendar"
        subtitle={subtitle}
        actions={
          <Button to="/books/new" icon={Plus}>
            Add book
          </Button>
        }
      />

      <CalendarToolbar
        year={year}
        month={month}
        onPrevious={() => goToMonth(addMonths(year, month, -1))}
        onNext={() => goToMonth(addMonths(year, month, 1))}
        onToday={() => goToMonth(currentMonth)}
        isCurrentMonth={viewingCurrentMonth}
        busy={loading}
      />

      {error ? (
        <Alert type="error" onRetry={retry}>
          Couldn't load your calendar. {error.message}
        </Alert>
      ) : (
        <div className="calendar-layout">
          <div className="calendar-main">
            {loading ? (
              <div aria-busy="true" aria-label="Loading calendar">
                <CalendarSkeleton />
              </div>
            ) : (
              <div className={refreshing ? 'calendar-main--refreshing' : undefined}>
                <CalendarMonthGrid
                  weeks={weeks}
                  eventsByDay={eventsByDay}
                  selectedDate={selectedDate}
                  onSelectDate={(key) => updateParams({ day: key })}
                  label={label}
                />

                {summary?.total === 0 && (
                  <p className="calendar-hint">
                    Nothing in {label} yet. A date is filled in for you when you set a book to
                    Reading or Finished, and you can always set or clear one yourself on the book
                    itself.
                  </p>
                )}
              </div>
            )}
          </div>

          <aside className="calendar-side" aria-label="Selected day">
            <CalendarLegend />
            <CalendarEventList
              date={selectedDate}
              events={selectedDate ? (eventsByDay[selectedDate] ?? []) : []}
            />
          </aside>
        </div>
      )}
    </>
  );
}
