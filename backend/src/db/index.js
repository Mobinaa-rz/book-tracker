import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, 'schema.sql');

/**
 * Opens (or creates) the SQLite database, enables foreign keys and applies
 * the schema. Called once when the app starts; tests call it with ':memory:'.
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
  return db;
}
