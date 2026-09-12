import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../utils/httpError.js';
import { cookieOptions, signToken } from '../utils/token.js';
import { loginSchema, registerSchema } from '../validators/auth.schemas.js';

export function createAuthRouter({ users, requireAuth }) {
  const router = Router();

  function setSessionCookie(res, userId) {
    res.cookie(config.cookieName, signToken(userId), {
      ...cookieOptions(),
      maxAge: config.cookieMaxAgeMs,
    });
  }

  // POST /api/auth/register - create an account and log in
  router.post('/register', validate(registerSchema), async (req, res) => {
    const { username, email, password } = req.body;

    if (users.emailExists(email)) {
      throw new HttpError(409, 'This email is already registered', {
        email: 'This email is already registered',
      });
    }
    if (users.usernameExists(username)) {
      throw new HttpError(409, 'This username is already taken', {
        username: 'This username is already taken',
      });
    }

    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
    const user = users.create({ username, email, passwordHash });

    setSessionCookie(res, user.id);
    res.status(201).json({ user });
  });

  // POST /api/auth/login
  router.post('/login', validate(loginSchema), async (req, res) => {
    const { email, password } = req.body;
    const record = users.findByEmailWithPassword(email);

    // Same message whether the email or the password is wrong (no user enumeration).
    const valid = record && (await bcrypt.compare(password, record.password_hash));
    if (!valid) {
      throw new HttpError(401, 'Invalid email or password');
    }

    const { password_hash: _ignored, ...user } = record;
    setSessionCookie(res, user.id);
    res.json({ user });
  });

  // POST /api/auth/logout - clear the session cookie
  router.post('/logout', (req, res) => {
    res.clearCookie(config.cookieName, cookieOptions());
    res.status(204).end();
  });

  // GET /api/auth/me - the currently logged-in user
  router.get('/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  return router;
}
