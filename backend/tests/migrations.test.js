/**
 * The migration path.
 *
 * `schema.sql` uses CREATE TABLE IF NOT EXISTS, so on its own it can never add
 * a column to a database that already exists. These tests cover the gap that
 * would otherwise only show up on a developer's own machine: an old database
 * file must be upgraded in place, keep its data, and end up shaped exactly like
 * a brand-new one.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../src/db/index.js';
import { MIGRATIONS, runMigrations } from '../src/db/migrations.js';

/** The `books` table exactly as it looked before the calendar existed. */
const SCHEMA_BEFORE_CALENDAR = `
  CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
  CREATE TABLE books (
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
  CREATE INDEX idx_books_user_id ON books(user_id);
`;

const bookColumns = (db) => db.prepare('PRAGMA table_info(books)').all().map((row) => row.name);

/** Creates a database file that predates the calendar, with a row in it. */
function writeOldDatabase(dbPath) {
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA_BEFORE_CALENDAR);
  db.prepare("INSERT INTO users (username, email, password_hash) VALUES ('old', 'old@example.com', 'x')").run();
  db.prepare("INSERT INTO books (user_id, title, author, status, rating, notes) VALUES (1, 'Dune', 'Frank Herbert', 'finished', 5, 'kept')").run();
  db.close();
}

describe('migrations', () => {
  const open = [];
  const tempDirs = [];

  function openTemp(prepare) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'book-tracker-migration-'));
    tempDirs.push(dir);
    const dbPath = path.join(dir, 'books.db');
    if (prepare) prepare(dbPath);
    const db = openDatabase(dbPath);
    open.push(db);
    return db;
  }

  afterEach(() => {
    for (const db of open.splice(0)) db.close();
    for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
  });

  it('adds the calendar columns to a database that predates them', () => {
    const db = openTemp(writeOldDatabase);

    expect(bookColumns(db)).toContain('start_date');
    expect(bookColumns(db)).toContain('finished_date');
  });

  it('keeps the rows that were already there, with no dates', () => {
    const db = openTemp(writeOldDatabase);

    expect(db.prepare('SELECT title, rating, notes, start_date, finished_date FROM books').get()).toEqual({
      title: 'Dune',
      rating: 5,
      notes: 'kept',
      start_date: null,
      finished_date: null,
    });
  });

  it('lets the upgraded database store dates, and still rejects junk', () => {
    const db = openTemp(writeOldDatabase);

    db.prepare('UPDATE books SET start_date = ?, finished_date = ? WHERE id = 1').run(
      '2026-01-04',
      '2026-02-19',
    );
    expect(db.prepare('SELECT start_date, finished_date FROM books WHERE id = 1').get()).toEqual({
      start_date: '2026-01-04',
      finished_date: '2026-02-19',
    });

    // The CHECK constraint travels with the column, so a migrated database
    // enforces exactly what a fresh one does.
    expect(() => db.prepare('UPDATE books SET start_date = ? WHERE id = 1').run('not-a-date')).toThrow(
      /CHECK constraint failed/,
    );
  });

  it('produces the same column order as a brand-new database', () => {
    const migrated = openTemp(writeOldDatabase);
    const fresh = openDatabase(':memory:');
    open.push(fresh);

    // schema.sql lists the date columns last because ALTER TABLE appends, so
    // these two agree and `PRAGMA table_info` means the same thing everywhere.
    expect(bookColumns(migrated)).toEqual(bookColumns(fresh));
  });

  it('is a no-op on a brand-new database, and safe to run twice', () => {
    const fresh = openDatabase(':memory:');
    open.push(fresh);
    expect(runMigrations(fresh)).toEqual([]);

    const db = openTemp(writeOldDatabase);
    const first = bookColumns(db);

    // Re-opening (as every server start does) must not change anything.
    expect(runMigrations(db)).toEqual([]);
    expect(bookColumns(db)).toEqual(first);
  });

  it('keeps migration names unique, so a shipped one is never silently re-run', () => {
    const names = MIGRATIONS.map((migration) => migration.name);

    expect(new Set(names).size).toBe(names.length);
    expect(names).toEqual(['001-book-calendar-dates']);
  });
});
