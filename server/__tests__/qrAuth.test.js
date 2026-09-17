import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'crypto';

process.env.ADMIN_PASSWORD_HASH = '$2b$10$test';
process.env.JWT_SECRET = 'test-secret-key-for-qr-auth-testing-only';
process.env.PORT = '0';

const { handleQrLogin, verifyToken } = await import('../auth.js');
const { initDb, run, get } = await import('../db.js');

describe('QR Login Authentication', () => {
  const testQrToken = 'test-secure-qr-token-' + crypto.randomBytes(16).toString('hex');
  const testUsername = 'test_officer_' + Date.now();

  beforeAll(async () => {
    await initDb();
    // Insert dummy user with testQrToken
    await run(
      `INSERT OR REPLACE INTO users (username, password_hash, full_name, role, qr_login_token) VALUES (?, ?, ?, ?, ?)`,
      [testUsername, '$2b$10$dummyhashplaceholder', 'نقيب / فحص تجريبي', 'officer', testQrToken]
    );
  });

  const createRes = () => {
    const res = { 
      statusCode: 200, 
      body: null, 
      status: (s) => { res.statusCode = s; return res; }, 
      json: (b) => { res.body = b; return res; } 
    };
    return res;
  };

  it('should return 400 if qr_token is missing or empty', async () => {
    const req = { body: {}, headers: {}, ip: '127.0.0.1' };
    const res = createRes();

    await handleQrLogin(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('مطلوب');
  });

  it('should return 401 if qr_token is invalid or does not exist in db', async () => {
    const req = { body: { qr_token: 'invalid-non-existent-token-xyz' }, headers: {}, ip: '127.0.0.1' };
    const res = createRes();

    await handleQrLogin(req, res);
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toContain('غير صالح');
  });

  it('should authenticate successfully with valid qr_login_token', async () => {
    const req = { body: { qr_token: testQrToken }, headers: {}, ip: '127.0.0.1' };
    const res = createRes();

    await handleQrLogin(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.role).toBe('officer');
    expect(res.body.user).toBeDefined();
    expect(res.body.user.username).toBe(testUsername);
    expect(res.body.user.full_name).toBe('نقيب / فحص تجريبي');

    // Verify issued token
    const decoded = verifyToken(res.body.token);
    expect(decoded.username).toBe(testUsername);
    expect(decoded.role).toBe('officer');
  });
});
