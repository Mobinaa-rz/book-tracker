import { HttpError } from '../utils/httpError.js';

/** 404 for any unknown /api route. */
export function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

/**
 * Turns thrown errors into consistent JSON responses:
 *   { "error": "message", "details": { field: "why" } }   (details only when present)
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    const body = { error: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.status).json(body);
  }

  // Malformed JSON body sent by the client
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }

  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
}
