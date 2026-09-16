-- Book Tracker database schema (SQLite)
-- Timestamps are stored as ISO-8601 UTC strings, e.g. 2026-03-10T14:05:00.000Z
--
-- Calendar dates (start_date / finished_date) are stored as date-only
-- 'YYYY-MM-DD' strings - no time and no timezone - so "finished on 12 March"
-- can never shift onto 11 March for a reader in another timezone. The GLOB
-- CHECK keeps that format honest even for a write that bypasses the API, and
-- it makes BETWEEN comparisons on these columns plain (and correct) text
-- comparisons.
--
-- The two date columns are listed last on purpose: ALTER TABLE ADD COLUMN
-- always appends, so a database upgraded by migrations.js ends up with exactly
-- the column order below. Fresh and migrated databases therefore agree, and
-- `PRAGMA table_info(books)` means the same thing everywhere.

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT    NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS books (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT    NOT NULL,
  author        TEXT    NOT NULL,
  status        TEXT    NOT NULL DEFAULT 'want_to_read'
                CHECK (status IN ('want_to_read', 'reading', 'finished')),
  rating        INTEGER CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  notes         TEXT    NOT NULL DEFAULT '',
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  start_date    TEXT    CHECK (start_date    IS NULL OR start_date    GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  finished_date TEXT    CHECK (finished_date IS NULL OR finished_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);

-- Every book query is scoped by user, so this index matters most.
-- The calendar range query also filters by user_id first, which this covers;
-- the date columns then narrow one user's (small) set of rows.
CREATE INDEX IF NOT EXISTS idx_books_user_id ON books(user_id);
