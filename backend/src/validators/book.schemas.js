import { z } from 'zod';

export const BOOK_STATUSES = ['want_to_read', 'reading', 'finished'];

const status = z.enum(BOOK_STATUSES, {
  error: 'Status must be one of: want_to_read, reading, finished',
});

// Rating is optional: null/undefined/'' all mean "not rated".
const rating = z.preprocess(
  (value) => (value === '' || value === undefined ? null : value),
  z
    .number({ error: 'Rating must be a number' })
    .int('Rating must be a whole number')
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5')
    .nullable(),
);

/**
 * A calendar date: optional, and always a date-only 'YYYY-MM-DD' string.
 *
 * null/undefined/'' all mean "no date" - a browser `<input type="date">`
 * submits an empty string when it is cleared, so clearing a date has to be
 * accepted rather than rejected. Storing date-only text (never a timestamp) is
 * what keeps "finished on 12 March" on 12 March in every timezone.
 */
function calendarDate(message) {
  return z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    z.iso.date({ error: message }).nullable(),
  );
}

export const bookSchema = z
  .object({
    title: z
      .string({ error: 'Title is required' })
      .trim()
      .min(1, 'Title is required')
      .max(200, 'Title must be at most 200 characters'),
    author: z
      .string({ error: 'Author is required' })
      .trim()
      .min(1, 'Author is required')
      .max(200, 'Author must be at most 200 characters'),
    status: status.default('want_to_read'),
    rating: rating.default(null),
    notes: z
      .string({ error: 'Notes must be text' })
      .trim()
      .max(2000, 'Notes must be at most 2000 characters')
      .default(''),
    start_date: calendarDate('Start date must be a YYYY-MM-DD date').default(null),
    finished_date: calendarDate('Finished date must be a YYYY-MM-DD date').default(null),
  })
  // A book cannot be finished before it was started. Reported against
  // finished_date so the frontend shows it inline under that field.
  // ('YYYY-MM-DD' strings sort chronologically, so a text comparison is right.)
  .refine(
    (book) => !book.start_date || !book.finished_date || book.start_date <= book.finished_date,
    { path: ['finished_date'], message: 'Finished date cannot be before the start date' },
  );

// Query string for GET /api/books
export const listBooksQuerySchema = z.object({
  search: z.string().trim().max(200, 'Search text is too long').optional(),
  status: status.optional(),
});
