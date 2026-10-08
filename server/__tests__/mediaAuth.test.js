import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireMediaAuth, generateToken } from '../auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Media Authentication & Path Traversal Protection', () => {
  let server;
  let baseUrl;
  let testToken;
  let testUploadsDir;
  let testFilePath;

  beforeAll(async () => {
    testUploadsDir = path.join(__dirname, 'test_uploads');
    if (!fs.existsSync(testUploadsDir)) {
      fs.mkdirSync(testUploadsDir, { recursive: true });
    }

    // Create a dummy test file
    testFilePath = path.join(testUploadsDir, 'sample_photo.jpg');
    fs.writeFileSync(testFilePath, 'SYNTHETIC_IMAGE_BYTES');

    testToken = generateToken({ role: 'officer', username: 'testuser' });

    const app = express();

    app.use('/uploads', requireMediaAuth, (req, res) => {
      try {
        const rawPath = req.path || '';
        const safePath = path.normalize(rawPath).replace(/^(\.\.[\/\\])+/, '');
        const resolvedBase = path.resolve(testUploadsDir);
        const targetCandidate = path.resolve(path.join(testUploadsDir, safePath));

        if (!targetCandidate.startsWith(resolvedBase)) {
          return res.status(403).json({ error: 'غير مسموح بالوصول خارج مجلد المرفقات' });
        }

        if (fs.existsSync(targetCandidate) && fs.statSync(targetCandidate).isFile()) {
          return res.sendFile(targetCandidate);
        }
      } catch (e) {}

      res.status(404).json({ error: 'الملف غير موجود' });
    });

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}`;
        resolve();
      });
    });
  });

  afterAll(() => {
    if (server) server.close();
    try {
      if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
      if (fs.existsSync(testUploadsDir)) fs.rmdirSync(testUploadsDir);
    } catch (e) {}
  });

  it('should reject unauthenticated request to /uploads with 401', async () => {
    const res = await fetch(`${baseUrl}/uploads/sample_photo.jpg`);
    expect(res.status).toBe(401);
  });

  it('should accept authenticated request with Authorization Bearer header', async () => {
    const res = await fetch(`${baseUrl}/uploads/sample_photo.jpg`, {
      headers: { Authorization: `Bearer ${testToken}` }
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('SYNTHETIC_IMAGE_BYTES');
  });

  it('should accept authenticated request with ?token= query parameter', async () => {
    const res = await fetch(`${baseUrl}/uploads/sample_photo.jpg?token=${testToken}`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('SYNTHETIC_IMAGE_BYTES');
  });

  it('should accept authenticated request with auth_token cookie', async () => {
    const res = await fetch(`${baseUrl}/uploads/sample_photo.jpg`, {
      headers: { Cookie: `auth_token=${testToken}` }
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('SYNTHETIC_IMAGE_BYTES');
  });

  it('should reject path traversal attempts attempting to access outside files', async () => {
    const res = await fetch(`${baseUrl}/uploads/../../package.json?token=${testToken}`);
    // Should be 403 (blocked traversal) or 404 (safePath stripped), NOT 200 with package.json contents!
    expect([403, 404]).toContain(res.status);
  });
});
