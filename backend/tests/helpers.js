import request from 'supertest';
import { createApp } from '../src/app.js';

/** Creates a fresh app backed by a brand-new in-memory database. */
export function createTestApp() {
  return createApp({ dbPath: ':memory:' });
}

let counter = 0;

/**
 * Registers a new user and returns a supertest agent that keeps the session
 * cookie, so following requests are authenticated as that user.
 */
export async function registerUser(app, overrides = {}) {
  counter += 1;
  const data = {
    username: `user${counter}`,
    email: `user${counter}@example.com`,
    password: 'password123',
    ...overrides,
  };
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send(data);
  if (res.status !== 201) {
    throw new Error(`Registration failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { agent, user: res.body.user, credentials: data };
}

export const sampleBook = {
  title: 'Dune',
  author: 'Frank Herbert',
  status: 'reading',
  rating: 4,
  notes: 'Slow start, great world-building.',
};

/** Creates a book for the given authenticated agent and returns it. */
export async function createBook(agent, overrides = {}) {
  const res = await agent.post('/api/books').send({ ...sampleBook, ...overrides });
  if (res.status !== 201) {
    throw new Error(`Creating book failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.book;
}
