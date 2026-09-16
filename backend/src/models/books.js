/**
 * Data access for the `books` table.
 *
 * SECURITY: every function takes a `userId` and every SQL statement filters
 * by `user_id`. A user can therefore never read, change or delete a book that
 * belongs to somebody else - such books simply do not exist from their point
 * of view (the API returns 404).
 *
 * CALENDAR DATES: `start_date` and `finished_date` are optional 'YYYY-MM-DD'
 * strings. When a book's status changes, the date that status implies is
 * filled in automatically - see `withStatusDates` below.
 */
import { todayKey } from '../utils/date.js';

// Column order matches schema.sql (and therefore a migrated database, where
// ALTER TABLE appends the two date columns at the end).
const COLUMNS =
  'id, user_id, title, author, status, rating, notes, created_at, updated_at, start_date, finished_date';

/**
 * Fills in the calendar date a status change implies, but only when the caller
 * did not supply one:
 *
 *   - becoming `reading`  -> started today
 *   - becoming `finished` -> finished today
 *
 * Deliberately conservative:
 *   - an explicit date from the client always wins, so the form stays in charge;
 *   - an existing date is never overwritten (a re-read keeps its history);
 *   - a date is never cleared here, so this rule cannot destroy user input;
 *   - a book added straight to `finished` gets a finished date but no invented
 *     start date - guessing one would put fiction into the calendar.
 *
 * `isTransition` is true when the status is actually changing, so editing the
 * notes of a book that has been `reading` for a month does not stamp today.
 */
function withStatusDates(data, isTransition, today = todayKey) {
  if (!isTransition) return data;

  if (data.status === 'reading' && data.start_date === null) {
    return { ...data, start_date: today() };
  }
  if (data.status === 'finished' && data.finished_date === null) {
    return { ...data, finished_date: today() };
  }
  return data;
}

/**
 * @param {object} db        better-sqlite3 handle
 * @param {object} [options]
 * @param {() => string} [options.today] overrides "today" (used by tests)
 */
export function createBookModel(db, { today = todayKey } = {}) {
  const selectOne = db.prepare(`SELECT ${COLUMNS} FROM books WHERE id = ? AND user_id = ?`);

  const insert = db.prepare(`
    INSERT INTO books (user_id, title, author, status, rating, notes, start_date, finished_date)
    VALUES (@userId, @title, @author, @status, @rating, @notes, @start_date, @finished_date)
  `);

  const update = db.prepare(`
    UPDATE books
       SET title = @title,
           author = @author,
           status = @status,
           rating = @rating,
           notes = @notes,
           start_date = @start_date,
           finished_date = @finished_date,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = @id AND user_id = @userId
  `);

  const remove = db.prepare('DELETE FROM books WHERE id = ? AND user_id = ?');

  const countByStatus = db.prepare(`
    SELECT status, COUNT(*) AS count FROM books WHERE user_id = ? GROUP BY status
  `);

  const selectRecent = db.prepare(`
    SELECT ${COLUMNS} FROM books WHERE user_id = ?
    ORDER BY created_at DESC, id DESC LIMIT ?
  `);

  return {
    /** Lists the user's books, optionally filtered by search text and status. */
    list(userId, { search, status } = {}) {
      const conditions = ['user_id = ?'];
      const params = [userId];

      if (search) {
        // Case-insensitive "contains" match on title OR author.
        // Escape LIKE wildcards so a literal % or _ in the search works.
        const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
        conditions.push("(title LIKE ? ESCAPE '\\' OR author LIKE ? ESCAPE '\\')");
        params.push(pattern, pattern);
      }
      if (status) {
        conditions.push('status = ?');
        params.push(status);
      }

      const sql = `SELECT ${COLUMNS} FROM books WHERE ${conditions.join(' AND ')}
                   ORDER BY created_at DESC, id DESC`;
      return db.prepare(sql).all(...params);
    },

    findById(userId, id) {
      return selectOne.get(id, userId) ?? null;
    },

    create(userId, data) {
      // A brand-new book has no previous status, so any status it is created
      // with counts as a transition into that status.
      const values = withStatusDates(data, true, today);
      const info = insert.run({ userId, ...values });
      return selectOne.get(info.lastInsertRowid, userId);
    },

    /** Returns the updated book, or null if it does not exist for this user. */
    update(userId, id, data) {
      // Read the current row first: the auto-stamp rule depends on whether the
      // status is actually changing, and it doubles as the ownership check.
      const existing = selectOne.get(id, userId);
      if (!existing) return null;

      const values = withStatusDates(data, data.status !== existing.status, today);
      update.run({ id, userId, ...values });
      return selectOne.get(id, userId);
    },

    /** Returns true if a book was deleted. */
    delete(userId, id) {
      return remove.run(id, userId).changes > 0;
    },

    /** Dashboard summary: counts per status plus the most recently added books. */
    stats(userId, recentLimit = 5) {
      const counts = { want_to_read: 0, reading: 0, finished: 0 };
      for (const row of countByStatus.all(userId)) counts[row.status] = row.count;

      return {
        total: counts.want_to_read + counts.reading + counts.finished,
        wantToRead: counts.want_to_read,
        reading: counts.reading,
        finished: counts.finished,
        recent: selectRecent.all(userId, recentLimit),
      };
    },
  };
}
