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

export const bookSchema = z.object({
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
});

// Query string for GET /api/books
export const listBooksQuerySchema = z.object({
  search: z.string().trim().max(200, 'Search text is too long').optional(),
  status: status.optional(),
});
