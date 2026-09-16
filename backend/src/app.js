import express from 'express';
import cookieParser from 'cookie-parser';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './db/index.js';
import { createUserModel } from './models/users.js';
import { createBookModel } from './models/books.js';
import { createCalendarModel } from './models/calendar.js';
import { createRequireAuth } from './middleware/requireAuth.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { createBooksRouter } from './routes/books.routes.js';
import { createCalendarRouter } from './routes/calendar.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Builds the Express application.
 * Kept separate from server.js so tests can create an app with an
 * in-memory database without opening a network port.
 */
export function createApp({ dbPath } = {}) {
  const db = openDatabase(dbPath);
  const users = createUserModel(db);
  const books = createBookModel(db);
  const calendar = createCalendarModel(db);
  const requireAuth = createRequireAuth(users);

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  // API routes
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', createAuthRouter({ users, requireAuth }));
  app.use('/api/books', createBooksRouter({ books, requireAuth }));
  app.use('/api/calendar', createCalendarRouter({ calendar, requireAuth }));
  app.use('/api', notFound);

  // In production, serve the built frontend (frontend/dist) if it exists.
  const distDir = path.resolve(__dirname, '../../frontend/dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    // Let the React router handle any other page URL.
    app.get('/{*path}', (req, res) => res.sendFile(path.join(distDir, 'index.html')));
  }

  app.use(errorHandler);

  app.db = db; // exposed so tests can close it
  return app;
}
