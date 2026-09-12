/**
 * Data access for the `books` table.
 *
 * SECURITY: every function takes a `userId` and every SQL statement filters
 * by `user_id`. A user can therefore never read, change or delete a book that
 * belongs to somebody else - such books simply do not exist from their point
 * of view (the API returns 404).
 */
const COLUMNS = 'id, user_id, title, author, status, rating, notes, created_at, updated_at';

export function createBookModel(db) {
  const selectOne = db.prepare(`SELECT ${COLUMNS} FROM books WHERE id = ? AND user_id = ?`);

  const insert = db.prepare(`
    INSERT INTO books (user_id, title, author, status, rating, notes)
    VALUES (@userId, @title, @author, @status, @rating, @notes)
  `);

  const update = db.prepare(`
    UPDATE books
       SET title = @title,
           author = @author,
           status = @status,
           rating = @rating,
           notes = @notes,
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
      const info = insert.run({ userId, ...data });
      return selectOne.get(info.lastInsertRowid, userId);
    },

    /** Returns the updated book, or null if it does not exist for this user. */
    update(userId, id, data) {
      const info = update.run({ id, userId, ...data });
      return info.changes === 0 ? null : selectOne.get(id, userId);
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
