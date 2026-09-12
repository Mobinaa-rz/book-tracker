import { config } from '../config.js';
import { HttpError } from '../utils/httpError.js';
import { verifyToken } from '../utils/token.js';

/**
 * Protects a route. Reads the JWT from the session cookie, verifies it and
 * loads the user. On success `req.user` is set; otherwise responds 401.
 */
export function createRequireAuth(users) {
  return function requireAuth(req, res, next) {
    const token = req.cookies?.[config.cookieName];
    const userId = token ? verifyToken(token) : null;
    const user = userId ? users.findById(userId) : null;

    if (!user) {
      return next(new HttpError(401, 'You need to log in to do that'));
    }

    req.user = user;
    next();
  };
}
