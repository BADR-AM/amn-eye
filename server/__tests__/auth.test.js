import { describe, it, expect, beforeAll } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Set env vars for testing
process.env.ADMIN_PASSWORD_HASH = '$2b$10$test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.PORT = '0';

const { generateToken, verifyToken, comparePassword, requireAuth, handleLogin } = await import('../auth.js');

describe('Auth Module', () => {
  describe('generateToken / verifyToken', () => {
    it('should generate a valid JWT', () => {
      const token = generateToken({ role: 'admin' });
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      const decoded = verifyToken(token);
      expect(decoded.role).toBe('admin');
      expect(decoded.exp).toBeDefined();
    });

    it('should reject invalid token', () => {
      expect(() => verifyToken('garbage-token')).toThrow();
    });
  });

  describe('comparePassword', () => {
    it('should match correct password', async () => {
      const hash = await bcrypt.hash('mypassword', 10);
      const match = await comparePassword('mypassword', hash);
      expect(match).toBe(true);
    });

    it('should reject wrong password', async () => {
      const hash = await bcrypt.hash('mypassword', 10);
      const match = await comparePassword('wrongpassword', hash);
      expect(match).toBe(false);
    });
  });

  describe('requireAuth middleware', () => {
    const createRes = () => {
      const res = { statusCode: null, body: null, status: (s) => { res.statusCode = s; return res; }, json: (b) => { res.body = b; } };
      return res;
    };

    it('should return 401 if no Authorization header', () => {
      const req = { headers: {} };
      const res = createRes();
      let nextCalled = false;
      requireAuth(req, res, () => { nextCalled = true; });

      expect(res.statusCode).toBe(401);
      expect(nextCalled).toBe(false);
    });

    it('should return 401 for invalid token', () => {
      const req = { headers: { authorization: 'Bearer invalid-token' } };
      const res = createRes();
      let nextCalled = false;
      requireAuth(req, res, () => { nextCalled = true; });

      expect(res.statusCode).toBe(401);
      expect(nextCalled).toBe(false);
    });

    it('should call next() with valid token', () => {
      const token = generateToken({ role: 'admin' });
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = createRes();
      let nextCalled = false;
      requireAuth(req, res, () => { nextCalled = true; });

      expect(nextCalled).toBe(true);
      expect(req.user).toBeDefined();
      expect(req.user.role).toBe('admin');
    });
  });

  describe('handleLogin', () => {
    it('should return 400 if no password', async () => {
      const req = { body: {} };
      const res = createRes();
      await handleLogin(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('مطلوبة');
    });

    it('should return 401 for wrong password', async () => {
      const hash = await bcrypt.hash('correctpassword', 10);
      process.env.ADMIN_PASSWORD_HASH = hash;

      const req = { body: { password: 'wrongpassword' } };
      const res = createRes();
      await handleLogin(req, res);

      expect(res.statusCode).toBe(401);
    });

    it('should return token for correct password', async () => {
      const hash = await bcrypt.hash('correctpassword', 10);
      process.env.ADMIN_PASSWORD_HASH = hash;

      const req = { body: { password: 'correctpassword' } };
      const res = createRes();
      await handleLogin(req, res);

      expect(res.statusCode).not.toBe(401);
      expect(res.statusCode).not.toBe(400);
      expect(res.body.token).toBeDefined();
      expect(res.body.role).toBe('admin');
    });
  });
});

function createRes() {
  const res = { statusCode: null, body: null, status: (s) => { res.statusCode = s; return res; }, json: (b) => { res.body = b; } };
  return res;
}
