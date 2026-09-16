import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { calendarQuerySchema } from '../validators/calendar.schemas.js';

export function createCalendarRouter({ calendar, requireAuth }) {
  const router = Router();

  // The calendar is personal reading history, so it needs a session like
  // every other data route.
  router.use(requireAuth);

  // GET /api/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
  // Both bounds are required and inclusive; see validators/calendar.schemas.js
  // for the rules (valid dates, from <= to, range at most a year wide).
  router.get('/', validate(calendarQuerySchema, 'query'), (req, res) => {
    const { from, to } = req.validatedQuery;
    res.json(calendar.range(req.user.id, from, to));
  });

  return router;
}
