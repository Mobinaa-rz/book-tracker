-- Book Tracker database schema (SQLite)
-- Timestamps are stored as ISO-8601 UTC strings, e.g. 2026-03-10T14:05:00.000Z

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT    NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS books (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT    NOT NULL,
  author     TEXT    NOT NULL,
  status     TEXT    NOT NULL DEFAULT 'want_to_read'
             CHECK (status IN ('want_to_read', 'reading', 'finished')),
  rating     INTEGER CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  notes      TEXT    NOT NULL DEFAULT '',
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Every book query is scoped by user, so this index matters most.
CREATE INDEX IF NOT EXISTS idx_books_user_id ON books(user_id);
