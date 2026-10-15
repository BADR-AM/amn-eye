import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { get, query, run } from './db.js';
import { logAudit } from './auditLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default hash for password '123456'
const DEFAULT_ADMIN_HASH = '$2b$10$bNpheeFBkTWNE1sDaCkmcuLCYEYzuHbmA/BVAvsHawdBrLTlhOgcG';

let cachedJwtSecret = null;

// Persistent secret loading & in-memory caching
export function getOrInitJwtSecret() {
  if (cachedJwtSecret) return cachedJwtSecret;

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length >= 32) {
    cachedJwtSecret = process.env.JWT_SECRET.trim();
    return cachedJwtSecret;
  }

  const dataDir = process.env.APP_DATA_DIR
    ? path.join(process.env.APP_DATA_DIR, 'data')
    : path.join(__dirname, '..', 'data');
  const secretPath = path.join(dataDir, 'jwt.secret');

  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (fs.existsSync(secretPath)) {
      const existing = fs.readFileSync(secretPath, 'utf8').trim();
      if (existing.length >= 32) {
        cachedJwtSecret = existing;
        process.env.JWT_SECRET = existing;
        return cachedJwtSecret;
      }
    }
    const newSecret = crypto.randomBytes(64).toString('hex');
    fs.writeFileSync(secretPath, newSecret, { encoding: 'utf8', mode: 0o600 });
    cachedJwtSecret = newSecret;
    process.env.JWT_SECRET = newSecret;
    return cachedJwtSecret;
  } catch (err) {
    console.error('[AUTH] Failed to persist jwt.secret to disk; using ephemeral runtime secret:', err.message);
    cachedJwtSecret = crypto.randomBytes(64).toString('hex');
    process.env.JWT_SECRET = cachedJwtSecret;
    return cachedJwtSecret;
  }
}

// Initialize persistent secret immediately
const PERSISTENT_SECRET = getOrInitJwtSecret();
const getSecret = () => process.env.JWT_SECRET || cachedJwtSecret || PERSISTENT_SECRET;
const getHash = () => process.env.ADMIN_PASSWORD_HASH || DEFAULT_ADMIN_HASH;
export const isDefaultAdminPassword = () => getHash() === DEFAULT_ADMIN_HASH;
const TOKEN_EXPIRY = '30d';

export const generateToken = (payload) => {
  return jwt.sign(payload, getSecret(), { expiresIn: TOKEN_EXPIRY });
};

export const verifyToken = (token) => {
  return jwt.verify(token, getSecret());
};

export const hashPassword = async (plain) => {
  return bcrypt.hash(plain, 10);
};

export const comparePassword = async (plain, hash) => {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
};

export const extractToken = (req) => {
  if (!req) return null;
  const authHeader = req.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const t = authHeader.split(' ')[1];
    if (t && t !== 'null' && t !== 'undefined') return t;
  }
  if (req.query?.token && typeof req.query.token === 'string') {
    return req.query.token;
  }
  if (req.headers?.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)(?:auth_token|token)=([^;]+)/);
    if (match) {
      try {
        return decodeURIComponent(match[1]);
      } catch (e) {
        return match[1];
      }
    }
  }
  return null;
};

export const requireAuth = (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'انتهت صلاحية الجلسة - يرجى إعادة تسجيل الدخول' });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;

    // Keep the media cookie in sync with the Bearer token. <img>/<video> tags cannot send
    // Authorization headers, so a session restored from localStorage without a cookie
    // would otherwise load data but fail every media request with 401.
    const cookieMatch = req.headers?.cookie?.match(/(?:^|;\s*)auth_token=([^;]+)/);
    if ((!cookieMatch || cookieMatch[1] !== token) && typeof res.setHeader === 'function' && !res.headersSent) {
      res.setHeader('Set-Cookie', `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'انتهت صلاحية الجلسة - يرجى إعادة تسجيل الدخول' });
  }
};

export const requireMediaAuth = (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    if (process.env.NODE_ENV !== 'test') {
      const ip = req.ip || req.connection?.remoteAddress || '';
      const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || req.hostname === 'localhost';
      if (isLocal && !req.headers['x-forwarded-for']) {
        return next();
      }
    }
    return res.status(401).json({ error: 'غير مصرح بالوصول إلى المرفقات بدون تصريح أمني' });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      const ip = req.ip || req.connection?.remoteAddress || '';
      const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || req.hostname === 'localhost';
      if (isLocal && !req.headers['x-forwarded-for']) {
        return next();
      }
    }
    return res.status(401).json({ error: 'صلاحية تصريح المرفقات منتهية أو غير صالحة' });
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'عذراً، هذا الإجراء يتطلب صلاحية أعلى' });
  }
  next();
};

export const handleLogin = async (req, res) => {
  const { username, password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'كلمة المرور مطلوبة' });
  }

  const targetUsername = (username && username.trim()) ? username.trim() : 'admin';

  try {
    let userRow = null;
    try {
      userRow = await get(`SELECT * FROM users WHERE username = ? COLLATE NOCASE`, [targetUsername]);
    } catch (dbErr) {
      // Table might not exist in isolated unit test environments
      userRow = null;
    }

    if (userRow) {
      let match = await comparePassword(password, userRow.password_hash);
      if (!match && targetUsername.toLowerCase() === 'admin') {
        match = await comparePassword(password, getHash());
      }
      if (!match) {
        logAudit(req, {
          action_type: 'LOGIN_FAILED',
          entity_type: 'auth',
          entity_name: targetUsername,
          details: `محاولة تسجيل دخول فاشلة للمستخدم: ${targetUsername}`
        });
        return res.status(401).json({ error: 'كلمة المرور أو اسم المستخدم غير صحيح' });
      }

      const userPayload = {
        id: userRow.id,
        username: userRow.username,
        full_name: userRow.full_name,
        role: userRow.role || 'officer',
        account_fingerprint: userRow.account_fingerprint || 'AD0001'
      };

      logAudit(req, {
        action_type: 'LOGIN_SUCCESS',
        entity_type: 'auth',
        entity_id: userPayload.id,
        entity_name: userPayload.username,
        details: `تسجيل دخول ناجح للمستخدم: ${userPayload.full_name} (${userPayload.username})`,
        user_id: userPayload.id,
        username: userPayload.username,
        user_fullname: userPayload.full_name,
        user_role: userPayload.role
      });

      const token = generateToken(userPayload);
      if (typeof res.setHeader === 'function') {
        res.setHeader('Set-Cookie', `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
      }
      return res.json({
        token,
        role: userPayload.role,
        user: userPayload
      });
    }

    // Fallback: If user is not in DB, check against env ADMIN_PASSWORD_HASH for 'admin'
    if (targetUsername.toLowerCase() === 'admin') {
      const match = await comparePassword(password, getHash());
      if (match) {
        const adminPayload = {
          id: 1,
          username: 'admin',
          full_name: 'مدير المنظومة',
          role: 'admin'
        };
        logAudit(req, {
          action_type: 'LOGIN_SUCCESS',
          entity_type: 'auth',
          entity_id: adminPayload.id,
          entity_name: adminPayload.username,
          details: 'تسجيل دخول ناجح لمدير المنظومة الافتراضي (admin)',
          user_id: adminPayload.id,
          username: adminPayload.username,
          user_fullname: adminPayload.full_name,
          user_role: adminPayload.role
        });
        const token = generateToken(adminPayload);
        if (typeof res.setHeader === 'function') {
          res.setHeader('Set-Cookie', `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
        }
        return res.json({
          token,
          role: 'admin',
          user: adminPayload
        });
      }
    }

    logAudit(req, {
      action_type: 'LOGIN_FAILED',
      entity_type: 'auth',
      entity_name: targetUsername,
      details: `محاولة تسجيل دخول فاشلة بحساب غير موجود: ${targetUsername}`
    });
    return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'خطأ في تسجيل الدخول' });
  }
};

export const handleQrLogin = async (req, res) => {
  const { qr_token } = req.body;
  if (!qr_token || typeof qr_token !== 'string' || !qr_token.trim()) {
    return res.status(400).json({ error: 'رمز بطاقة الهوية (QR Code) مطلوب' });
  }

  const cleanToken = qr_token.trim();

  try {
    const userRow = await get(`SELECT * FROM users WHERE qr_login_token = ?`, [cleanToken]);

    if (!userRow) {
      logAudit(req, {
        action_type: 'QR_LOGIN_FAILED',
        entity_type: 'auth',
        entity_name: 'unknown_qr',
        details: 'محاولة تسجيل دخول فاشلة برمز بطاقة هوية غير صالح أو ملغي'
      });
      return res.status(401).json({ error: 'رمز بطاقة الهوية غير صالح أو تم إلغاؤه' });
    }

    const userPayload = {
      id: userRow.id,
      username: userRow.username,
      full_name: userRow.full_name,
      role: userRow.role || 'officer',
      account_fingerprint: userRow.account_fingerprint || 'OP0001'
    };

    logAudit(req, {
      action_type: 'QR_LOGIN_SUCCESS',
      entity_type: 'auth',
      entity_id: userPayload.id,
      entity_name: userPayload.username,
      details: `تسجيل دخول ذكي ناجح عبر بطاقة الهوية (QR): ${userPayload.full_name} (${userPayload.username})`,
      user_id: userPayload.id,
      username: userPayload.username,
      user_fullname: userPayload.full_name,
      user_role: userPayload.role
    });

    const token = generateToken(userPayload);
    if (typeof res.setHeader === 'function') {
      res.setHeader('Set-Cookie', `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
    }
    return res.json({
      token,
      role: userPayload.role,
      user: userPayload
    });
  } catch (err) {
    console.error('QR Login error:', err);
    res.status(500).json({ error: 'خطأ أثناء تسجيل الدخول بالبطاقة الذكية' });
  }
};


