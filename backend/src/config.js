/**
 * Central place for all configuration values.
 * Values come from environment variables (see .env.example) with safe defaults
 * for local development.
 */
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITEST;

const jwtSecret = process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me';

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret,
  jwtExpiresIn: '7d',
  cookieName: 'token',
  cookieMaxAgeMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  dbPath: process.env.DB_PATH || (isTest ? ':memory:' : 'data/books.db'),
  bcryptRounds: isTest ? 4 : 10, // fewer rounds in tests keeps them fast
  isProduction,
};
