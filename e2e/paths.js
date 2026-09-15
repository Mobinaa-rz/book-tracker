/**
 * Paths and ports shared by the Playwright config, the database reset script
 * and the specs. Keeping them in one place means the servers, the reset script
 * and the tests can never disagree about where the app lives.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Port the Express API listens on during e2e runs. */
export const BACKEND_PORT = Number(process.env.E2E_BACKEND_PORT || 4000);

/** Port the Vite dev server listens on during e2e runs. */
export const FRONTEND_PORT = Number(process.env.E2E_FRONTEND_PORT || 5173);

export const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;
export const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`;

/**
 * The e2e database. It is a real file (not `:memory:`) so that the backend and
 * any API calls made by the tests all see the same data, and it is wiped before
 * every run by `e2e/reset-db.mjs`. Lives under backend/data, which is already
 * git-ignored.
 */
export const E2E_DB_PATH = path.join(repoRoot, 'backend', 'data', 'e2e.db');

/** Relative to the backend's working directory, as the backend expects it. */
export const E2E_DB_PATH_RELATIVE = path.join('data', 'e2e.db');

/** Environment the backend is started with for e2e runs. */
export const backendEnv = {
  NODE_ENV: 'test', // faster bcrypt (4 rounds) - see backend/src/config.js
  PORT: String(BACKEND_PORT),
  DB_PATH: E2E_DB_PATH_RELATIVE,
  JWT_SECRET: 'e2e-only-secret',
};

/** Environment the Vite dev server is started with for e2e runs. */
export const frontendEnv = {
  VITE_API_TARGET: BACKEND_URL,
};
