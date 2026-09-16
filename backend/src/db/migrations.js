/**
 * Small, idempotent migrations.
 *
 * WHY THIS EXISTS: `schema.sql` uses `CREATE TABLE IF NOT EXISTS`, so it
 * creates missing tables but never reshapes one that already exists. A database
 * file created before a column was added would keep its old shape forever.
 * That is invisible in tests (they use `:memory:`) and in e2e (`reset-db.js`
 * wipes `backend/data/e2e.db`), so it only ever bites a real local database -
 * which is exactly the kind of bug worth preventing up front.
 *
 * HOW IT WORKS: `openDatabase()` applies `schema.sql`, then runs every
 * migration below. Each migration inspects the database and adds only what is
 * missing, so the whole set is safe to run on every start-up against a
 * brand-new, a partially upgraded or a fully upgraded database.
 *
 * RULES FOR ADDING ONE:
 *   - append a new entry to MIGRATIONS;
 *   - never edit or delete a migration that has shipped - a database that
 *     already ran it must keep working;
 *   - make it check its own precondition, so re-running it is a no-op;
 *   - if it adds a column, put that column last in `schema.sql` too, so a fresh
 *     database and a migrated one end up with the same column order.
 */

/** The columns `table` currently has. */
function columnsOf(db, table) {
  return new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name));
}

/**
 * The CHECK constraint both calendar date columns carry. It must match
 * `schema.sql` exactly, so a database built from scratch and one upgraded here
 * enforce the same 'YYYY-MM-DD' rule.
 */
const DATE_GLOB = "GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'";

/** Calendar dates appended last, mirroring their position in `schema.sql`. */
const BOOK_DATE_COLUMNS = ['start_date', 'finished_date'];

const MIGRATIONS = [
  {
    name: '001-book-calendar-dates',
    /** Adds the two calendar date columns. Returns what it actually changed. */
    run(db) {
      const existing = columnsOf(db, 'books');
      const applied = [];

      for (const column of BOOK_DATE_COLUMNS) {
        if (existing.has(column)) continue;
        db.exec(
          `ALTER TABLE books ADD COLUMN ${column} TEXT
             CHECK (${column} IS NULL OR ${column} ${DATE_GLOB})`,
        );
        applied.push(`books.${column}`);
      }

      return applied;
    },
  },
];

/**
 * Applies every migration that has work left to do.
 * Returns the names of the migrations that changed something, so the caller can
 * log an upgrade instead of it happening silently.
 */
export function runMigrations(db) {
  const applied = [];

  for (const migration of MIGRATIONS) {
    // Each migration re-reads the schema itself, so they stay independent, and
    // runs in its own transaction so a multi-statement migration can never
    // leave the database half-upgraded.
    const changes = db.transaction(() => migration.run(db))();
    if (changes.length > 0) applied.push(`${migration.name} (${changes.join(', ')})`);
  }

  return applied;
}

export { MIGRATIONS };
