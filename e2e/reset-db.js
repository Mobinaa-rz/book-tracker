/**
 * Wipes the e2e database so every `npm run test:e2e` starts from an empty,
 * predictable library.
 *
 * Run before Playwright starts the web servers - the backend opens the database
 * file on boot, so deleting it afterwards would have no effect.
 */
import fs from 'node:fs';
import { E2E_DB_PATH } from './paths.js';

// SQLite in WAL mode leaves -wal and -shm files behind next to the database.
const targets = [E2E_DB_PATH, `${E2E_DB_PATH}-wal`, `${E2E_DB_PATH}-shm`, `${E2E_DB_PATH}-journal`];

let removed = 0;
for (const target of targets) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { force: true });
    removed += 1;
  }
}

const label = removed === 0 ? 'already clean' : `removed ${removed} file(s)`;
console.log(`[e2e] database reset (${label}): ${E2E_DB_PATH}`);
