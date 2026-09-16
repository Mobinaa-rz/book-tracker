/**
 * The calendar: the /api/calendar endpoint, and the reading dates it is built
 * from (including the rule that fills a date in when a book's status changes).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createBook, createTestApp, registerUser } from './helpers.js';
import { todayKey } from '../src/utils/date.js';
import { MAX_RANGE_DAYS } from '../src/validators/calendar.schemas.js';

let app;

beforeEach(() => {
  app = createTestApp();
});

afterEach(() => {
  app.db.close();
});

/** GET /api/calendar as the signed-in user of `agent`. */
function getCalendar(agent, from, to) {
  const query = new URLSearchParams();
  if (from !== undefined) query.set('from', from);
  if (to !== undefined) query.set('to', to);
  return agent.get(`/api/calendar?${query}`);
}

describe('GET /api/calendar', () => {
  it('requires a session', async () => {
    const res = await request(app).get('/api/calendar?from=2026-09-01&to=2026-09-30');

    expect(res.status).toBe(401);
  });

  it('requires both bounds', async () => {
    const { agent } = await registerUser(app);

    const res = await getCalendar(agent);

    expect(res.status).toBe(400);
    expect(res.body.details).toHaveProperty('from');
    expect(res.body.details).toHaveProperty('to');
  });

  it.each([
    '2026/09/01', // slashes instead of dashes
    '01-09-2026', // day first
    '2026-9-1', // not zero-padded
    '2026-13-01', // month 13 does not exist
    '2026-02-30', // neither does 30 February
    '2026-09-01T00:00:00Z', // a timestamp, not a date
    'yesterday', // not a date at all
  ])(
    'rejects a malformed date (%s)',
    async (value) => {
      const { agent } = await registerUser(app);

      const res = await getCalendar(agent, value, value);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    },
  );

  it('rejects a range that ends before it starts', async () => {
    const { agent } = await registerUser(app);

    const res = await getCalendar(agent, '2026-09-30', '2026-09-01');

    expect(res.status).toBe(400);
    expect(res.body.details.to).toMatch(/on or after/);
  });

  it('rejects a range wider than the allowed maximum', async () => {
    const { agent } = await registerUser(app);

    const res = await getCalendar(agent, '2020-01-01', '2030-01-01');

    expect(res.status).toBe(400);
    expect(res.body.details.to).toMatch(/too wide/);
  });

  it('accepts the widest allowed range, and a single day', async () => {
    const { agent } = await registerUser(app);

    // Exactly MAX_RANGE_DAYS days inclusive.
    const widest = await getCalendar(agent, '2026-01-01', '2027-01-01');
    expect(widest.status).toBe(200);
    expect(MAX_RANGE_DAYS).toBe(366);

    const single = await getCalendar(agent, '2026-09-12', '2026-09-12');
    expect(single.status).toBe(200);
    expect(single.body.from).toBe('2026-09-12');
    expect(single.body.to).toBe('2026-09-12');
  });

  it('returns an empty calendar for a library with no dates', async () => {
    const { agent } = await registerUser(app);
    await createBook(agent, { title: 'Undated', status: 'want_to_read' });

    const res = await getCalendar(agent, '2026-09-01', '2026-09-30');

    expect(res.status).toBe(200);
    expect(res.body.events).toEqual([]);
    expect(res.body.summary).toEqual({ started: 0, finished: 0, total: 0 });
  });

  it('turns each date into an event, and skips books that have none', async () => {
    const { agent } = await registerUser(app);
    await createBook(agent, {
      title: 'Dune',
      author: 'Frank Herbert',
      status: 'finished',
      rating: 5,
      start_date: '2026-09-01',
      finished_date: '2026-09-14',
    });
    await createBook(agent, { title: 'Undated', status: 'want_to_read' });

    const res = await getCalendar(agent, '2026-09-01', '2026-09-30');

    expect(res.body.summary).toEqual({ started: 1, finished: 1, total: 2 });
    expect(res.body.events).toEqual([
      {
        date: '2026-09-01',
        kind: 'started',
        book: { id: 1, title: 'Dune', author: 'Frank Herbert', status: 'finished', rating: 5 },
      },
      {
        date: '2026-09-14',
        kind: 'finished',
        book: { id: 1, title: 'Dune', author: 'Frank Herbert', status: 'finished', rating: 5 },
      },
    ]);
  });

  it('includes both bounds and excludes the days just outside them', async () => {
    const { agent } = await registerUser(app);
    for (const [title, date] of [
      ['Too early', '2026-08-31'],
      ['First day', '2026-09-01'],
      ['Last day', '2026-09-30'],
      ['Too late', '2026-10-01'],
    ]) {
      await createBook(agent, { title, status: 'finished', finished_date: date });
    }

    const res = await getCalendar(agent, '2026-09-01', '2026-09-30');

    expect(res.body.events.map((e) => e.book.title)).toEqual(['First day', 'Last day']);
  });

  it('never shows another user\'s reading history', async () => {
    const mine = await registerUser(app);
    const theirs = await registerUser(app);
    await createBook(mine.agent, { title: 'Mine', status: 'finished', finished_date: '2026-09-10' });
    await createBook(theirs.agent, { title: 'Theirs', status: 'finished', finished_date: '2026-09-10' });

    const res = await getCalendar(mine.agent, '2026-09-01', '2026-09-30');

    expect(res.body.events.map((e) => e.book.title)).toEqual(['Mine']);
    expect(res.body.summary.total).toBe(1);
  });

  it('orders by date, and "started" before "finished" within a day', async () => {
    const { agent } = await registerUser(app);
    // Same day for both events of one book, plus a later start elsewhere.
    await createBook(agent, {
      title: 'Quick read',
      status: 'finished',
      start_date: '2026-09-20',
      finished_date: '2026-09-20',
    });
    await createBook(agent, { title: 'Earlier', status: 'reading', start_date: '2026-09-05' });

    const res = await getCalendar(agent, '2026-09-01', '2026-09-30');

    expect(res.body.events.map((e) => `${e.date} ${e.kind}`)).toEqual([
      '2026-09-05 started',
      '2026-09-20 started',
      '2026-09-20 finished',
    ]);
  });
});

describe('reading dates on a book', () => {
  it('defaults to no dates for a "want to read" book', async () => {
    const { agent } = await registerUser(app);

    const book = await createBook(agent, { title: 'Someday', status: 'want_to_read' });

    expect(book.start_date).toBeNull();
    expect(book.finished_date).toBeNull();
  });

  it('stamps today when a book is added as "reading"', async () => {
    const { agent } = await registerUser(app);

    const book = await createBook(agent, { title: 'Dune', status: 'reading' });

    expect(book.start_date).toBe(todayKey());
    expect(book.finished_date).toBeNull();
  });

  it('stamps only the finished date for a book added as "finished"', async () => {
    const { agent } = await registerUser(app);

    const book = await createBook(agent, { title: 'Piranesi', status: 'finished' });

    // No start date is invented: a guess would put fiction in the calendar.
    expect(book.start_date).toBeNull();
    expect(book.finished_date).toBe(todayKey());
  });

  it('keeps dates the reader supplied instead of stamping', async () => {
    const { agent } = await registerUser(app);

    const book = await createBook(agent, {
      title: 'Dune',
      status: 'finished',
      start_date: '2026-01-04',
      finished_date: '2026-02-19',
    });

    expect(book.start_date).toBe('2026-01-04');
    expect(book.finished_date).toBe('2026-02-19');
  });

  it('accepts an empty string as "no date"', async () => {
    const { agent } = await registerUser(app);

    // A cleared <input type="date"> submits "", which must not be rejected.
    const book = await createBook(agent, {
      title: 'Dune',
      status: 'want_to_read',
      start_date: '',
      finished_date: '',
    });

    expect(book.start_date).toBeNull();
    expect(book.finished_date).toBeNull();
  });

  it('rejects a date that is not YYYY-MM-DD', async () => {
    const { agent } = await registerUser(app);

    const res = await agent
      .post('/api/books')
      .send({ title: 'Dune', author: 'Frank Herbert', start_date: '12/09/2026' });

    expect(res.status).toBe(400);
    expect(res.body.details).toHaveProperty('start_date');
  });

  it('rejects finishing a book before starting it', async () => {
    const { agent } = await registerUser(app);

    const res = await agent.post('/api/books').send({
      title: 'Dune',
      author: 'Frank Herbert',
      status: 'finished',
      start_date: '2026-09-12',
      finished_date: '2026-09-01',
    });

    expect(res.status).toBe(400);
    // Reported against the field the reader can fix.
    expect(res.body.details.finished_date).toMatch(/before the start date/);
  });

  it('stamps the finished date when the status changes to "finished"', async () => {
    const { agent } = await registerUser(app);
    const book = await createBook(agent, { title: 'Dune', status: 'reading' });
    expect(book.start_date).toBe(todayKey());

    const res = await agent.put(`/api/books/${book.id}`).send({
      title: 'Dune',
      author: 'Frank Herbert',
      status: 'finished',
      rating: 5,
      notes: '',
      start_date: book.start_date,
      finished_date: null,
    });

    expect(res.status).toBe(200);
    expect(res.body.book.finished_date).toBe(todayKey());
    // The start date that was already there survives the transition.
    expect(res.body.book.start_date).toBe(book.start_date);
  });

  it('does not re-stamp when an edit leaves the status alone', async () => {
    const { agent } = await registerUser(app);
    const book = await createBook(agent, {
      title: 'Dune',
      status: 'finished',
      start_date: '2026-01-04',
      finished_date: '2026-02-19',
    });

    // Same status, notes changed a month later: both dates must be untouched.
    const res = await agent.put(`/api/books/${book.id}`).send({
      ...book,
      notes: 'Re-read the appendix.',
    });

    expect(res.body.book.start_date).toBe('2026-01-04');
    expect(res.body.book.finished_date).toBe('2026-02-19');
  });

  it('lets a reader clear a date', async () => {
    const { agent } = await registerUser(app);
    const book = await createBook(agent, {
      title: 'Dune',
      status: 'reading',
      start_date: '2026-01-04',
    });

    const res = await agent.put(`/api/books/${book.id}`).send({
      title: 'Dune',
      author: 'Frank Herbert',
      status: 'reading', // no transition, so nothing is stamped back in
      rating: null,
      notes: '',
      start_date: null,
      finished_date: null,
    });

    expect(res.body.book.start_date).toBeNull();
  });

  it('treats PUT as a full update: a date left out of the body is cleared', async () => {
    const { agent } = await registerUser(app);
    const book = await createBook(agent, {
      title: 'Dune',
      status: 'finished',
      start_date: '2026-01-04',
      finished_date: '2026-02-19',
    });

    // This mirrors how PUT already behaves for `rating` and `notes`: omitting a
    // field applies its default rather than preserving the stored value. Every
    // client in this repo (BookForm) therefore sends the whole book.
    const res = await agent.put(`/api/books/${book.id}`).send({
      title: 'Dune',
      author: 'Frank Herbert',
      status: 'finished',
      rating: null,
      notes: '',
    });

    expect(res.body.book.start_date).toBeNull();
    expect(res.body.book.finished_date).toBeNull();
  });

  it('returns the dates when reading a single book and when listing', async () => {
    const { agent } = await registerUser(app);
    const book = await createBook(agent, {
      title: 'Dune',
      status: 'finished',
      start_date: '2026-01-04',
      finished_date: '2026-02-19',
    });

    const single = await agent.get(`/api/books/${book.id}`);
    expect(single.body.book).toMatchObject({
      start_date: '2026-01-04',
      finished_date: '2026-02-19',
    });

    const list = await agent.get('/api/books');
    expect(list.body.books[0]).toMatchObject({
      start_date: '2026-01-04',
      finished_date: '2026-02-19',
    });

    const stats = await agent.get('/api/books/stats');
    expect(stats.body.recent[0]).toMatchObject({ finished_date: '2026-02-19' });
  });
});
