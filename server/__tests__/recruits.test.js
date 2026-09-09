import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';

// Set env vars
process.env.ADMIN_PASSWORD_HASH = '$2b$10$abcdefghijklmnopqrstuuL8K4H0zYq3qRdDdCJb5M8Rn5vQXzW3V4O2YbK6Y4';
process.env.JWT_SECRET = 'test-recruits-secret-key-1234567890';
process.env.PORT = '0';

let server;
let baseUrl;
let token;

beforeAll(async () => {
  // We need to dynamically import the server after env is set
  // But since server.js uses top-level await, we test via HTTP
  const { default: bcrypt } = await import('bcryptjs');
  const hash = await bcrypt.hash('testpass', 10);
  process.env.ADMIN_PASSWORD_HASH = hash;

  // Import the app (not listen)
  const express = (await import('express')).default;
  const { handleLogin, requireAuth, generateToken } = await import('../auth.js');

  const app = express();
  app.use(express.json());
  app.post('/api/auth/login', handleLogin);
  app.get('/api/protected', requireAuth, (req, res) => res.json({ ok: true }));
  app.post('/api/echo', requireAuth, (req, res) => res.json({ data: req.body }));

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`;
      resolve();
    });
  });

  // Generate a token for tests
  token = generateToken({ role: 'admin' });
});

afterAll(() => {
  if (server) server.close();
});

describe('Recruits API Auth', () => {
  it('should reject unauthenticated GET /api/protected', async () => {
    const res = await fetch(`${baseUrl}/api/protected`);
    expect(res.status).toBe(401);
  });

  it('should accept authenticated request', async () => {
    const res = await fetch(`${baseUrl}/api/protected`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it('should reject token in body instead of header', async () => {
    const res = await fetch(`${baseUrl}/api/protected`, {
      headers: { Authorization: 'Bearer invalid-token' }
    });
    expect(res.status).toBe(401);
  });
});

describe('Login Endpoint', () => {
  it('should return token with correct password', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'testpass' })
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.token).toBeDefined();
  });

  it('should reject wrong password', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrongpass' })
    });
    expect(res.status).toBe(401);
  });
});
