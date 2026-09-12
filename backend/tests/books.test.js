import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createBook, createTestApp, registerUser, sampleBook } from './helpers.js';

let app;

beforeEach(() => {
  app = createTestApp();
});

afterEach(() => {
  app.db.close();
});

describe('authentication protection', () => {
  it('rejects every books endpoint without a session', async () => {
    const anonymous = request(app);
    const responses = await Promise.all([
      anonymous.get('/api/books'),
      anonymous.get('/api/books/stats'),
      anonymous.post('/api/books').send(sampleBook),
      anonymous.get('/api/books/1'),
      anonymous.put('/api/books/1').send(sampleBook),
      anonymous.delete('/api/books/1'),
    ]);

    for (const res of responses) {
      expect(res.status).toBe(401);
      expect(res.body.error).toBeTypeOf('string');
    }
  });
});

describe('POST /api/books', () => {
  it('creates a book owned by the current user', async () => {
    const { agent, user } = await registerUser(app);
    const res = await agent.post('/api/books').send(sampleBook);

    expect(res.status).toBe(201);
    expect(res.body.book).toMatchObject({ ...sampleBook, user_id: user.id });
    expect(res.body.book.id).toBeTypeOf('number');
    expect(res.body.book.created_at).toBeTypeOf('string');
    expect(res.body.book.updated_at).toBeTypeOf('string');
  });

  it('applies defaults: status want_to_read, no rating, empty notes', async () => {
    const { agent } = await registerUser(app);
    const res = await agent.post('/api/books').send({ title: '  Piranesi ', author: 'Susanna Clarke' });

    expect(res.status).toBe(201);
    expect(res.body.book).toMatchObject({
      title: 'Piranesi', // trimmed
      author: 'Susanna Clarke',
      status: 'want_to_read',
      rating: null,
      notes: '',
    });
  });

  it('rejects missing title and author', async () => {
    const { agent } = await registerUser(app);
    const res = await agent.post('/api/books').send({ title: '', notes: 'x' });

    expect(res.status).toBe(400);
    expect(res.body.details).toHaveProperty('title');
    expect(res.body.details).toHaveProperty('author');
  });

  it('rejects an invalid status and an out-of-range rating', async () => {
    const { agent } = await registerUser(app);
    const res = await agent
      .post('/api/books')
      .send({ title: 'X', author: 'Y', status: 'abandoned', rating: 6 });

    expect(res.status).toBe(400);
    expect(res.body.details).toHaveProperty('status');
    expect(res.body.details).toHaveProperty('rating');
  });

  it('rejects a non-integer rating', async () => {
    const { agent } = await registerUser(app);
    const res = await agent.post('/api/books').send({ title: 'X', author: 'Y', rating: 3.5 });
    expect(res.status).toBe(400);
    expect(res.body.details).toHaveProperty('rating');
  });
});

describe('GET /api/books', () => {
  it('returns only the current user\'s books, newest first', async () => {
    const alice = await registerUser(app);
    const bob = await registerUser(app);

    const first = await createBook(alice.agent, { title: 'First' });
    const second = await createBook(alice.agent, { title: 'Second' });
    await createBook(bob.agent, { title: 'Bob\'s book' });

    const res = await alice.agent.get('/api/books');

    expect(res.status).toBe(200);
    expect(res.body.books.map((b) => b.id)).toEqual([second.id, first.id]);
    expect(res.body.books.every((b) => b.user_id === alice.user.id)).toBe(true);
  });

  it('returns an empty list for a new user', async () => {
    const { agent } = await registerUser(app);
    const res = await agent.get('/api/books');
    expect(res.status).toBe(200);
    expect(res.body.books).toEqual([]);
  });
});

describe('GET /api/books (search & filter)', () => {
  async function seed() {
    const { agent } = await registerUser(app);
    await createBook(agent, { title: 'Dune', author: 'Frank Herbert', status: 'finished' });
    await createBook(agent, { title: 'The Hobbit', author: 'J.R.R. Tolkien', status: 'reading' });
    await createBook(agent, { title: 'The Silmarillion', author: 'J.R.R. Tolkien', status: 'want_to_read' });
    await createBook(agent, { title: 'Piranesi', author: 'Susanna Clarke', status: 'want_to_read' });
    return agent;
  }

  it('searches by title (case-insensitive, partial)', async () => {
    const agent = await seed();
    const res = await agent.get('/api/books').query({ search: 'hobb' });
    expect(res.body.books.map((b) => b.title)).toEqual(['The Hobbit']);
  });

  it('searches by author', async () => {
    const agent = await seed();
    const res = await agent.get('/api/books').query({ search: 'tolkien' });
    expect(res.body.books.map((b) => b.title).sort()).toEqual(['The Hobbit', 'The Silmarillion']);
  });

  it('filters by status', async () => {
    const agent = await seed();
    const res = await agent.get('/api/books').query({ status: 'want_to_read' });
    expect(res.body.books.map((b) => b.title).sort()).toEqual(['Piranesi', 'The Silmarillion']);
  });

  it('combines search and status filter', async () => {
    const agent = await seed();
    const res = await agent.get('/api/books').query({ search: 'tolkien', status: 'reading' });
    expect(res.body.books.map((b) => b.title)).toEqual(['The Hobbit']);
  });

  it('treats LIKE wildcards in the search text literally', async () => {
    const agent = await seed();
    const res = await agent.get('/api/books').query({ search: '%' });
    expect(res.body.books).toEqual([]);
  });

  it('rejects an unknown status with 400', async () => {
    const agent = await seed();
    const res = await agent.get('/api/books').query({ status: 'abandoned' });
    expect(res.status).toBe(400);
    expect(res.body.details).toHaveProperty('status');
  });

  it('never returns another user\'s books through search', async () => {
    await seed();
    const other = await registerUser(app);
    const res = await other.agent.get('/api/books').query({ search: 'dune' });
    expect(res.body.books).toEqual([]);
  });
});

describe('GET /api/books/:id', () => {
  it('returns the book', async () => {
    const { agent } = await registerUser(app);
    const book = await createBook(agent);

    const res = await agent.get(`/api/books/${book.id}`);
    expect(res.status).toBe(200);
    expect(res.body.book).toEqual(book);
  });

  it('returns 404 for a missing or malformed id', async () => {
    const { agent } = await registerUser(app);
    expect((await agent.get('/api/books/9999')).status).toBe(404);
    expect((await agent.get('/api/books/abc')).status).toBe(404);
  });
});

describe('PUT /api/books/:id', () => {
  it('updates the book and bumps updated_at', async () => {
    const { agent } = await registerUser(app);
    const book = await createBook(agent);

    // Make sure the clock moves so updated_at can differ.
    await new Promise((resolve) => setTimeout(resolve, 5));

    const res = await agent.put(`/api/books/${book.id}`).send({
      title: 'Dune Messiah',
      author: 'Frank Herbert',
      status: 'finished',
      rating: 5,
      notes: 'Done!',
    });

    expect(res.status).toBe(200);
    expect(res.body.book).toMatchObject({
      id: book.id,
      title: 'Dune Messiah',
      status: 'finished',
      rating: 5,
      notes: 'Done!',
      created_at: book.created_at,
    });
    expect(res.body.book.updated_at > book.updated_at).toBe(true);

    const fetched = await agent.get(`/api/books/${book.id}`);
    expect(fetched.body.book.title).toBe('Dune Messiah');
  });

  it('allows clearing the rating', async () => {
    const { agent } = await registerUser(app);
    const book = await createBook(agent, { rating: 3 });
    const res = await agent.put(`/api/books/${book.id}`).send({ ...sampleBook, rating: null });
    expect(res.status).toBe(200);
    expect(res.body.book.rating).toBeNull();
  });

  it('validates the update', async () => {
    const { agent } = await registerUser(app);
    const book = await createBook(agent);
    const res = await agent.put(`/api/books/${book.id}`).send({ ...sampleBook, title: '' });
    expect(res.status).toBe(400);
    expect(res.body.details).toHaveProperty('title');
  });

  it('returns 404 for a missing book', async () => {
    const { agent } = await registerUser(app);
    const res = await agent.put('/api/books/9999').send(sampleBook);
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/books/:id', () => {
  it('deletes the book', async () => {
    const { agent } = await registerUser(app);
    const book = await createBook(agent);

    expect((await agent.delete(`/api/books/${book.id}`)).status).toBe(204);
    expect((await agent.get(`/api/books/${book.id}`)).status).toBe(404);
    expect((await agent.get('/api/books')).body.books).toEqual([]);
  });

  it('returns 404 for a missing book', async () => {
    const { agent } = await registerUser(app);
    expect((await agent.delete('/api/books/9999')).status).toBe(404);
  });
});

describe('ownership: users cannot touch each other\'s books', () => {
  it('another user gets 404 on GET, PUT and DELETE and the book is untouched', async () => {
    const alice = await registerUser(app);
    const bob = await registerUser(app);
    const book = await createBook(alice.agent);

    expect((await bob.agent.get(`/api/books/${book.id}`)).status).toBe(404);
    expect(
      (await bob.agent.put(`/api/books/${book.id}`).send({ ...sampleBook, title: 'Hacked' })).status,
    ).toBe(404);
    expect((await bob.agent.delete(`/api/books/${book.id}`)).status).toBe(404);

    // Alice's book is unchanged and still there.
    const res = await alice.agent.get(`/api/books/${book.id}`);
    expect(res.status).toBe(200);
    expect(res.body.book).toEqual(book);
  });

  it('a user cannot create a book on behalf of someone else', async () => {
    const alice = await registerUser(app);
    const bob = await registerUser(app);

    // Even if the client sends a user_id, it is ignored.
    const res = await bob.agent.post('/api/books').send({ ...sampleBook, user_id: alice.user.id });
    expect(res.status).toBe(201);
    expect(res.body.book.user_id).toBe(bob.user.id);
    expect((await alice.agent.get('/api/books')).body.books).toEqual([]);
  });
});

describe('GET /api/books/stats', () => {
  it('returns zeros and an empty recent list for a new user', async () => {
    const { agent } = await registerUser(app);
    const res = await agent.get('/api/books/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ total: 0, wantToRead: 0, reading: 0, finished: 0, recent: [] });
  });

  it('counts books per status and lists the 5 most recent, only for this user', async () => {
    const alice = await registerUser(app);
    const bob = await registerUser(app);

    const statuses = ['want_to_read', 'reading', 'finished', 'finished', 'want_to_read', 'finished'];
    const created = [];
    for (const [i, status] of statuses.entries()) {
      created.push(await createBook(alice.agent, { title: `Book ${i + 1}`, status }));
    }
    await createBook(bob.agent, { status: 'finished' });

    const res = await alice.agent.get('/api/books/stats');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 6, wantToRead: 2, reading: 1, finished: 3 });
    expect(res.body.recent).toHaveLength(5);
    expect(res.body.recent.map((b) => b.title)).toEqual(
      ['Book 6', 'Book 5', 'Book 4', 'Book 3', 'Book 2'],
    );
    expect(res.body.recent.every((b) => b.user_id === alice.user.id)).toBe(true);
  });
});
