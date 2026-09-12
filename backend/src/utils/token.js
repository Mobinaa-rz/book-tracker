import jwt from 'jsonwebtoken';
import { config } from '../config.js';

/** Creates a signed JWT whose only claim is the user id. */
export function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

/** Returns the user id from a token, or null if it is invalid/expired. */
export function verifyToken(token) {
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    return Number(payload.sub) || null;
  } catch {
    return null;
  }
}

/** Cookie options shared by login/register (set) and logout (clear). */
export function cookieOptions() {
  return {
    httpOnly: true, // not readable from JavaScript in the browser
    sameSite: 'lax', // sent on normal navigation, blocked on cross-site POSTs
    secure: config.isProduction, // HTTPS only in production
    path: '/',
  };
}
