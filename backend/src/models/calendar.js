/**
 * Data access for the calendar view.
 *
 * SECURITY: the same rule as models/books.js - every query takes a `userId` and
 * filters by `user_id`, so one reader's history can never appear on another
 * reader's calendar.
 *
 * SHAPE: this returns *events*, not books. A book with both dates contributes
 * two events (one `started`, one `finished`); a book with no dates contributes
 * nothing and simply never shows up. Flattening here rather than in the
 * browser keeps the API contract stable for anything else that later feeds the
 * calendar - a reading log, say, is just more rows with the same shape.
 *
 * Both branches of the UNION are ordered together so a day reads chronologically
 * and, within a day, "started" comes before "finished".
 */

/** The kinds of calendar event a book can produce. */
export const EVENT_KINDS = ['started', 'finished'];

export function createCalendarModel(db) {
  const selectEvents = db.prepare(`
    SELECT start_date AS date, 'started' AS kind, 0 AS kind_order,
           id, title, author, status, rating
      FROM books
     WHERE user_id = @userId
       AND start_date IS NOT NULL
       AND start_date BETWEEN @from AND @to

    UNION ALL

    SELECT finished_date AS date, 'finished' AS kind, 1 AS kind_order,
           id, title, author, status, rating
      FROM books
     WHERE user_id = @userId
       AND finished_date IS NOT NULL
       AND finished_date BETWEEN @from AND @to

    ORDER BY date ASC, kind_order ASC, title COLLATE NOCASE ASC
  `);

  return {
    /**
     * Every calendar event for one user between `from` and `to`, inclusive.
     * 'YYYY-MM-DD' strings compare chronologically, so BETWEEN on text is exact
     * and needs no date parsing.
     */
    range(userId, from, to) {
      const rows = selectEvents.all({ userId, from, to });

      const events = rows.map((row) => ({
        date: row.date,
        kind: row.kind,
        book: {
          id: row.id,
          title: row.title,
          author: row.author,
          status: row.status,
          rating: row.rating,
        },
      }));

      // Counted from the rows already in memory: the range is bounded by the
      // validator, so this is cheaper than a second query.
      const summary = { started: 0, finished: 0, total: events.length };
      for (const event of events) summary[event.kind] += 1;

      return { from, to, events, summary };
    },
  };
}
