/**
 * An error with an HTTP status code. Throw it anywhere in a route and the
 * error handler turns it into a JSON response with that status.
 *
 *   throw new HttpError(404, 'Book not found');
 *   throw new HttpError(400, 'Validation failed', { title: 'Title is required' });
 */
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
