import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp, registerUser } from './helpers.js';

let app;

beforeEach(() => {
  app = createTestApp();
});

afterEach(() => {
  app.db.close();
});

describe('POST /api/auth/register', () => {
  it('creates a user, logs them in and never exposes the password hash', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'mobina',
      email: 'Mobina@Example.com',
      password: 'password123',
    });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ username: 'mobina', email: 'mobina@example.com' });
    expect(res.body.user.id).toBeTypeOf('number');
    expect(res.body.user.created_at).toBeTypeOf('string');
    expect(res.body.user).not.toHaveProperty('password');
    expect(res.body.user).not.toHaveProperty('password_hash');
    expect(JSON.stringify(res.body)).not.toContain('password123');

    const cookie = res.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toMatch(/^token=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('stores the password as a bcrypt hash, not plain text', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'mobina', email: 'mobina@example.com', password: 'password123' });

    const row = app.db.prepare('SELECT password_hash FROM users WHERE username = ?').get('mobina');
    expect(row.password_hash).not.toBe('password123');
    expect(row.password_hash).toMatch(/^\$2[aby]\$/);
  });

  it('rejects invalid input with 400 and per-field messages', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'a!', email: 'not-an-email', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details).toHaveProperty('username');
    expect(res.body.details).toHaveProperty('email');
    expect(res.body.details).toHaveProperty('password');
  });

  it('rejects a missing body with 400', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(400);
  });

  it('rejects a duplicate email with 409 (case-insensitive)', async () => {
    await registerUser(app, { username: 'first', email: 'same@example.com' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'second', email: 'SAME@example.com', password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.body.details).toHaveProperty('email');
  });

  it('rejects a duplicate username with 409', async () => {
    await registerUser(app, { username: 'taken', email: 'one@example.com' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'taken', email: 'two@example.com', password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.body.details).toHaveProperty('username');
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials and sets the session cookie', async () => {
    const { credentials } = await registerUser(app);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: credentials.password });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(credentials.email);
    expect(res.body.user).not.toHaveProperty('password_hash');
    expect(res.headers['set-cookie'][0]).toMatch(/^token=/);
  });

  it('rejects a wrong password with 401', async () => {
    const { credentials } = await registerUser(app);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('rejects an unknown email with the same 401 message', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('rejects missing fields with 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'x@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.details).toHaveProperty('password');
  });
});

describe('GET /api/auth/me', () => {
  it('returns the current user when logged in', async () => {
    const { agent, user } = await registerUser(app);
    const res = await agent.get('/api/auth/me');

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual(user);
  });

  it('returns 401 without a session cookie', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with a tampered token', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', 'token=not.a.valid.jwt');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the session so /me returns 401 afterwards', async () => {
    const { agent } = await registerUser(app);

    const logout = await agent.post('/api/auth/logout');
    expect(logout.status).toBe(204);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(401);
  });
});
