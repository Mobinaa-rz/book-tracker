import { HttpError } from '../utils/httpError.js';

/**
 * Validates req[source] ('body' or 'query') against a zod schema.
 * On success the parsed (trimmed, coerced) data replaces the original.
 * On failure it responds 400 with one message per field.
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source] ?? {});

    if (!result.success) {
      const details = {};
      for (const issue of result.error.issues) {
        const field = issue.path.join('.') || '_';
        if (!details[field]) details[field] = issue.message;
      }
      return next(new HttpError(400, 'Validation failed', details));
    }

    // In Express 5 `req.query` is a getter, so store parsed values separately.
    if (source === 'query') {
      req.validatedQuery = result.data;
    } else {
      req[source] = result.data;
    }
    next();
  };
}
