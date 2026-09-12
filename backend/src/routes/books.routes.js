import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../utils/httpError.js';
import { bookSchema, listBooksQuerySchema } from '../validators/book.schemas.js';

// A book id in the URL must be a positive integer.
const idSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export function createBooksRouter({ books, requireAuth }) {
  const router = Router();

  // Every books route requires a logged-in user.
  router.use(requireAuth);

  // GET /api/books?search=&status= - the current user's books
  router.get('/', validate(listBooksQuerySchema, 'query'), (req, res) => {
    res.json({ books: books.list(req.user.id, req.validatedQuery) });
  });

  // GET /api/books/stats - dashboard summary (must be declared before /:id)
  router.get('/stats', (req, res) => {
    res.json(books.stats(req.user.id));
  });

  // POST /api/books - add a book
  router.post('/', validate(bookSchema), (req, res) => {
    const book = books.create(req.user.id, req.body);
    res.status(201).json({ book });
  });

  // Parse and validate :id for the routes below.
  router.param('id', (req, res, next, value) => {
    const result = idSchema.safeParse({ id: value });
    if (!result.success) return next(new HttpError(404, 'Book not found'));
    req.bookId = result.data.id;
    next();
  });

  // GET /api/books/:id
  router.get('/:id', (req, res) => {
    const book = books.findById(req.user.id, req.bookId);
    if (!book) throw new HttpError(404, 'Book not found');
    res.json({ book });
  });

  // PUT /api/books/:id - full update
  router.put('/:id', validate(bookSchema), (req, res) => {
    const book = books.update(req.user.id, req.bookId, req.body);
    if (!book) throw new HttpError(404, 'Book not found');
    res.json({ book });
  });

  // DELETE /api/books/:id
  router.delete('/:id', (req, res) => {
    const deleted = books.delete(req.user.id, req.bookId);
    if (!deleted) throw new HttpError(404, 'Book not found');
    res.status(204).end();
  });

  return router;
}
