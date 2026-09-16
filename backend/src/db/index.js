import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';
import { runMigrations } from './migrations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, 'schema.sql');

/**
 * Opens (or creates) the SQLite database, enables foreign keys, applies the
 * schema and brings an existing file up to date with any migrations.
 * Called once when the app starts; tests call it with ':memory:'.
 */
export function openDatabase(dbPath = config.dbPath) {
  if (dbPath !== ':memory:') {
    // Make sure the folder for the database file exists (e.g. backend/data/).
    fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(fs.readFileSync(schemaPath, 'utf8'));

  // schema.sql only ever creates missing tables, so an existing database file
  // is upgraded here instead. A no-op for a fresh (or already upgraded) one.
  const upgraded = runMigrations(db);
  if (upgraded.length > 0) {
    console.log(`Database upgraded: ${upgraded.join('; ')}`);
  }

  return db;
}
