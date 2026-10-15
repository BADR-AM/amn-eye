import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { initDb, query, get, run, withTransaction } from './db.js';
import { getLocalIpAddresses } from './network.js';
import { requireAuth, requireRole, requireMediaAuth, handleLogin, handleQrLogin, hashPassword, comparePassword, getOrInitJwtSecret, isDefaultAdminPassword } from './auth.js';
import { createBackup, listBackups, deleteBackup, restoreBackup, getAvailableDrives, startAutoBackupSchedule } from './backup.js';
import { logAudit, computeRecruitDiff } from './auditLogger.js';
import * as XLSX from 'xlsx';
import { parseRecruitMarkdown } from './markdownParser.js';
import { ensureFtsTable } from './search/ftsMigration.js';
import { searchRecruits } from './search/ftsQueries.js';
import { SQL_MEDICAL_FIT, SQL_MEDICAL_UNFIT, SQL_MEDICAL_UNDETERMINED, classifyMedicalStatus } from './search/medicalStatus.js';
import { QUERY_CATALOG, executeQuery } from './ai/queryCatalog.js';
import { buildFts5Query, normalizeArabic } from './ai/arabicNormalize.js';
import { routeUserQuery } from './ai/intentRouter.js';
import { modelManager } from './ai/modelManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Setup directories for uploads: support APP_DATA_DIR for packaged app, with fallback to project root
const baseDir = process.env.APP_DATA_DIR || path.join(__dirname, '..');
const uploadsDir = path.join(baseDir, 'uploads');
const photosDir = path.join(uploadsDir, 'photos');
const videosDir = path.join(uploadsDir, 'videos');
const docsDir = path.join(uploadsDir, 'documents');

[uploadsDir, photosDir, videosDir, docsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Auto-migrate existing uploads from project root, backup folders or installation directory into APP_DATA_DIR
if (process.env.APP_DATA_DIR) {
  const fallbackUploadDirs = [
    path.join(__dirname, '..', 'uploads'),
    path.join(process.cwd(), 'uploads'),
    'D:\\sherif\\PROJECT\\sys amn\\uploads',
    'D:\\sherif\\PROJECT\\BACKUP_RECRUITS_DATA_20261014_221243\\uploads'
  ];

  fallbackUploadDirs.forEach(srcRoot => {
    if (fs.existsSync(srcRoot) && path.resolve(srcRoot) !== path.resolve(uploadsDir)) {
      try {
        const copyDirRecursive = (src, dest) => {
          if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
          const entries = fs.readdirSync(src, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.name === '.gitkeep') continue;
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            if (entry.isDirectory()) {
              copyDirRecursive(srcPath, destPath);
            } else if (!fs.existsSync(destPath)) {
              fs.copyFileSync(srcPath, destPath);
              console.log('✅ تم ترحيل ملف المرفقات تلقائياً إلى مجلد بيانات المنظومة:', entry.name);
            }
          }
        };
        copyDirRecursive(srcRoot, uploadsDir);
      } catch (migErr) {
        console.warn('⚠️ تنبيه عند فحص مجلد المرفقات المرجعي:', migErr.message);
      }
    }
  });
}

// Origin validation: allow same-origin, loopback, Electron, and private LAN subnets
const isAllowedOrigin = (origin) => {
  if (!origin) return true; // Direct, file://, curl, mobile native
  try {
    const url = new URL(origin);
    const host = url.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    if (host.endsWith('.local')) return true;
    return false;
  } catch (e) {
    return false;
  }
};

// Middlewares
app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS: غير مسموح بالوصول من هذا النطاق الخارجي'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Real-time sync heartbeat state
let lastDataUpdateTimestamp = Date.now();
export function notifyDataChanged() {
  lastDataUpdateTimestamp = Date.now();
}

// Serve uploaded media files with authentication and strict path traversal protection
app.use('/uploads', requireMediaAuth, (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; media-src 'self'");

  try {
    const rawPath = req.path || '';
    const safePath = path.normalize(rawPath).replace(/^(\.\.[\/\\])+/, '');
    const resolvedBase = path.resolve(uploadsDir);
    const targetCandidate = path.resolve(path.join(uploadsDir, safePath));

    // Guard against path traversal outside uploadsDir
    if (!targetCandidate.startsWith(resolvedBase)) {
      return res.status(403).json({ error: 'غير مسموح بالوصول خارج مجلد المرفقات' });
    }

    if (fs.existsSync(targetCandidate) && fs.statSync(targetCandidate).isFile()) {
      return res.sendFile(targetCandidate);
    }

    // Smart subfolder fallback for legacy flat paths
    const rawName = path.basename(rawPath);
    if (rawName) {
      const candidates = [
        path.join(photosDir, rawName),
        path.join(videosDir, rawName),
        path.join(docsDir, rawName)
      ];
      for (const cand of candidates) {
        const resolvedCand = path.resolve(cand);
        if (resolvedCand.startsWith(resolvedBase) && fs.existsSync(resolvedCand) && fs.statSync(resolvedCand).isFile()) {
          return res.sendFile(resolvedCand);
        }
      }
    }

    // Fallback: If not found in uploadsDir and running in APP_DATA_DIR, check project root, installed directory or backup folders
    if (process.env.APP_DATA_DIR) {
      const fallbackUploadDirs = [
        path.join(__dirname, '..', 'uploads'),
        path.join(process.cwd(), 'uploads'),
        'D:\\sherif\\PROJECT\\sys amn\\uploads',
        'D:\\sherif\\PROJECT\\BACKUP_RECRUITS_DATA_20261014_221243\\uploads'
      ];
      for (const fbRoot of fallbackUploadDirs) {
        if (!fs.existsSync(fbRoot)) continue;
        const candidateInFb = path.resolve(path.join(fbRoot, safePath));
        if (candidateInFb.startsWith(path.resolve(fbRoot)) && fs.existsSync(candidateInFb) && fs.statSync(candidateInFb).isFile()) {
          try {
            const destDir = path.dirname(targetCandidate);
            if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
            fs.copyFileSync(candidateInFb, targetCandidate);
          } catch (e) {}
          return res.sendFile(candidateInFb);
        }

        if (rawName) {
          const fbCandidates = [
            path.join(fbRoot, 'photos', rawName),
            path.join(fbRoot, 'videos', rawName),
            path.join(fbRoot, 'documents', rawName),
            path.join(fbRoot, rawName)
          ];
          for (const cand of fbCandidates) {
            if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
              try {
                const destDir = path.dirname(targetCandidate);
                if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
                fs.copyFileSync(cand, targetCandidate);
              } catch (e) {}
              return res.sendFile(cand);
            }
          }
        }
      }
    }
  } catch (e) {}

  res.status(404).json({ error: 'الملف المطلوب غير موجود في مجلد المرفقات' });
});

// Real-time synchronization heartbeat endpoint
app.get('/api/sync/status', requireAuth, (req, res) => {
  res.json({
    timestamp: lastDataUpdateTimestamp,
    server_time: Date.now()
  });
});

// Multer config — type allowlist + random filenames + 100MB limit for mobile HD videos
const ALLOWED_PHOTO_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_MIME = [
  'video/webm', 'video/mp4', 'video/quicktime', 'video/x-m4v', 
  'video/3gpp', 'video/3gp', 'video/mov', 'video/x-msvideo', 'video/avi'
];
const ALLOWED_DOC_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'photo') {
      cb(null, photosDir);
    } else if (file.fieldname === 'video') {
      cb(null, videosDir);
    } else if (file.fieldname === 'document' || file.fieldname === 'doc_file' || file.fieldname === 'report_photo') {
      cb(null, docsDir);
    } else {
      cb(null, uploadsDir);
    }
  },
  filename: (req, file, cb) => {
    let origExt = path.extname(file.originalname || '').toLowerCase();
    const cleanMime = (file.mimetype || '').split(';')[0].trim().toLowerCase();
    if (!origExt || origExt === '.dat') {
      if (file.fieldname === 'photo') origExt = '.jpg';
      else if (file.fieldname === 'video') {
        origExt = cleanMime.includes('quicktime') ? '.mov' : (cleanMime.includes('webm') ? '.webm' : '.mp4');
      } else {
        origExt = cleanMime.includes('pdf') ? '.pdf' : '.jpg';
      }
    }
    cb(null, `${file.fieldname}_${Date.now()}_${crypto.randomUUID()}${origExt}`);
  },
});

const fileFilter = (req, file, cb) => {
  const cleanMime = (file.mimetype || '').split(';')[0].trim().toLowerCase();
  const isPhoto = file.fieldname === 'photo' && (ALLOWED_PHOTO_MIME.includes(cleanMime) || cleanMime.startsWith('image/'));
  const isVideo = file.fieldname === 'video' && (
    ALLOWED_VIDEO_MIME.includes(cleanMime) ||
    cleanMime.startsWith('video/') ||
    cleanMime === 'application/octet-stream' ||
    /\.(mp4|mov|webm|m4v|3gp|quicktime|avi)$/i.test(file.originalname || '')
  );
  const isDoc = (file.fieldname === 'document' || file.fieldname === 'doc_file' || file.fieldname === 'report_photo') && 
    (ALLOWED_DOC_MIME.includes(cleanMime) || cleanMime.startsWith('image/') || cleanMime.includes('pdf') || cleanMime === 'application/octet-stream' || /\.(jpe?g|png|webp|pdf|bmp|tiff)$/i.test(file.originalname || ''));

  if (isPhoto || isVideo || isDoc) {
    cb(null, true);
  } else {
    cb(new Error(`نوع الملف غير مسموح (${file.mimetype}) - يُسمح بالصور JPG/PNG/WebP وفيديوهات MP4/WebM/MOV وملفات PDF`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB for mobile 4K/1080p video
});

// Initialize database and full-text search index
await initDb();
await ensureFtsTable();

// Initialize persistent JWT secret and environment defaults
getOrInitJwtSecret();
if (!process.env.ADMIN_PASSWORD_HASH) {
  process.env.ADMIN_PASSWORD_HASH = '$2b$10$bNpheeFBkTWNE1sDaCkmcuLCYEYzuHbmA/BVAvsHawdBrLTlhOgcG';
}
if (process.env.NODE_ENV === 'production' && isDefaultAdminPassword()) {
  console.warn('⚠️ تحذير أمني: المنظومة تعمل بكلمة المرور الافتراضية للمدير (123456). يُرجى تغييرها فوراً.');
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// 0. Auth — Login (public)
app.post('/api/auth/login', handleLogin);
app.post('/api/auth/qr-login', handleQrLogin);

// 0.1 Current Authenticated User Info
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    let userRow = null;
    if (req.user && req.user.id) {
      userRow = await get('SELECT id, username, full_name, role, qr_login_token, account_fingerprint, created_at FROM users WHERE id = ?', [req.user.id]);
    }
    if (!userRow && req.user && req.user.username) {
      userRow = await get('SELECT id, username, full_name, role, qr_login_token, account_fingerprint, created_at FROM users WHERE username = ? COLLATE NOCASE', [req.user.username]);
    }
    if (userRow) {
      return res.json({ user: userRow });
    }
    res.json({ user: req.user });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب بيانات المستخدم' });
  }
});

// 0.2 Change Password for Currently Logged-in User
app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'كلمة المرور الحالية وكلمة المرور الجديدة مطلوبتان' });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'كلمة المرور الجديدة يجب ألا تقل عن 4 أحرف أو أرقام' });
    }

    const userId = req.user.id;
    let userRow = null;
    if (userId) {
      userRow = await get('SELECT * FROM users WHERE id = ?', [userId]);
    }
    if (!userRow && req.user.username) {
      userRow = await get('SELECT * FROM users WHERE username = ? COLLATE NOCASE', [req.user.username]);
    }

    if (!userRow) {
      const defaultHash = '$2b$10$bNpheeFBkTWNE1sDaCkmcuLCYEYzuHbmA/BVAvsHawdBrLTlhOgcG';
      const validOld = await comparePassword(oldPassword, defaultHash);
      if (!validOld) {
        return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
      }
      const newHash = await hashPassword(newPassword);
      await run(
        'INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
        ['admin', newHash, 'مدير المنظومة', 'admin']
      );
      return res.json({ message: 'تم تحديث كلمة المرور بنجاح' });
    }

    const validOld = await comparePassword(oldPassword, userRow.password_hash);
    if (!validOld) {
      return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
    }

    const newHash = await hashPassword(newPassword);
    await run('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newHash, userRow.id]);

    res.json({ message: 'تم تحديث كلمة المرور بنجاح' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'خطأ أثناء تغيير كلمة المرور' });
  }
});

// 0.3 Users Management (Admin Only)
app.get('/api/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const users = await query('SELECT id, username, full_name, role, qr_login_token, account_fingerprint, created_at, updated_at FROM users ORDER BY id ASC');
    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'خطأ في جلب قائمة المستخدمين' });
  }
});

app.post('/api/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { username, password, full_name, role } = req.body;
    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'اسم المستخدم مطلوب' });
    }
    if (!password || password.trim().length < 4) {
      return res.status(400).json({ error: 'كلمة المرور مطلوبة ويجب ألا تقل عن 4 رموز' });
    }
    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'الاسم الكامل مطلوب' });
    }

    const cleanUsername = username.trim();
    const existing = await get('SELECT id FROM users WHERE username = ? COLLATE NOCASE', [cleanUsername]);
    if (existing) {
      return res.status(400).json({ error: 'اسم المستخدم مسجل بالفعل، يرجى اختيار اسم آخر' });
    }

    const allowedRoles = ['admin', 'officer', 'operator'];
    const assignedRole = allowedRoles.includes(role) ? role : 'officer';
    const pwdHash = await hashPassword(password.trim());
    const qrToken = crypto.randomBytes(32).toString('hex');
    const prefix = assignedRole === 'admin' ? 'AD' : (assignedRole === 'officer' ? 'OF' : 'OP');
    const hashStr = crypto.createHash('sha256').update(`${cleanUsername}-${Date.now()}`).digest('hex').substring(0, 4).toUpperCase();
    const accountFingerprint = `${prefix}${hashStr}`;

    const result = await run(
      'INSERT INTO users (username, password_hash, full_name, role, qr_login_token, account_fingerprint) VALUES (?, ?, ?, ?, ?, ?)',
      [cleanUsername, pwdHash, full_name.trim(), assignedRole, qrToken, accountFingerprint]
    );

    logAudit(req, {
      action_type: 'CREATE_USER',
      entity_type: 'user',
      entity_id: result.lastID,
      entity_name: cleanUsername,
      details: `إنشاء حساب مستخدم جديد: ${cleanUsername} (${full_name.trim()}) بصلاحية ${assignedRole} وبصمة ${accountFingerprint}`,
    });

    res.status(201).json({
      message: 'تم إنشاء الحساب بنجاح',
      user: {
        id: result.lastID,
        username: cleanUsername,
        full_name: full_name.trim(),
        role: assignedRole,
        account_fingerprint: accountFingerprint,
        qr_login_token: qrToken
      }
    });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'خطأ في إنشاء الحساب' });
  }
});

// Regenerate QR Login Token for a user (Admin Only)
app.post('/api/users/:id/regenerate-qr', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const user = await get('SELECT id, username, full_name FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    const newQrToken = crypto.randomBytes(32).toString('hex');
    await run(
      'UPDATE users SET qr_login_token = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newQrToken, userId]
    );

    logAudit(req, {
      action_type: 'REGENERATE_QR_TOKEN',
      entity_type: 'user',
      entity_id: userId,
      entity_name: user.username,
      details: `تجديد الرمز الأمني لبطاقة الهوية الذكية للمستخدم: ${user.username} (${user.full_name}) وإلغاء البطاقة السابقة`,
    });

    res.json({
      message: 'تم تجديد الرمز الأمني للبطاقة بنجاح وإلغاء الكارت القديم فوراً',
      qr_login_token: newQrToken
    });
  } catch (err) {
    console.error('Regenerate QR token error:', err);
    res.status(500).json({ error: 'خطأ في تجديد رمز بطاقة الهوية' });
  }
});

app.put('/api/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { full_name, role, password } = req.body;

    const user = await get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    const allowedRoles = ['admin', 'officer', 'operator'];
    let newRole = user.role;
    if (role && allowedRoles.includes(role)) {
      if (user.role === 'admin' && role !== 'admin') {
        const adminCount = await get('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
        if (adminCount.count <= 1) {
          return res.status(400).json({ error: 'لا يمكن خفض صلاحية مدير المنظومة الوحيد' });
        }
      }
      newRole = role;
    }

    const newFullName = full_name ? full_name.trim() : user.full_name;

    if (password && password.trim().length >= 4) {
      const newHash = await hashPassword(password.trim());
      await run(
        'UPDATE users SET full_name = ?, role = ?, password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newFullName, newRole, newHash, userId]
      );
    } else {
      await run(
        'UPDATE users SET full_name = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newFullName, newRole, userId]
      );
    }

    logAudit(req, {
      action_type: 'UPDATE_USER',
      entity_type: 'user',
      entity_id: userId,
      entity_name: user.username,
      details: `تعديل بيانات الحساب: ${user.username} (الاسم: ${newFullName}، الصلاحية: ${newRole}${password ? '، تم تغيير كلمة المرور' : ''})`,
    });

    res.json({
      message: 'تم تحديث بيانات الحساب بنجاح',
      user: {
        id: userId,
        username: user.username,
        full_name: newFullName,
        role: newRole
      }
    });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'خطأ في تحديث الحساب' });
  }
});

app.delete('/api/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);

    if (req.user && req.user.id === userId) {
      return res.status(400).json({ error: 'لا يمكن حذف الحساب الحالي المسجل به الدخول' });
    }

    const user = await get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    if (user.role === 'admin') {
      const adminCount = await get('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
      if (adminCount.count <= 1) {
        return res.status(400).json({ error: 'لا يمكن حذف آخر حساب مدير للنظام' });
      }
    }

    await run('DELETE FROM users WHERE id = ?', [userId]);

    logAudit(req, {
      action_type: 'DELETE_USER',
      entity_type: 'user',
      entity_id: userId,
      entity_name: user.username,
      details: `حذف حساب المستخدم: ${user.username} (${user.full_name})`,
    });

    res.json({ message: 'تم حذف الحساب بنجاح' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'خطأ في حذف الحساب' });
  }
});

// 1. Network Information (public — kiosk needs LAN info)
app.get('/api/network-info', (req, res) => {
  const ips = getLocalIpAddresses();
  const primaryIp = ips.length > 0 ? ips[0].ip : 'localhost';
  res.json({
    port: PORT,
    primaryIp,
    addresses: ips,
    localUrl: `http://localhost:${PORT}`,
    networkUrl: `http://${primaryIp}:${PORT}`,
  });
});

// 1.1 Company Colors Settings (GET public so Kiosk & Dashboard can read; POST requires auth)
app.get('/api/settings/company-colors', async (req, res) => {
  try {
    const row = await get(`SELECT value FROM settings WHERE key = 'company_colors'`);
    if (row && row.value) {
      return res.json(JSON.parse(row.value));
    }
    const defaultColors = [
      { id: 'c1', match: 'الأولى', name: 'السرية الأولى ( ١ )', color: '#16a34a', textColor: '#ffffff' },
      { id: 'c2', match: 'الثانية', name: 'السرية الثانية ( ٢ )', color: '#dc2626', textColor: '#ffffff' },
      { id: 'c3', match: 'الثالثة', name: 'السرية الثالثة ( ٣ )', color: '#2563eb', textColor: '#ffffff' },
      { id: 'c4', match: 'الرابعة', name: 'السرية الرابعة ( ٤ )', color: '#ffffff', textColor: '#000000' },
      { id: 'c5', match: 'الخامسة', name: 'السرية الخامسة ( ٥ )', color: '#f97316', textColor: '#000000' },
      { id: 'c6', match: 'السادسة', name: 'السرية السادسة ( ٦ )', color: '#38bdf8', textColor: '#000000' },
      { id: 'sec', match: 'أمن', name: 'سرية الأمن', color: '#0f172a', textColor: '#facc15' },
      { id: 'base', match: 'أساسية', name: 'القوة الأساسية', color: '#1e1b4b', textColor: '#38bdf8' }
    ];
    res.json(defaultColors);
  } catch (err) {
    console.error('Error fetching company colors:', err);
    res.status(500).json({ error: 'خطأ في جلب ألوان السرايا' });
  }
});

app.post('/api/settings/company-colors', requireAuth, async (req, res) => {
  try {
    const colors = req.body;
    if (!Array.isArray(colors)) {
      return res.status(400).json({ error: 'البيانات المرسلة يجب أن تكون مصفوفة' });
    }
    const jsonStr = JSON.stringify(colors);
    await run(
      `INSERT INTO settings (key, value, updated_at) VALUES ('company_colors', ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      [jsonStr]
    );
    res.json({ message: 'تم حفظ ألوان السرايا بنجاح', colors });
  } catch (err) {
    console.error('Error saving company colors:', err);
    res.status(500).json({ error: 'خطأ في حفظ ألوان السرايا' });
  }
});

// 2. Dashboard Statistics (protected)
app.get('/api/stats', requireAuth, async (req, res) => {
  try {
    const activeBatch = await get(`SELECT * FROM batches WHERE active = 1 LIMIT 1`);
    const totalRecruitsRow = await get(`SELECT COUNT(*) as count FROM recruits`);
    const today = new Date().toISOString().split('T')[0];
    const todayRecruitsRow = await get(
      `SELECT COUNT(*) as count FROM recruits WHERE attendance_date = ? OR DATE(created_at) = ?`,
      [today, today]
    );

    let activeBatchCount = 0;
    if (activeBatch) {
      const activeCountRow = await get(
        `SELECT COUNT(*) as count FROM recruits WHERE batch_id = ?`,
        [activeBatch.id]
      );
      activeBatchCount = activeCountRow ? activeCountRow.count : 0;
    }

    const withPhotoRow = await get(`SELECT COUNT(*) as count FROM recruits WHERE photo_path IS NOT NULL AND photo_path != ''`);
    const withVideoRow = await get(`SELECT COUNT(*) as count FROM recruits WHERE video_path IS NOT NULL AND video_path != ''`);

    // Separate counts for:
    // 1. Regular 6 companies (المستجدين الـ 6 سرايا)
    // 2. سرية الأمن
    // 3. القوة الأساسية
    const securityCompanyRow = await get(`SELECT COUNT(*) as count FROM recruits WHERE company LIKE '%أمن%'`);
    const baseForceRow = await get(`SELECT COUNT(*) as count FROM recruits WHERE company LIKE '%أساسية%' OR company LIKE '%اساسية%'`);
    const regularRecruitsRow = await get(`
      SELECT COUNT(*) as count FROM recruits 
      WHERE company NOT LIKE '%أمن%' AND company NOT LIKE '%أساسية%' AND company NOT LIKE '%اساسية%'
    `);

    res.json({
      totalRecruits: totalRecruitsRow.count,
      todayRecruits: todayRecruitsRow.count,
      activeBatch: activeBatch || null,
      activeBatchRecruits: activeBatchCount,
      withPhoto: withPhotoRow.count,
      withVideo: withVideoRow.count,
      // Separate Unit counts:
      regularRecruits: regularRecruitsRow.count,
      securityCompanyRecruits: securityCompanyRow.count,
      baseForceRecruits: baseForceRow.count,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'خطأ في جلب الإحصائيات' });
  }
});

// 2.1 Aggregated Data Analytics Endpoint (protected)
app.get('/api/analytics', requireAuth, async (req, res) => {
  try {
    const qualRows = await query(`
      SELECT qualification, COUNT(*) as count 
      FROM recruits 
      GROUP BY qualification 
      ORDER BY count DESC
    `);

    const batchRows = await query(`
      SELECT b.id, b.name, b.month, b.year, COUNT(r.id) as count
      FROM batches b
      LEFT JOIN recruits r ON b.id = r.batch_id
      GROUP BY b.id
      ORDER BY b.year ASC, b.month ASC
    `);

    const medicalTotal = await get(`SELECT COUNT(*) as total FROM recruits`);
    const healthyCount = await get(`
      SELECT COUNT(*) as count 
      FROM recruits 
      WHERE ${SQL_MEDICAL_FIT}
    `);

    const jobsRows = await query(`
      SELECT current_job, COUNT(*) as count
      FROM recruits
      WHERE current_job IS NOT NULL AND current_job != ''
      GROUP BY current_job
      ORDER BY count DESC
      LIMIT 8
    `);

    // Extract governorates
    const recruits = await query(`SELECT address FROM recruits`);
    const govCounts = {};
    const knownGovs = ['الغربية', 'المنوفية', 'كفر الشيخ', 'الدقهلية', 'البحيرة', 'القاهرة', 'الجيزة', 'الإسكندرية', 'الشرقية', 'القليوبية'];
    for (const r of recruits) {
      let matched = false;
      if (r.address) {
        for (const g of knownGovs) {
          if (r.address.includes(g)) {
            govCounts[g] = (govCounts[g] || 0) + 1;
            matched = true;
            break;
          }
        }
      }
      if (!matched) govCounts['أخرى / لم تحدد'] = (govCounts['أخرى / لم تحدد'] || 0) + 1;
    }

    const governorates = Object.keys(govCounts).map(k => ({ name: k, count: govCounts[k] }));

    res.json({
      qualifications: qualRows,
      batches: batchRows,
      medical: {
        total: medicalTotal?.total || 0,
        healthy: healthyCount?.count || 0,
        withNotes: Math.max(0, (medicalTotal?.total || 0) - (healthyCount?.count || 0))
      },
      jobs: jobsRows,
      governorates
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ error: 'خطأ في جلب بيانات التحليلات' });
  }
});

// 2.2 Hybrid AI & Search Chat Endpoint (protected)
app.post('/api/chat', requireAuth, async (req, res) => {
  const { message, stream } = req.body || {};
  if (!message || !message.trim()) return res.status(400).json({ error: 'نص الاستفسار مطلوب' });

  // Check if client expects standard JSON instead of SSE streaming
  const wantsJson = stream === false || req.headers.accept?.includes('application/json');

  if (!wantsJson) {
    // Initialize SSE streaming headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
  }

  // Lazily ensure local AI engine is starting if assets are available
  if (modelManager.hasAssets && modelManager.state !== 'ready' && modelManager.state !== 'loading') {
    modelManager.start().catch(() => {});
  }

  const sendEvent = (type, content) => {
    if (!wantsJson && !res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type, content })}\n\n`);
    }
  };

  try {
    sendEvent('THOUGHT', 'تحليل الاستفسار بالعامية المصرية واستخراج الكيانات والمحددات...');

    // Route query through hybrid deterministic + AI router
    const result = await routeUserQuery(message);

    if (result.statusLabel) {
      sendEvent('THOUGHT', result.statusLabel);
    }

    if (wantsJson) {
      return res.json({
        reply: result.responseText,
        dataSummary: {
          intent: result.intent,
          mode: result.mode,
          matchCount: result.matchCount
        },
        suggestions: result.suggestions || []
      });
    }

    sendEvent('THOUGHT', 'اكتمال المعالجة وصياغة التقرير الإحصائي النهائي.');

    // Stream the final response chunk by chunk for smooth UI rendering
    const chunks = result.responseText.split('\n');
    for (let i = 0; i < chunks.length; i++) {
      const piece = (i > 0 ? '\n' : '') + chunks[i];
      sendEvent('FINAL_RESPONSE', piece);
      await new Promise(r => setTimeout(r, 10));
    }

    // Stream follow-up suggestions
    for (const s of (result.suggestions || [])) {
      sendEvent('SUGGESTION', s);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Chat error:', err);
    if (wantsJson) {
      return res.status(500).json({ error: `عذراً، حدث خطأ أثناء معالجة الاستفسار: ${err.message}` });
    }
    sendEvent('FINAL_RESPONSE', `عذراً، حدث خطأ أثناء معالجة الاستفسار: ${err.message}`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// 2.3 AI Status Endpoint (protected)
app.get('/api/ai/status', requireAuth, (req, res) => {
  res.json(modelManager.getStatus());
});

// 2.4 Seed Sample Recruits Endpoint (protected admin)
app.post('/api/ai/seed-sample-data', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { seedSampleRecruitsIfEmpty } = await import('./ai/sampleData.js');
    const result = await seedSampleRecruitsIfEmpty(true);
    res.json({ success: true, message: 'تم إدراج البيانات النموذجية للمجندين بنجاح', ...result });
  } catch (err) {
    res.status(500).json({ error: `فشل إدراج البيانات النموذجية: ${err.message}` });
  }
});

// 3. Batches Management (public GET for kiosk, protected POST/PUT)
app.get('/api/batches', async (req, res) => {
  try {
    const batches = await query(`
      SELECT b.*, COUNT(r.id) as recruits_count
      FROM batches b
      LEFT JOIN recruits r ON b.id = r.batch_id
      GROUP BY b.id
      ORDER BY b.year DESC, b.month DESC
    `);
    res.json(batches);
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ error: 'خطأ في جلب الدفوع التجنيدية' });
  }
});

app.post('/api/batches', requireAuth, async (req, res) => {
  try {
    const { name, year, month, active, notes } = req.body;
    if (!name || !year || !month) {
      return res.status(400).json({ error: 'اسم الدفع والسنة والشهر مطلوبة' });
    }

    if (active) {
      await run(`UPDATE batches SET active = 0`);
    }

    const result = await run(
      `INSERT INTO batches (name, year, month, active, notes) VALUES (?, ?, ?, ?, ?)`,
      [name, year, month, active ? 1 : 0, notes || '']
    );

    const created = await get(`SELECT * FROM batches WHERE id = ?`, [result.lastID]);

    logAudit(req, {
      action_type: 'CREATE_BATCH',
      entity_type: 'batch',
      entity_id: result.lastID,
      entity_name: name,
      details: `إضافة دفعة تجنيد جديدة: ${name} (${year}/${month})${active ? ' وتفعيلها كدفعة حالية' : ''}`,
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating batch:', error);
    res.status(500).json({ error: 'خطأ في إضافة الدفع التجنيدي' });
  }
});

app.put('/api/batches/:id/set-active', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await run(`UPDATE batches SET active = 0`);
    await run(`UPDATE batches SET active = 1 WHERE id = ?`, [id]);
    const updated = await get(`SELECT * FROM batches WHERE id = ?`, [id]);

    logAudit(req, {
      action_type: 'ACTIVATE_BATCH',
      entity_type: 'batch',
      entity_id: id,
      entity_name: updated ? updated.name : id,
      details: `تفعيل دفعة التجنيد كدفعة حالية نشطة: ${updated ? updated.name : id}`,
    });

    res.json(updated);
  } catch (error) {
    console.error('Error activating batch:', error);
    res.status(500).json({ error: 'خطأ في تفعيل الدفع التجنيدي' });
  }
});

// 4. Recruits List & Advanced Search (protected)
app.get('/api/recruits', requireAuth, async (req, res) => {
  try {
    const { search, batch_id, qualification, company, attendance_date, category, distribution_sector, page = 1, limit = 50 } = req.query;
    const isUnlimited = limit === 'all' || parseInt(limit) >= 5000;
    const safeLimit = isUnlimited ? 10000 : Math.min(Math.max(parseInt(limit) || 50, 1), 500);
    const safePage = Math.max(parseInt(page) || 1, 1);
    let whereClauses = [];
    let params = [];

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      const raw = search.trim();
      const num = parseInt(raw, 10);
      whereClauses.push(`(r.name LIKE ? OR r.national_id LIKE ? OR r.recruit_code LIKE ? OR r.address LIKE ? OR r.current_job LIKE ? OR r.police_number LIKE ? OR r.military_number LIKE ? OR r.distribution_sector LIKE ? OR r.id = ?)`);
      params.push(s, s, s, s, s, s, s, s, isNaN(num) ? -1 : num);
    }

    if (batch_id && batch_id !== 'all') {
      whereClauses.push(`r.batch_id = ?`);
      params.push(batch_id);
    }

    if (qualification && qualification !== 'all') {
      whereClauses.push(`r.qualification = ?`);
      params.push(qualification);
    }

    if (company && company !== 'all') {
      whereClauses.push(`(r.company = ? OR r.company LIKE ?)`);
      params.push(company, `%${company}%`);
    }

    if (attendance_date && attendance_date !== 'all') {
      whereClauses.push(`r.attendance_date = ?`);
      params.push(attendance_date);
    }

    if (distribution_sector && distribution_sector !== 'all') {
      if (distribution_sector === 'unassigned') {
        whereClauses.push(`(r.distribution_sector IS NULL OR r.distribution_sector = '')`);
      } else {
        whereClauses.push(`(r.distribution_sector = ? OR r.distribution_sector LIKE ?)`);
        params.push(distribution_sector, `%${distribution_sector}%`);
      }
    }

    // Category filter: psychological, tickets, criminal_suspicion, political_suspicion, medical
    if (category && category !== 'all') {
      if (category === 'psychological') {
        whereClauses.push(`(r.is_psychological_case = 1 OR r.inspection LIKE '%نفسي%' OR r.inspection LIKE '%عصبي%' OR r.medical_status LIKE '%نفسي%' OR r.medical_status LIKE '%عصبي%' OR EXISTS (SELECT 1 FROM recruit_tickets t WHERE t.recruit_id = r.id AND t.ticket_type = 'psychological_condition' AND t.status = 'open'))`);
      } else if (category === 'tickets') {
        whereClauses.push(`EXISTS (SELECT 1 FROM recruit_tickets t WHERE t.recruit_id = r.id AND t.status = 'open')`);
      } else if (category === 'criminal_suspicion') {
        whereClauses.push(`(r.criminal_suspicion_status = 'اشتباه' OR r.criminal_suspicion_status = 'جاري الفحص' OR EXISTS (SELECT 1 FROM recruit_tickets t WHERE t.recruit_id = r.id AND t.ticket_type = 'criminal_suspicion' AND t.status = 'open') OR (r.family_security_status NOT LIKE '%خالية%' AND r.family_security_status LIKE '%جنائي%') OR r.inspection LIKE '%جنائي%')`);
      } else if (category === 'political_suspicion') {
        whereClauses.push(`(r.political_suspicion_status = 'اشتباه' OR r.political_suspicion_status = 'جاري الفحص' OR EXISTS (SELECT 1 FROM recruit_tickets t WHERE t.recruit_id = r.id AND t.ticket_type = 'political_suspicion' AND t.status = 'open') OR (r.family_security_status NOT LIKE '%خالية%' AND r.family_security_status LIKE '%سياسي%') OR r.inspection LIKE '%سياسي%')`);
      } else if (category === 'medical') {
        whereClauses.push(`((${SQL_MEDICAL_UNFIT}) OR EXISTS (SELECT 1 FROM recruit_activities a WHERE a.recruit_id = r.id AND a.activity_type = 'medical_referral' AND (a.return_date IS NULL OR a.return_date = '')) OR EXISTS (SELECT 1 FROM recruit_tickets t WHERE t.recruit_id = r.id AND t.ticket_type = 'medical_condition' AND t.status = 'open'))`);
      }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const offset = isUnlimited ? 0 : (safePage - 1) * safeLimit;

    const countRow = await get(`SELECT COUNT(*) as count FROM recruits r ${whereSql}`, params);
    const total = countRow ? countRow.count : 0;

    const listSql = `
      SELECT r.*, b.name as batch_name, b.year as batch_year, b.month as batch_month,
        (SELECT activity_type FROM recruit_activities WHERE recruit_id = r.id AND (return_date IS NULL OR return_date = '') ORDER BY id DESC LIMIT 1) as active_activity,
        (SELECT destination FROM recruit_activities WHERE recruit_id = r.id AND (return_date IS NULL OR return_date = '') ORDER BY id DESC LIMIT 1) as active_destination,
        (SELECT diagnosis FROM recruit_activities WHERE recruit_id = r.id ORDER BY id DESC LIMIT 1) as latest_diagnosis,
        (SELECT COUNT(*) FROM recruit_activities WHERE recruit_id = r.id) as activities_count,
        (SELECT COUNT(*) FROM recruit_tickets WHERE recruit_id = r.id AND status = 'open') as open_tickets_count,
        (SELECT ticket_type FROM recruit_tickets WHERE recruit_id = r.id AND status = 'open' ORDER BY id DESC LIMIT 1) as active_ticket_type,
        (SELECT severity FROM recruit_tickets WHERE recruit_id = r.id AND status = 'open' ORDER BY id DESC LIMIT 1) as active_ticket_severity,
        (SELECT title FROM recruit_tickets WHERE recruit_id = r.id AND status = 'open' ORDER BY id DESC LIMIT 1) as active_ticket_title
      FROM recruits r
      JOIN batches b ON r.batch_id = b.id
      ${whereSql}
      ORDER BY r.id DESC
      LIMIT ? OFFSET ?
    `;
    const recruits = await query(listSql, [...params, safeLimit, offset]);

    res.json({
      recruits,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: isUnlimited ? 1 : Math.ceil(total / safeLimit)
    });
  } catch (error) {
    console.error('Error fetching recruits:', error);
    res.status(500).json({ error: 'خطأ في جلب بيانات المجندين' });
  }
});

// 4.1 Filter options for bulk export and advanced filters
app.get('/api/recruits/filter-options', requireAuth, async (req, res) => {
  try {
    const companies = await query(`
      SELECT DISTINCT company FROM recruits 
      WHERE company IS NOT NULL AND company != '' 
      ORDER BY company ASC
    `);
    const dates = await query(`
      SELECT DISTINCT attendance_date FROM recruits 
      WHERE attendance_date IS NOT NULL AND attendance_date != '' 
      ORDER BY attendance_date DESC
    `);
    const sectors = await query(`
      SELECT DISTINCT distribution_sector FROM recruits 
      WHERE distribution_sector IS NOT NULL AND distribution_sector != '' 
      ORDER BY distribution_sector ASC
    `);
    const OFFICIAL_DISTRIBUTION_SECTORS = [
      'رئاسة المنطقة',
      'قطاع أحمد عمارة',
      'قطاع عمر القاضي',
      'قطاع على خاطر',
      'قطاع جمال فايق',
      'مركز التدريب',
      'جهة خارجية',
      'عودة'
    ];
    res.json({
      companies: companies.map(c => c.company),
      attendance_dates: dates.map(d => d.attendance_date),
      distribution_sectors: sectors.map(s => s.distribution_sector),
      official_sectors: OFFICIAL_DISTRIBUTION_SECTORS
    });
  } catch (err) {
    console.error('Error fetching filter options:', err);
    res.status(500).json({ error: 'خطأ في جلب خيارات التصفية' });
  }
});

// 5. Get Single Recruit Dossier (protected)
app.get('/api/recruits/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const recruit = await get(`
      SELECT r.*, b.name as batch_name, b.year as batch_year, b.month as batch_month,
        (SELECT activity_type FROM recruit_activities WHERE recruit_id = r.id AND (return_date IS NULL OR return_date = '') ORDER BY id DESC LIMIT 1) as active_activity,
        (SELECT destination FROM recruit_activities WHERE recruit_id = r.id AND (return_date IS NULL OR return_date = '') ORDER BY id DESC LIMIT 1) as active_destination,
        (SELECT diagnosis FROM recruit_activities WHERE recruit_id = r.id ORDER BY id DESC LIMIT 1) as latest_diagnosis,
        (SELECT COUNT(*) FROM recruit_activities WHERE recruit_id = r.id) as activities_count
      FROM recruits r
      JOIN batches b ON r.batch_id = b.id
      WHERE r.id = ?
    `, [id]);

    if (!recruit) {
      return res.status(404).json({ error: 'لم يتم العثور على المجند' });
    }
    res.json(recruit);
  } catch (error) {
    console.error('Error fetching recruit:', error);
    res.status(500).json({ error: 'خطأ في جلب ملف المجند' });
  }
});

// Helper: clean up uploaded files on error
const cleanupUploadedFiles = (req) => {
  if (req.files) {
    Object.values(req.files).flat().forEach(f => {
      try { fs.unlinkSync(f.path); } catch(e) {}
    });
  }
};

// 6. Create Recruit with Multipart Photo and Video Upload
app.post('/api/recruits', requireAuth, upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  try {
    const data = req.body;

    // Validate required fields
    if (!data.name || !data.batch_id) {
      cleanupUploadedFiles(req);
      return res.status(400).json({ error: 'اسم المجند والدفع التجنيدي مطلوبان' });
    }

    // Validate national_id format (14 digits)
    const nationalId = (data.national_id || '').trim();
    if (nationalId && !/^\d{14}$/.test(nationalId)) {
      cleanupUploadedFiles(req);
      return res.status(400).json({ error: 'الرقم القومي يجب أن يكون 14 رقماً' });
    }

    let photoPath = '';
    let videoPath = '';

    // If uploaded as files via multer
    if (req.files) {
      if (req.files.photo && req.files.photo[0]) {
        photoPath = `/uploads/photos/${req.files.photo[0].filename}`;
      }
      if (req.files.video && req.files.video[0]) {
        videoPath = `/uploads/videos/${req.files.video[0].filename}`;
      }
    }

    // Support base64 photo if provided in body (validated)
    if (!photoPath && data.photo_base64) {
      const matches = data.photo_base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        const ALLOWED_BASE64_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
        if (ALLOWED_BASE64_TYPES.includes(mimeType)) {
          const buffer = Buffer.from(matches[2], 'base64');
          if (buffer.length <= 5 * 1024 * 1024) {
            const filename = `photo_${Date.now()}_${crypto.randomUUID()}.jpg`;
            const filePath = path.join(photosDir, filename);
            await fs.promises.writeFile(filePath, buffer);
            photoPath = `/uploads/photos/${filename}`;
          }
        }
      }
    }

    const attendanceDate = data.attendance_date || new Date().toISOString().split('T')[0];

    const sql = `
      INSERT INTO recruits (
        batch_id, attendance_date, name, religion, qualification,
        birth_date, wife, national_id, address, current_job,
        other_jobs, travel_abroad, literacy, inspection, medical_status,
        father_name, father_job, mother_name, mother_job, siblings_check,
        family_social_status, family_security_status, photo_path, video_path,
        police_number, military_number, company,
        political_suspicion_status, political_suspicion_details,
        criminal_suspicion_status, criminal_suspicion_details,
        distribution_sector,
        notes
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?,
        ?,
        ?
      )
    `;

    const params = [
      data.batch_id,
      attendanceDate,
      data.name.trim(),
      data.religion || 'مسلم',
      data.qualification || 'متوسط',
      data.birth_date || '',
      data.wife || 'أعزب',
      nationalId || null,
      data.address || '',
      data.current_job || '',
      data.other_jobs || '',
      data.travel_abroad || 'لم يسافر',
      data.literacy || 'يجيد',
      data.inspection || '',
      data.medical_status || 'لائق طبياً وسليم',
      data.father_name || '',
      data.father_job || '',
      data.mother_name || '',
      data.mother_job || '',
      data.siblings_check || '',
      data.family_social_status || 'مستقرة',
      data.family_security_status || 'خالية من السوابق والشبهات',
      photoPath,
      videoPath,
      data.police_number || '',
      data.military_number || '',
      data.company || '',
      data.political_suspicion_status || 'لا يوجد اشتباه',
      data.political_suspicion_details || '',
      data.criminal_suspicion_status || 'لا يوجد اشتباه',
      data.criminal_suspicion_details || '',
      data.distribution_sector || '',
      data.notes || ''
    ];

    const result = await run(sql, params);
    const permanentCode = 'REC-' + String(result.lastID).padStart(7, '0');
    await run(`UPDATE recruits SET recruit_code = ? WHERE id = ?`, [permanentCode, result.lastID]);

    // Auto-create ticket if criminal suspicion exists
    if (data.criminal_suspicion_status === 'اشتباه') {
      const crimTitle = data.criminal_suspicion_details?.trim() || 'اشتباه جنائي مسجل عند القيد';
      await run(
        `INSERT INTO recruit_tickets (recruit_id, ticket_type, title, description, severity, status, officer_name)
         VALUES (?, 'criminal_suspicion', ?, ?, 'high', 'open', 'كشك التسجيل والفحص')`,
        [result.lastID, crimTitle.slice(0, 100), data.criminal_suspicion_details || crimTitle]
      );
    }

    // Auto-create ticket if political suspicion exists
    if (data.political_suspicion_status === 'اشتباه') {
      const polTitle = data.political_suspicion_details?.trim() || 'اشتباه سياسي مسجل عند القيد';
      await run(
        `INSERT INTO recruit_tickets (recruit_id, ticket_type, title, description, severity, status, officer_name)
         VALUES (?, 'political_suspicion', ?, ?, 'high', 'open', 'كشك التسجيل والفحص')`,
        [result.lastID, polTitle.slice(0, 100), data.political_suspicion_details || polTitle]
      );
    }

    const created = await get(`SELECT * FROM recruits WHERE id = ?`, [result.lastID]);

    logAudit(req, {
      action_type: 'CREATE_RECRUIT',
      entity_type: 'recruit',
      entity_id: created.id,
      entity_name: created.name,
      details: `تسجيل مجند جديد: ${created.name} (رقم عسكري: ${created.military_number || 'ـ'}، سرية: ${created.company || 'ـ'})`,
    });

    console.log(`✅ تم تسجيل مجند جديد بنجاح: ${created.name} (ID: ${created.id})`);
    notifyDataChanged();
    res.status(201).json(created);
  } catch (error) {
    console.error('Error saving recruit:', error);
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'الرقم القومي مسجل مسبقاً' });
    }
    res.status(500).json({ error: 'خطأ في حفظ بيانات المجند' });
  }
});

// 6.1 Preview Recruits from Markdown (.md) Dossiers
app.post('/api/recruits/preview-markdown', requireAuth, async (req, res) => {
  try {
    const { files, batch_id } = req.body;
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'لم يتم إرسال أي ملفات استمارات لمعاينتها' });
    }

    const items = [];
    for (const f of files) {
      const parsed = parseRecruitMarkdown(f.content, f.name || f.filename || 'recruit.md');
      if (!parsed.success) {
        items.push({
          filename: f.name || f.filename || 'recruit.md',
          status: 'invalid',
          error: parsed.error || 'ملف غير صالح',
          data: parsed.data || {}
        });
        continue;
      }

      const rec = parsed.data;
      let existingRecruit = null;
      if (rec.national_id) {
        existingRecruit = await get('SELECT id, name, national_id, company, qualification, batch_id FROM recruits WHERE national_id = ?', [rec.national_id]);
      }

      if (existingRecruit) {
        items.push({
          filename: f.name || f.filename || 'recruit.md',
          status: 'duplicate',
          error: `المجند مسجل مسبقاً باسم: ${existingRecruit.name} (رقم هوية: ${existingRecruit.national_id})`,
          existing_id: existingRecruit.id,
          existing_name: existingRecruit.name,
          data: rec
        });
      } else {
        items.push({
          filename: f.name || f.filename || 'recruit.md',
          status: 'ready',
          error: '',
          data: rec
        });
      }
    }

    res.json({
      success: true,
      total: items.length,
      ready_count: items.filter(i => i.status === 'ready').length,
      duplicate_count: items.filter(i => i.status === 'duplicate').length,
      invalid_count: items.filter(i => i.status === 'invalid').length,
      items
    });
  } catch (error) {
    console.error('Error previewing markdown recruits:', error);
    res.status(500).json({ error: 'خطأ أثناء فحص ومعاينة ملفات الاستمارات' });
  }
});

// 6.2 Commit / Import Recruits from Markdown (.md) Dossiers
app.post('/api/recruits/import-markdown', requireAuth, requireRole('admin', 'officer'), async (req, res) => {
  try {
    const { batch_id, recruits, on_duplicate = 'skip' } = req.body;
    if (!recruits || !Array.isArray(recruits) || recruits.length === 0) {
      return res.status(400).json({ error: 'لم يتم تحديد أي مجندين للاستيراد' });
    }

    // Determine target batch: requested batch_id or current active batch
    let targetBatchId = batch_id;
    if (!targetBatchId) {
      const activeBatch = await get('SELECT id FROM batches WHERE active = 1 ORDER BY id DESC LIMIT 1');
      if (activeBatch) {
        targetBatchId = activeBatch.id;
      } else {
        const firstBatch = await get('SELECT id FROM batches ORDER BY id ASC LIMIT 1');
        targetBatchId = firstBatch ? firstBatch.id : 1;
      }
    }

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors = [];
    const createdRecruits = [];

    for (const item of recruits) {
      const rec = item.data || item;
      const name = (rec.name || '').trim();
      if (!name) {
        skippedCount++;
        errors.push({ name: 'مجهول', error: 'اسم المجند مفقود' });
        continue;
      }

      const nationalId = rec.national_id ? String(rec.national_id).trim() : null;

      // Check existing by national_id
      let existing = null;
      if (nationalId) {
        existing = await get('SELECT id, name FROM recruits WHERE national_id = ?', [nationalId]);
      }

      if (existing) {
        if (on_duplicate === 'update') {
          // Update existing recruit
          await run(`
            UPDATE recruits SET
              name = ?, religion = ?, qualification = ?, birth_date = ?, wife = ?,
              address = ?, current_job = ?, other_jobs = ?, travel_abroad = ?,
              literacy = ?, inspection = ?, medical_status = ?, father_name = ?,
              father_job = ?, mother_name = ?, mother_job = ?, siblings_check = ?,
              family_social_status = ?, family_security_status = ?, police_number = ?,
              company = ?, is_psychological_case = ?, psychological_notes = ?,
              notes = CASE WHEN ? != '' THEN notes || '\n\n' || ? ELSE notes END,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [
            name,
            rec.religion || 'مسلم',
            rec.qualification || 'متوسط',
            rec.birth_date || '',
            rec.wife || 'أعزب',
            rec.address || '',
            rec.current_job || '',
            rec.other_jobs || '',
            rec.travel_abroad || 'لم يسافر',
            rec.literacy || 'يجيد',
            rec.inspection || 'سليم',
            rec.medical_status || 'لائق طبياً وسليم',
            rec.father_name || '',
            rec.father_job || '',
            rec.mother_name || '',
            rec.mother_job || '',
            rec.siblings_check || '',
            rec.family_social_status || 'مستقرة',
            rec.family_security_status || 'خالية من السوابق والشبهات',
            rec.police_number || '',
            rec.company || '',
            rec.is_psychological_case ? 1 : 0,
            rec.psychological_notes || '',
            rec.notes || '',
            rec.notes || '',
            existing.id
          ]);
          updatedCount++;
        } else {
          skippedCount++;
        }
        continue;
      }

      // Insert new recruit
      const attendanceDate = rec.attendance_date || new Date().toISOString().split('T')[0];
      const insertSql = `
        INSERT INTO recruits (
          batch_id, attendance_date, name, religion, qualification,
          birth_date, wife, national_id, address, current_job,
          other_jobs, travel_abroad, literacy, inspection, medical_status,
          father_name, father_job, mother_name, mother_job, siblings_check,
          family_social_status, family_security_status, photo_path, video_path,
          police_number, company, notes, is_psychological_case, psychological_notes
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?
        )
      `;

      const insertParams = [
        targetBatchId,
        attendanceDate,
        name,
        rec.religion || 'مسلم',
        rec.qualification || 'متوسط',
        rec.birth_date || '',
        rec.wife || 'أعزب',
        nationalId,
        rec.address || '',
        rec.current_job || '',
        rec.other_jobs || '',
        rec.travel_abroad || 'لم يسافر',
        rec.literacy || 'يجيد',
        rec.inspection || 'سليم',
        rec.medical_status || 'لائق طبياً وسليم',
        rec.father_name || '',
        rec.father_job || '',
        rec.mother_name || '',
        rec.mother_job || '',
        rec.siblings_check || '',
        rec.family_social_status || 'مستقرة',
        rec.family_security_status || 'خالية من السوابق والشبهات',
        '', // photo_path
        '', // video_path
        rec.police_number || '',
        rec.company || '',
        rec.notes || '',
        rec.is_psychological_case ? 1 : 0,
        rec.psychological_notes || ''
      ];

      const resInsert = await run(insertSql, insertParams);
      const permCode = 'REC-' + String(resInsert.lastID).padStart(7, '0');
      await run('UPDATE recruits SET recruit_code = ? WHERE id = ?', [permCode, resInsert.lastID]);

      importedCount++;
      createdRecruits.push({ id: resInsert.lastID, name, recruit_code: permCode });
    }

    logAudit(req, {
      action_type: 'IMPORT_MARKDOWN_RECRUITS',
      entity_type: 'recruit',
      entity_id: createdRecruits[0]?.id || 0,
      entity_name: `استيراد استمارات .md (${importedCount} مجند)`,
      details: `تم استيراد ${importedCount} مجند جديد، تحديث ${updatedCount}، تخطي ${skippedCount} مجند من ملفات Markdown`,
    });

    notifyDataChanged();

    res.json({
      success: true,
      message: `تمت عملية الاستيراد بنجاح: ${importedCount} جديد، ${updatedCount} تم تحديثه، ${skippedCount} تم تخطيه`,
      imported_count: importedCount,
      updated_count: updatedCount,
      skipped_count: skippedCount,
      total_processed: recruits.length,
      errors
    });
  } catch (error) {
    console.error('Error importing markdown recruits:', error);
    res.status(500).json({ error: 'خطأ أثناء استيراد وحفظ ملفات الاستمارات' });
  }
});


// 7. Update Recruit Details (protected - Admin & Officer only)
app.put('/api/recruits/:id', requireAuth, requireRole('admin', 'officer'), upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = await get(`SELECT * FROM recruits WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ error: 'المجند غير موجود' });
    }

    if (data.expected_updated_at && existing.updated_at &&
        data.expected_updated_at !== existing.updated_at) {
      return res.status(409).json({
        error: 'تم تعديل بيانات هذا المجند من جهاز آخر. يرجى تحديث الصفحة والمحاولة مرة أخرى.',
        code: 'CONCURRENT_MODIFICATION',
        serverUpdatedAt: existing.updated_at
      });
    }

    // Validate national_id format if provided
    if (data.national_id !== undefined && data.national_id !== null) {
      const nid = String(data.national_id).trim();
      if (nid && !/^\d{14}$/.test(nid)) {
        return res.status(400).json({ error: 'الرقم القومي يجب أن يكون 14 رقماً' });
      }
      data.national_id = nid || null;
    }

    let photoPath = existing.photo_path;
    let videoPath = existing.video_path;

    if (data.remove_photo === 'true' || data.remove_photo === true) {
      photoPath = '';
    }

    if (data.remove_video === 'true' || data.remove_video === true) {
      videoPath = '';
    }

    if (req.files) {
      if (req.files.photo && req.files.photo[0]) {
        photoPath = `/uploads/photos/${req.files.photo[0].filename}`;
      }
      if (req.files.video && req.files.video[0]) {
        videoPath = `/uploads/videos/${req.files.video[0].filename}`;
      }
    }

    if (data.photo_base64) {
      const matches = data.photo_base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        const ALLOWED_BASE64_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
        if (ALLOWED_BASE64_TYPES.includes(mimeType)) {
          const buffer = Buffer.from(matches[2], 'base64');
          if (buffer.length <= 5 * 1024 * 1024) {
            const filename = `photo_${Date.now()}_${crypto.randomUUID()}.jpg`;
            await fs.promises.writeFile(path.join(photosDir, filename), buffer);
            photoPath = `/uploads/photos/${filename}`;
          }
        }
      }
    }

    const sql = `
      UPDATE recruits SET
        batch_id = ?, attendance_date = ?, name = ?, religion = ?, qualification = ?,
        birth_date = ?, wife = ?, national_id = ?, address = ?, current_job = ?,
        other_jobs = ?, travel_abroad = ?, literacy = ?, inspection = ?, medical_status = ?,
        father_name = ?, father_job = ?, mother_name = ?, mother_job = ?, siblings_check = ?,
        family_social_status = ?, family_security_status = ?, photo_path = ?, video_path = ?,
        police_number = ?, military_number = ?, company = ?,
        political_suspicion_status = ?, political_suspicion_details = ?,
        criminal_suspicion_status = ?, criminal_suspicion_details = ?,
        distribution_sector = ?,
        notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const params = [
      data.batch_id || existing.batch_id,
      data.attendance_date || existing.attendance_date,
      data.name ? data.name.trim() : existing.name,
      data.religion || existing.religion,
      data.qualification || existing.qualification,
      data.birth_date ?? existing.birth_date,
      data.wife ?? existing.wife,
      data.national_id ?? existing.national_id,
      data.address ?? existing.address,
      data.current_job ?? existing.current_job,
      data.other_jobs ?? existing.other_jobs,
      data.travel_abroad ?? existing.travel_abroad,
      data.literacy ?? existing.literacy,
      data.inspection ?? existing.inspection,
      data.medical_status ?? existing.medical_status,
      data.father_name ?? existing.father_name,
      data.father_job ?? existing.father_job,
      data.mother_name ?? existing.mother_name,
      data.mother_job ?? existing.mother_job,
      data.siblings_check ?? existing.siblings_check,
      data.family_social_status ?? existing.family_social_status,
      data.family_security_status ?? existing.family_security_status,
      photoPath,
      videoPath,
      data.police_number ?? existing.police_number ?? '',
      data.military_number ?? existing.military_number ?? '',
      data.company ?? existing.company ?? '',
      data.political_suspicion_status ?? existing.political_suspicion_status ?? 'لا يوجد اشتباه',
      data.political_suspicion_details ?? existing.political_suspicion_details ?? '',
      data.criminal_suspicion_status ?? existing.criminal_suspicion_status ?? 'لا يوجد اشتباه',
      data.criminal_suspicion_details ?? existing.criminal_suspicion_details ?? '',
      data.distribution_sector ?? existing.distribution_sector ?? '',
      data.notes ?? existing.notes,
      id
    ];

    await run(sql, params);
    const updated = await get(`SELECT * FROM recruits WHERE id = ?`, [id]);

    let diffRes = { hasChanges: false, diff: {}, summary: '' };
    try {
      if (typeof computeRecruitDiff === 'function') {
        diffRes = computeRecruitDiff(existing, updated);
      }
    } catch (e) {
      console.warn('⚠️ تعذر حساب الفروق:', e.message);
    }

    if (diffRes && diffRes.hasChanges) {
      logAudit(req, {
        action_type: 'UPDATE_RECRUIT',
        entity_type: 'recruit',
        entity_id: id,
        entity_name: updated.name,
        details: `تعديل بيانات المجند ${updated.name}: ${diffRes.summary}`,
        diff_data: diffRes.diff
      });
    }

    notifyDataChanged();
    res.json(updated);
  } catch (error) {
    console.error('Error updating recruit:', error);
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'الرقم القومي مسجل مسبقاً' });
    }
    res.status(500).json({ error: 'خطأ في تعديل بيانات المجند' });
  }
});

// 7.1 Bulk Update Distribution Sectors (Excel Import or Batch Allocation)
app.post('/api/recruits/bulk-update-distribution', requireAuth, requireRole('admin', 'officer'), async (req, res) => {
  try {
    const { updates } = req.body;
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'قائمة تحديثات التوزيع مطلوبة' });
    }

    let updatedCount = 0;
    const errors = [];

    await run('BEGIN TRANSACTION');
    try {
      for (const item of updates) {
        const { id, distribution_sector } = item;
        if (!id || !distribution_sector) continue;
        const cleanSector = String(distribution_sector).trim();
        const r = await run(
          'UPDATE recruits SET distribution_sector = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [cleanSector, id]
        );
        if (r && r.changes > 0) {
          updatedCount++;
        }
      }
      await run('COMMIT');
    } catch (txErr) {
      await run('ROLLBACK');
      throw txErr;
    }

    logAudit(req, {
      action_type: 'BULK_UPDATE_DISTRIBUTION',
      entity_type: 'recruit',
      entity_id: 0,
      entity_name: 'تحديث توزيع قطاعات',
      details: `تم تحديث بيانات قطاع التوزيع لعدد (${updatedCount}) مجند من خلال استيراد ملف التوزيع الخارجي`,
    });

    notifyDataChanged();

    res.json({
      success: true,
      message: `تم تحديث توزيع (${updatedCount}) مجند بنجاح`,
      updatedCount
    });
  } catch (err) {
    console.error('Bulk update distribution error:', err);
    res.status(500).json({ error: 'خطأ أثناء تحديث بيانات التوزيع: ' + err.message });
  }
});

// 8. Delete Recruit (protected - Admin only)
app.delete('/api/recruits/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await get(`SELECT * FROM recruits WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ error: 'المجند غير موجود' });
    }

    await run(`DELETE FROM recruits WHERE id = ?`, [id]);

    // Cleanup media files if exist
    if (existing.photo_path) {
      const p = path.join(baseDir, existing.photo_path.replace(/^\/+/, ''));
      if (fs.existsSync(p)) try { fs.unlinkSync(p); } catch (e) { }
    }
    if (existing.video_path) {
      const v = path.join(baseDir, existing.video_path.replace(/^\/+/, ''));
      if (fs.existsSync(v)) try { fs.unlinkSync(v); } catch (e) { }
    }

    logAudit(req, {
      action_type: 'DELETE_RECRUIT',
      entity_type: 'recruit',
      entity_id: id,
      entity_name: existing.name,
      details: `حذف ملف المجند نهائياً: ${existing.name} (رقم عسكري: ${existing.military_number || 'ـ'})`,
    });

    notifyDataChanged();
    res.json({ message: 'تم حذف ملف المجند بنجاح' });
  } catch (error) {
    console.error('Error deleting recruit:', error);
    res.status(500).json({ error: 'خطأ في حذف المجند' });
  }
});

// 8.1 Bulk Delete Recruits (protected - Admin only)
app.post('/api/recruits/bulk-delete', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'قائمة المعرفات غير صالحة' });
    }
    const placeholders = ids.map(() => '?').join(',');
    const recruitsToDelete = await query(`SELECT id, name, photo_path, video_path FROM recruits WHERE id IN (${placeholders})`, ids);
    
    // Explicitly delete all child records to guarantee foreign key integrity
    await run(`DELETE FROM recruit_documents WHERE recruit_id IN (${placeholders})`, ids);
    await run(`DELETE FROM recruit_tickets WHERE recruit_id IN (${placeholders})`, ids);
    await run(`DELETE FROM recruit_activities WHERE recruit_id IN (${placeholders})`, ids);
    await run(`DELETE FROM recruits WHERE id IN (${placeholders})`, ids);
    for (const r of recruitsToDelete) {
      if (r.photo_path) {
        const p = path.join(baseDir, r.photo_path.replace(/^\/+/, ''));
        if (fs.existsSync(p)) try { fs.unlinkSync(p); } catch (e) {}
      }
      if (r.video_path) {
        const v = path.join(baseDir, r.video_path.replace(/^\/+/, ''));
        if (fs.existsSync(v)) try { fs.unlinkSync(v); } catch (e) {}
      }
    }

    logAudit(req, {
      action_type: 'BULK_DELETE_RECRUITS',
      entity_type: 'recruit',
      entity_id: ids.join(','),
      entity_name: `${ids.length} مجندين`,
      details: `حذف جماعي لعدد ${ids.length} مجندين (${recruitsToDelete.map(r => r.name).slice(0, 5).join('، ')}${recruitsToDelete.length > 5 ? '...' : ''})`,
    });

    notifyDataChanged();
    res.json({ message: `تم حذف ${ids.length} مجند بنجاح`, count: ids.length });
  } catch (error) {
    console.error('Error bulk deleting recruits:', error);
    res.status(500).json({ error: 'خطأ في الحذف المجمع' });
  }
});

// -------------------------------------------------------------
// 9. Recruit Activities & Medical Tracking (المتابعة والتحركات الطبية)
// -------------------------------------------------------------

// جلب سجل تحركات ومتابعة مجند معين
app.get('/api/recruits/:id/activities', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const activities = await query(
      `SELECT * FROM recruit_activities WHERE recruit_id = ? ORDER BY departure_date DESC, id DESC`,
      [id]
    );
    res.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'خطأ في استرجاع سجل المتابعة' });
  }
});

// تسجيل حركة / متابعة جديدة لمجند (مستشفى الشرطة، عيادة، مأمورية، إلخ - Admin & Officer only)
app.post('/api/recruits/:id/activities', requireAuth, requireRole('admin', 'officer'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      activity_type,
      destination,
      departure_date,
      return_date,
      diagnosis,
      medical_decision,
      notes,
      officer_name,
      report_photo_path,
      report_photo_base64
    } = req.body;

    if (!activity_type || !departure_date) {
      return res.status(400).json({ error: 'نوع الحركة وتاريخ القيام مطلوبان' });
    }

    let finalReportPhoto = report_photo_path || '';
    if (!finalReportPhoto && report_photo_base64) {
      const matches = report_photo_base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const buffer = Buffer.from(matches[2], 'base64');
        const filename = `report_${Date.now()}_${crypto.randomUUID()}.jpg`;
        await fs.promises.writeFile(path.join(docsDir, filename), buffer);
        finalReportPhoto = `/uploads/documents/${filename}`;
      }
    }

    const result = await run(
      `INSERT INTO recruit_activities 
        (recruit_id, activity_type, destination, departure_date, return_date, diagnosis, medical_decision, notes, officer_name, report_photo_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        activity_type,
        destination || '',
        departure_date,
        return_date || null,
        diagnosis || '',
        medical_decision || '',
        notes || '',
        officer_name || '',
        finalReportPhoto
      ]
    );

    const newActivity = await get(`SELECT * FROM recruit_activities WHERE id = ?`, [result.lastID]);
    const recruitRow = await get(`SELECT name, military_number FROM recruits WHERE id = ?`, [id]);

    logAudit(req, {
      action_type: 'ADD_ACTIVITY',
      entity_type: 'activity',
      entity_id: id,
      entity_name: recruitRow?.name || `مجند #${id}`,
      details: `تسجيل حركة (${activity_type === 'hospital' ? 'مستشفى الشرطة' : activity_type === 'clinic' ? 'عيادة' : activity_type}) للمجند ${recruitRow?.name || id}: جهة الذهاب (${destination || 'ـ'})، تشخيص: (${diagnosis || 'ـ'})`,
    });

    res.status(201).json(newActivity);
  } catch (error) {
    console.error('Error adding activity:', error);
    res.status(500).json({ error: 'خطأ في تسجيل حركة المتابعة' });
  }
});

// تحديث حركة متابعة (تسجيل عودة، إضافة تشخيص، إلخ - Admin & Officer only)
app.put('/api/activities/:activityId', requireAuth, requireRole('admin', 'officer'), async (req, res) => {
  try {
    const { activityId } = req.params;
    const {
      activity_type,
      destination,
      departure_date,
      return_date,
      diagnosis,
      medical_decision,
      notes,
      officer_name,
      report_photo_path,
      report_photo_base64
    } = req.body;

    const existing = await get(`SELECT * FROM recruit_activities WHERE id = ?`, [activityId]);
    if (!existing) {
      return res.status(404).json({ error: 'سجل المتابعة غير موجود' });
    }

    let finalReportPhoto = report_photo_path !== undefined ? report_photo_path : existing.report_photo_path;
    if (report_photo_base64) {
      const matches = report_photo_base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const buffer = Buffer.from(matches[2], 'base64');
        const filename = `report_${Date.now()}_${crypto.randomUUID()}.jpg`;
        await fs.promises.writeFile(path.join(docsDir, filename), buffer);
        finalReportPhoto = `/uploads/documents/${filename}`;
      }
    }

    await run(
      `UPDATE recruit_activities SET
        activity_type = COALESCE(?, activity_type),
        destination = COALESCE(?, destination),
        departure_date = COALESCE(?, departure_date),
        return_date = ?,
        diagnosis = COALESCE(?, diagnosis),
        medical_decision = COALESCE(?, medical_decision),
        notes = COALESCE(?, notes),
        officer_name = COALESCE(?, officer_name),
        report_photo_path = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        activity_type,
        destination,
        departure_date,
        return_date !== undefined ? return_date : existing.return_date,
        diagnosis,
        medical_decision,
        notes,
        officer_name,
        finalReportPhoto,
        activityId
      ]
    );

    const updated = await get(`SELECT * FROM recruit_activities WHERE id = ?`, [activityId]);
    const recruitRow = await get(`SELECT name FROM recruits WHERE id = ?`, [existing.recruit_id]);

    logAudit(req, {
      action_type: 'UPDATE_ACTIVITY',
      entity_type: 'activity',
      entity_id: existing.recruit_id,
      entity_name: recruitRow?.name || `مجند #${existing.recruit_id}`,
      details: `تحديث متابعة للمجند ${recruitRow?.name || existing.recruit_id}: تسجيل عودة / قرار طبي (${medical_decision || updated.medical_decision || 'ـ'})`,
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating activity:', error);
    res.status(500).json({ error: 'خطأ في تحديث سجل المتابعة' });
  }
});

// حذف حركة متابعة (Admin & Officer)
app.delete('/api/activities/:activityId', requireAuth, requireRole('admin', 'officer'), async (req, res) => {
  try {
    const { activityId } = req.params;
    const existing = await get(`SELECT * FROM recruit_activities WHERE id = ?`, [activityId]);
    if (!existing) {
      return res.status(404).json({ error: 'سجل المتابعة غير موجود' });
    }

    const recruitRow = await get(`SELECT name FROM recruits WHERE id = ?`, [existing.recruit_id]);
    await run(`DELETE FROM recruit_activities WHERE id = ?`, [activityId]);

    logAudit(req, {
      action_type: 'DELETE_ACTIVITY',
      entity_type: 'activity',
      entity_id: existing.recruit_id,
      entity_name: recruitRow?.name || `مجند #${existing.recruit_id}`,
      details: `حذف قيد متابعة للمجند ${recruitRow?.name || existing.recruit_id}`,
    });

    res.json({ message: 'تم حذف قيد المتابعة بنجاح' });
  } catch (error) {
    console.error('Error deleting activity:', error);
    res.status(500).json({ error: 'خطأ في حذف قيد المتابعة' });
  }
});

// -------------------------------------------------------------
// 9.5. Recruit Tickets & Security Alerts (نظام التيكتات وبلاغات الاشتباه ورفعها)
// -------------------------------------------------------------

// جلب تيكتات وبلاغات المجند
app.get('/api/recruits/:id/tickets', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const tickets = await query(
      `SELECT * FROM recruit_tickets WHERE recruit_id = ? ORDER BY id DESC`,
      [id]
    );
    res.json({ tickets });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'خطأ في جلب التيكتات' });
  }
});

// فتح تيكت جديد لمجند (اشتباه جنائي / سياسي / مرضي / نفسي وعصبي)
app.post('/api/recruits/:id/tickets', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { ticket_type, title, description, severity, officer_name } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'عنوان التيكت مطلوب' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'تفاصيل البلاغ / التيكت مطلوبة' });
    }

    const type = ticket_type || 'criminal_suspicion';
    const sev = severity || 'medium';

    const result = await run(
      `INSERT INTO recruit_tickets (recruit_id, ticket_type, title, description, severity, status, officer_name)
       VALUES (?, ?, ?, ?, ?, 'open', ?)`,
      [id, type, title.trim(), description.trim(), sev, officer_name || '']
    );

    // إذا كان التيكت حالة نفسية وعصبية، يتم تصنيف المجند تلقائياً للمتابعة الدورية
    if (type === 'psychological_condition') {
      await run(
        `UPDATE recruits SET is_psychological_case = 1, last_psychological_followup = CURRENT_TIMESTAMP WHERE id = ?`,
        [id]
      );
    }

    const newTicket = await get(`SELECT * FROM recruit_tickets WHERE id = ?`, [result.lastID]);
    const recruitRow = await get(`SELECT name, military_number FROM recruits WHERE id = ?`, [id]);

    logAudit(req, {
      action_type: 'CREATE_TICKET',
      entity_type: 'ticket',
      entity_id: id,
      entity_name: recruitRow?.name || `مجند #${id}`,
      details: `فتح تيكت/بلاغ (${title.trim()}) للمجند ${recruitRow?.name || id} - درجة الأهمية: ${sev} - نوع البلاغ: ${type}`,
    });

    res.status(201).json({ ticket: newTicket, message: 'تم فتح التيكت بنجاح' });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'خطأ في إنشاء التيكت' });
  }
});

// رفع التيكت (تسوية وإغلاق البلاغ)
app.put('/api/recruits/:id/tickets/:ticketId/resolve', requireAuth, async (req, res) => {
  try {
    const { id, ticketId } = req.params;
    const { resolution_notes, resolved_by, status } = req.body;

    const existing = await get(`SELECT * FROM recruit_tickets WHERE id = ? AND recruit_id = ?`, [ticketId, id]);
    if (!existing) {
      return res.status(404).json({ error: 'التيكت غير موجود' });
    }

    const targetStatus = status === 'cancelled' ? 'cancelled' : 'resolved';
    const defaultNote = targetStatus === 'cancelled'
      ? 'تم إلغاء التيكت وحفظ الموضوع رسمياً'
      : 'تم استيفاء الفحص والمتابعة ورفع البلاغ رسمياً';

    await run(
      `UPDATE recruit_tickets 
       SET status = ?,
           resolution_notes = ?,
           resolved_by = ?,
           resolved_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND recruit_id = ?`,
      [
        targetStatus,
        resolution_notes || defaultNote,
        resolved_by || '',
        ticketId,
        id
      ]
    );

    // إذا كان التيكت حالة نفسية، نتحقق إن مفيش تيكتات نفسية تانية مفتوحة
    if (existing.ticket_type === 'psychological_condition') {
      const remainingPsych = await get(
        `SELECT COUNT(*) as count FROM recruit_tickets WHERE recruit_id = ? AND ticket_type = 'psychological_condition' AND status = 'open'`,
        [id]
      );
      if (!remainingPsych || remainingPsych.count === 0) {
        await run(`UPDATE recruits SET is_psychological_case = 0 WHERE id = ?`, [id]);
      }
    }

    const updated = await get(`SELECT * FROM recruit_tickets WHERE id = ?`, [ticketId]);
    const recruitRow = await get(`SELECT name FROM recruits WHERE id = ?`, [id]);

    logAudit(req, {
      action_type: targetStatus === 'cancelled' ? 'CANCEL_TICKET' : 'RESOLVE_TICKET',
      entity_type: 'ticket',
      entity_id: id,
      entity_name: recruitRow?.name || `مجند #${id}`,
      details: `${targetStatus === 'cancelled' ? 'إلغاء' : 'رفع وتصفية'} التيكت/البلاغ (${existing.title}) للمجند ${recruitRow?.name || id}: ${resolution_notes || defaultNote}`,
    });

    res.json({ ticket: updated, message: targetStatus === 'cancelled' ? 'تم إلغاء التيكت بنجاح' : 'تم رفع التيكت بنجاح' });
  } catch (error) {
    console.error('Error resolving ticket:', error);
    res.status(500).json({ error: 'خطأ في رفع أو إلغاء التيكت' });
  }
});

// حذف تيكت نهائياً وإلغاؤه (Admin & Officer only)
app.delete('/api/recruits/:id/tickets/:ticketId', requireAuth, requireRole('admin', 'officer'), async (req, res) => {
  try {
    const { id, ticketId } = req.params;

    const existing = await get(`SELECT * FROM recruit_tickets WHERE id = ? AND recruit_id = ?`, [ticketId, id]);
    if (!existing) {
      return res.status(404).json({ error: 'التيكت المطلوب غير موجود' });
    }

    await run(`DELETE FROM recruit_tickets WHERE id = ? AND recruit_id = ?`, [ticketId, id]);

    // إذا كان التيكت حالة نفسية، نتحقق إن مفيش تيكتات نفسية تانية مفتوحة
    if (existing.ticket_type === 'psychological_condition') {
      const remainingPsych = await get(
        `SELECT COUNT(*) as count FROM recruit_tickets WHERE recruit_id = ? AND ticket_type = 'psychological_condition' AND status = 'open'`,
        [id]
      );
      if (!remainingPsych || remainingPsych.count === 0) {
        await run(`UPDATE recruits SET is_psychological_case = 0 WHERE id = ?`, [id]);
      }
    }

    const recruitRow = await get(`SELECT name FROM recruits WHERE id = ?`, [id]);

    logAudit(req, {
      action_type: 'DELETE_TICKET',
      entity_type: 'ticket',
      entity_id: id,
      entity_name: recruitRow?.name || `مجند #${id}`,
      details: `حذف وإلغاء تيكت (${existing.title}) للمجند ${recruitRow?.name || id}`,
    });

    res.json({ message: 'تم حذف وإلغاء التيكت بنجاح' });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({ error: 'خطأ في حذف التيكت' });
  }
});

// تحديث حالة المتابعة النفسية والعصبية وتدوين متابعة دورية أو إلغاء الحالة
app.put('/api/recruits/:id/psychological-status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_psychological_case, psychological_notes, followup_action } = req.body;

    await run(
      `UPDATE recruits 
       SET is_psychological_case = ?,
           psychological_notes = ?,
           last_psychological_followup = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [is_psychological_case ? 1 : 0, is_psychological_case ? (psychological_notes || '') : '', id]
    );

    // إذا تم إلغاء الحالة النفسية، نقوم بإغلاق أي إحالات نفسية مفتوحة فوراً لكي لا يبقى المجند معلقاً كـ "بالمستشفى"
    if (!is_psychological_case) {
      await run(
        `UPDATE recruit_activities 
         SET return_date = CURRENT_TIMESTAMP,
             diagnosis = 'سليم ومستقر نفسياً وعصبياً',
             medical_decision = 'تم استقرار الحالة النفسية وإلغاء الاشتباه واعتباره لائقاً تماماً'
         WHERE recruit_id = ? AND (return_date IS NULL OR return_date = '') AND (destination LIKE '%نفسي%' OR diagnosis LIKE '%نفسي%')`,
        [id]
      );
    } else if (followup_action || psychological_notes) {
      // إذا تم تدوين متابعة دورية داخل المركز، نسجلها مع تاريخ انتهاء الجلسة حتى لا يُعتبر المجند غائباً بالمستشفى
      await run(
        `INSERT INTO recruit_activities (recruit_id, activity_type, destination, departure_date, return_date, diagnosis, medical_decision, notes)
         VALUES (?, 'mission', 'عيادة الفحص النفسي والعصبي بالمركز', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'فحص ومتابعة نفسية وعصبية دورية', 'مستقر وتحت المتابعة الدورية', ?)`,
        [id, psychological_notes || followup_action || '']
      );
    }

    const recruit = await get(`SELECT * FROM recruits WHERE id = ?`, [id]);

    logAudit(req, {
      action_type: 'UPDATE_PSYCHOLOGICAL',
      entity_type: 'recruit',
      entity_id: id,
      entity_name: recruit?.name || `مجند #${id}`,
      details: `تحديث المتابعة النفسية للمجند ${recruit?.name || id}: ${is_psychological_case ? 'مصنف حالة نفسية' : 'إلغاء الحالة النفسية (سليم ومستقر)'} - ملاحظات: ${psychological_notes || 'لا يوجد'}`,
    });

    res.json({ recruit, message: is_psychological_case ? 'تم حفظ وتحديث المتابعة النفسية' : 'تم إلغاء الحالة النفسية واعتبار المجند سليماً ومستقراً' });
  } catch (error) {
    console.error('Error updating psychological status:', error);
    res.status(500).json({ error: 'خطأ في تحديث الحالة النفسية للمجند' });
  }
});

// -------------------------------------------------------------
// 10. Analytics & Telemetry Overview (إحصائيات الإنفوجرافيك التفاعلية)
// -------------------------------------------------------------
app.get('/api/analytics/overview', requireAuth, async (req, res) => {
  try {
    const { batch_id } = req.query;
    let batchFilter = '';
    const params = [];

    if (batch_id && batch_id !== 'all') {
      batchFilter = 'WHERE batch_id = ?';
      params.push(batch_id);
    }

    // Execute all statistical telemetry queries concurrently in parallel
    const [
      totalRecruits,
      flaggedRecruits,
      psychologicalCases,
      activeTickets,
      criminalTickets,
      politicalTickets,
      companyDistribution,
      inHospitalNow,
      medicalDecisions,
      attendanceTrends,
      qualificationStats
    ] = await Promise.all([
      get(`SELECT COUNT(*) as count FROM recruits ${batchFilter}`, params),
      get(
        `SELECT COUNT(*) as count FROM recruits 
         ${batchFilter ? batchFilter + ' AND' : 'WHERE'} 
         (inspection LIKE '%ملاحظ%' OR inspection LIKE '%تحفظ%' OR family_security_status LIKE '%ملاحظ%' OR family_security_status LIKE '%تحفظ%')`,
        params
      ),
      get(
        `SELECT COUNT(*) as count FROM recruits 
         ${batchFilter ? batchFilter + ' AND' : 'WHERE'} 
         (is_psychological_case = 1 OR inspection LIKE '%نفسي%' OR inspection LIKE '%عصبي%' OR medical_status LIKE '%نفسي%' OR medical_status LIKE '%عصبي%' OR EXISTS (SELECT 1 FROM recruit_tickets t WHERE t.recruit_id = recruits.id AND t.ticket_type = 'psychological_condition' AND t.status = 'open'))`,
        params
      ),
      get(
        `SELECT COUNT(*) as count 
         FROM recruit_tickets t
         JOIN recruits r ON t.recruit_id = r.id
         ${batchFilter ? 'WHERE r.batch_id = ? AND' : 'WHERE'}
         t.status = 'open'`,
        params
      ),
      get(
        `SELECT COUNT(*) as count 
         FROM recruit_tickets t
         JOIN recruits r ON t.recruit_id = r.id
         ${batchFilter ? 'WHERE r.batch_id = ? AND' : 'WHERE'}
         t.status = 'open' AND t.ticket_type = 'criminal_suspicion'`,
        params
      ),
      get(
        `SELECT COUNT(*) as count 
         FROM recruit_tickets t
         JOIN recruits r ON t.recruit_id = r.id
         ${batchFilter ? 'WHERE r.batch_id = ? AND' : 'WHERE'}
         t.status = 'open' AND t.ticket_type = 'political_suspicion'`,
        params
      ),
      query(
        `SELECT company, COUNT(*) as count 
         FROM recruits 
         ${batchFilter}
         GROUP BY company 
         ORDER BY count DESC`,
        params
      ),
      get(
        `SELECT COUNT(DISTINCT r.id) as count 
         FROM recruit_activities a
         JOIN recruits r ON a.recruit_id = r.id
         ${batchFilter ? 'WHERE r.batch_id = ? AND' : 'WHERE'}
         a.activity_type = 'medical_referral' 
         AND (a.return_date IS NULL OR a.return_date = '')`,
        params
      ),
      query(
        `SELECT a.medical_decision, COUNT(*) as count 
         FROM recruit_activities a
         JOIN recruits r ON a.recruit_id = r.id
         ${batchFilter ? 'WHERE r.batch_id = ? AND' : 'WHERE'}
         a.medical_decision != '' AND a.medical_decision IS NOT NULL
         GROUP BY a.medical_decision`,
        params
      ),
      query(
        `SELECT attendance_date, COUNT(*) as count 
         FROM recruits 
         ${batchFilter}
         GROUP BY attendance_date 
         ORDER BY attendance_date DESC 
         LIMIT 7`,
        params
      ),
      query(
        `SELECT qualification, COUNT(*) as count 
         FROM recruits 
         ${batchFilter}
         GROUP BY qualification 
         ORDER BY count DESC 
         LIMIT 5`,
        params
      )
    ]);

    res.json({
      total: totalRecruits?.count || 0,
      flagged: flaggedRecruits?.count || 0,
      clean: Math.max(0, (totalRecruits?.count || 0) - (flaggedRecruits?.count || 0)),
      inHospitalNow: inHospitalNow?.count || 0,
      psychologicalCount: psychologicalCases?.count || 0,
      activeTicketsCount: activeTickets?.count || 0,
      criminalTicketsCount: criminalTickets?.count || 0,
      politicalTicketsCount: politicalTickets?.count || 0,
      companyDistribution: companyDistribution || [],
      medicalDecisions: medicalDecisions || [],
      attendanceTrends: (attendanceTrends || []).reverse(),
      qualificationStats: qualificationStats || []
    });
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    res.status(500).json({ error: 'خطأ في جلب تحليلات المنظومة' });
  }
});

// -------------------------------------------------------------
// 11. Recruit Scanned Documents (وثيقة التعارف والسجل العسكري)
// -------------------------------------------------------------

// جلب مستندات المجند الممسوحة ضوئياً
app.get('/api/recruits/:id/documents', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const docs = await query(
      `SELECT * FROM recruit_documents WHERE recruit_id = ? ORDER BY id ASC`,
      [id]
    );

    const recruit = await get(
      `SELECT id, name, id_doc_front_path, id_doc_back_path, military_record_path FROM recruits WHERE id = ?`,
      [id]
    );

    res.json({
      documents: docs,
      quickPaths: {
        id_doc_front: recruit?.id_doc_front_path || null,
        id_doc_back: recruit?.id_doc_back_path || null,
        military_record: recruit?.military_record_path || null
      }
    });
  } catch (error) {
    console.error('Error fetching recruit documents:', error);
    res.status(500).json({ error: 'خطأ في استرجاع الوثائق الممسوحة' });
  }
});

// رفع أو مسح وثيقة للمجند (يدعم ملف من الجهاز أو ماسح ضوئي Base64 - Admin & Officer only)
app.post('/api/recruits/:id/documents', requireAuth, requireRole('admin', 'officer'), upload.single('document'), async (req, res) => {
  try {
    const { id } = req.params;
    const { doc_type, title, notes, base64_data } = req.body;

    const existingRecruit = await get(`SELECT id FROM recruits WHERE id = ?`, [id]);
    if (!existingRecruit) {
      return res.status(404).json({ error: 'المجند غير موجود' });
    }

    let filePath = '';
    let fileName = '';
    let fileSize = 0;
    let mimeType = 'image/jpeg';

    if (req.file) {
      filePath = `uploads/documents/${req.file.filename}`;
      fileName = req.file.originalname;
      fileSize = req.file.size;
      mimeType = req.file.mimetype;
    } else if (base64_data) {
      // Direct Scanner / WebCam Base64 payload
      const matches = base64_data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: 'صيغة بيانات الصورة غير صحيحة' });
      }
      mimeType = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      const ext = mimeType.includes('png') ? '.png' : mimeType.includes('pdf') ? '.pdf' : '.jpg';
      const uniqueName = `scan_${Date.now()}_${crypto.randomUUID()}${ext}`;
      const fullPath = path.join(docsDir, uniqueName);
      fs.writeFileSync(fullPath, buffer);

      filePath = `uploads/documents/${uniqueName}`;
      fileName = title || `مسح_ضوئي_${Date.now()}${ext}`;
      fileSize = buffer.length;
    } else {
      return res.status(400).json({ error: 'يجب إرفاق ملف أو إرسال صورة ممسوحة' });
    }

    const docTitle = title || (
      doc_type === 'id_doc_front' ? 'وثيقة تعارف (الوجه الأول)' :
      doc_type === 'id_doc_back' ? 'وثيقة تعارف (الوجه الثاني)' :
      doc_type === 'military_record' ? 'أصل السجل العسكري' : 'مستند ضوئي'
    );

    // Save in recruit_documents table
    const result = await run(
      `INSERT INTO recruit_documents (recruit_id, doc_type, title, file_path, file_name, file_size, mime_type, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, doc_type || 'other', docTitle, filePath, fileName, fileSize, mimeType, notes || '']
    );

    // Update quick lookup columns in recruits table if applicable
    if (doc_type === 'id_doc_front') {
      await run(`UPDATE recruits SET id_doc_front_path = ? WHERE id = ?`, [filePath, id]);
    } else if (doc_type === 'id_doc_back') {
      await run(`UPDATE recruits SET id_doc_back_path = ? WHERE id = ?`, [filePath, id]);
    } else if (doc_type === 'military_record') {
      await run(`UPDATE recruits SET military_record_path = ? WHERE id = ?`, [filePath, id]);
    }

    const savedDoc = await get(`SELECT * FROM recruit_documents WHERE id = ?`, [result.lastID]);
    const recruitRow = await get(`SELECT name, military_number FROM recruits WHERE id = ?`, [id]);

    logAudit(req, {
      action_type: 'UPLOAD_DOCUMENT',
      entity_type: 'document',
      entity_id: id,
      entity_name: recruitRow?.name || `مجند #${id}`,
      details: `إضافة مستند ضوئي (${docTitle}) للمجند ${recruitRow?.name || id}`,
    });

    res.status(201).json(savedDoc);
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'خطأ في حفظ المستند الممسوح ضوئياً' });
  }
});

// حذف مستند (Admin only)
app.delete('/api/documents/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await get(`SELECT * FROM recruit_documents WHERE id = ?`, [id]);
    if (!doc) {
      return res.status(404).json({ error: 'المستند غير موجود' });
    }

    await run(`DELETE FROM recruit_documents WHERE id = ?`, [id]);

    // Clean up physical file
    if (doc.file_path) {
      const fullPath = path.join(baseDir, doc.file_path.replace(/^\/+/, ''));
      if (fs.existsSync(fullPath)) {
        try { fs.unlinkSync(fullPath); } catch (e) {}
      }
    }

    // Reset quick column in recruits table if matched
    if (doc.doc_type === 'id_doc_front') {
      await run(`UPDATE recruits SET id_doc_front_path = '' WHERE id = ? AND id_doc_front_path = ?`, [doc.recruit_id, doc.file_path]);
    } else if (doc.doc_type === 'id_doc_back') {
      await run(`UPDATE recruits SET id_doc_back_path = '' WHERE id = ? AND id_doc_back_path = ?`, [doc.recruit_id, doc.file_path]);
    } else if (doc.doc_type === 'military_record') {
      await run(`UPDATE recruits SET military_record_path = '' WHERE id = ? AND military_record_path = ?`, [doc.recruit_id, doc.file_path]);
    }

    const recruitRow = await get(`SELECT name FROM recruits WHERE id = ?`, [doc.recruit_id]);
    logAudit(req, {
      action_type: 'DELETE_DOCUMENT',
      entity_type: 'document',
      entity_id: doc.recruit_id,
      entity_name: recruitRow?.name || `مجند #${doc.recruit_id}`,
      details: `حذف مستند ضوئي (${doc.title}) للمجند ${recruitRow?.name || doc.recruit_id}`,
    });

    res.json({ message: 'تم حذف المستند بنجاح' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'خطأ في حذف المستند' });
  }
});

// -------------------------------------------------------------
// 11.5. Audit Logs & System History Tracking (سجل العمليات والرقابة والهيستوري)
// -------------------------------------------------------------

// جلب سجلات الرقابة مع التصفية والصفحات
app.get('/api/audit-logs', requireAuth, requireRole('admin', 'officer'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      action_type = '',
      user_id = '',
      from_date = '',
      to_date = ''
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      conditions.push(`(details LIKE ? OR entity_name LIKE ? OR username LIKE ? OR user_fullname LIKE ? OR ip_address LIKE ?)`);
      params.push(s, s, s, s, s);
    }

    if (action_type && action_type.trim()) {
      conditions.push(`action_type = ?`);
      params.push(action_type.trim());
    }

    if (user_id && user_id.trim()) {
      conditions.push(`user_id = ?`);
      params.push(user_id.trim());
    }

    if (from_date && from_date.trim()) {
      conditions.push(`created_at >= ?`);
      params.push(from_date.trim());
    }

    if (to_date && to_date.trim()) {
      conditions.push(`created_at <= ?`);
      params.push(to_date.trim() + ' 23:59:59');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = await get(`SELECT COUNT(*) as total FROM audit_logs ${whereClause}`, params);
    const total = countRow ? countRow.total : 0;

    const logs = await query(
      `SELECT * FROM audit_logs ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    const formattedLogs = logs.map(l => {
      let parsedDiff = null;
      if (l.diff_data) {
        try {
          parsedDiff = JSON.parse(l.diff_data);
        } catch (e) {}
      }
      return { ...l, diff_data: parsedDiff };
    });

    res.json({
      logs: formattedLogs,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ error: 'خطأ في جلب سجلات الرقابة' });
  }
});

// جلب الهيستوري والتايم لاين الخاص بمجند محدد
app.get('/api/recruits/:id/history', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const recruitIdStr = String(id);

    const recruit = await get(`SELECT id, name, military_number, company FROM recruits WHERE id = ?`, [id]);
    if (!recruit) {
      return res.status(404).json({ error: 'المجند غير موجود' });
    }

    const logs = await query(
      `SELECT * FROM audit_logs 
       WHERE (entity_type = 'recruit' AND entity_id = ?)
          OR (entity_type = 'document' AND details LIKE ?)
          OR (entity_type = 'ticket' AND details LIKE ?)
          OR (entity_type = 'activity' AND details LIKE ?)
          OR (entity_id = ? AND entity_type IN ('recruit', 'document', 'ticket', 'activity'))
       ORDER BY id DESC LIMIT 200`,
      [recruitIdStr, `%المجند ${recruit.name}%`, `%المجند ${recruit.name}%`, `%المجند ${recruit.name}%`, recruitIdStr]
    );

    const formattedLogs = logs.map(l => {
      let parsedDiff = null;
      if (l.diff_data) {
        try {
          parsedDiff = JSON.parse(l.diff_data);
        } catch (e) {}
      }
      return { ...l, diff_data: parsedDiff };
    });

    res.json({
      recruit,
      history: formattedLogs
    });
  } catch (err) {
    console.error('Error fetching recruit history:', err);
    res.status(500).json({ error: 'خطأ في جلب سجل حركات المجند' });
  }
});

// تصدير سجلات الرقابة إلى ملف Excel
app.get('/api/audit-logs/export', requireAuth, requireRole('admin', 'officer'), async (req, res) => {
  try {
    const {
      search = '',
      action_type = '',
      user_id = '',
      from_date = '',
      to_date = ''
    } = req.query;

    const conditions = [];
    const params = [];

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      conditions.push(`(details LIKE ? OR entity_name LIKE ? OR username LIKE ? OR user_fullname LIKE ? OR ip_address LIKE ?)`);
      params.push(s, s, s, s, s);
    }

    if (action_type && action_type.trim()) {
      conditions.push(`action_type = ?`);
      params.push(action_type.trim());
    }

    if (user_id && user_id.trim()) {
      conditions.push(`user_id = ?`);
      params.push(user_id.trim());
    }

    if (from_date && from_date.trim()) {
      conditions.push(`created_at >= ?`);
      params.push(from_date.trim());
    }

    if (to_date && to_date.trim()) {
      conditions.push(`created_at <= ?`);
      params.push(to_date.trim() + ' 23:59:59');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const logs = await query(
      `SELECT * FROM audit_logs ${whereClause} ORDER BY id DESC LIMIT 5000`,
      params
    );

    const ACTION_MAP = {
      LOGIN_SUCCESS: 'تسجيل دخول ناجح',
      LOGIN_FAILED: 'محاولة دخول فاشلة',
      CREATE_RECRUIT: 'إضافة مجند جديد',
      UPDATE_RECRUIT: 'تعديل بيانات مجند',
      DELETE_RECRUIT: 'حذف ملف مجند',
      BULK_DELETE_RECRUITS: 'حذف جماعي لمجندين',
      UPLOAD_DOCUMENT: 'رفع / مسح مستند',
      DELETE_DOCUMENT: 'حذف مستند',
      CREATE_TICKET: 'فتح تيكت / بلاغ',
      RESOLVE_TICKET: 'رفع تيكت / تسوية بلاغ',
      ADD_ACTIVITY: 'تسجيل حركة / متابعة',
      UPDATE_ACTIVITY: 'تحديث حركة متابعة',
      DELETE_ACTIVITY: 'حذف حركة متابعة',
      UPDATE_PSYCHOLOGICAL: 'تحديث متابعة نفسية',
      CREATE_USER: 'إنشاء حساب مستخدم',
      UPDATE_USER: 'تعديل حساب مستخدم',
      DELETE_USER: 'حذف حساب مستخدم',
      CREATE_BATCH: 'إضافة دفعة تجنيد',
      ACTIVATE_BATCH: 'تفعيل دفعة تجنيد',
      BACKUP_CREATE: 'إنشاء نسخة احتياطية'
    };

    const ROLE_MAP = {
      admin: 'مدير المنظومة',
      officer: 'ضابط أمن / عمليات',
      operator: 'كشك / تسجيل واستعلام',
      system: 'النظام'
    };

    const rows = logs.map(l => ({
      'المعرف': l.id,
      'التاريخ والوقت': l.created_at,
      'اسم المستخدم': l.username,
      'الاسم بالكامل': l.user_fullname,
      'الصلاحية / الرتبة': ROLE_MAP[l.user_role] || l.user_role,
      'نوع الإجراء': ACTION_MAP[l.action_type] || l.action_type,
      'الهدف / المعني': l.entity_name || l.entity_id || 'ـ',
      'تفاصيل الإجراء': l.details,
      'عنوان IP': l.ip_address || 'ـ'
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 8 },
      { wch: 20 },
      { wch: 15 },
      { wch: 22 },
      { wch: 18 },
      { wch: 22 },
      { wch: 25 },
      { wch: 45 },
      { wch: 16 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'سجل العمليات والرقابة');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('Error exporting audit logs:', err);
    res.status(500).json({ error: 'خطأ في تصدير سجلات الرقابة' });
  }
});

// -------------------------------------------------------------
// 12. Automated & External Drive Backup System (النسخ الاحتياطي الدوري)
// -------------------------------------------------------------

// كشف الأقراص المتاحة (الهاردات الخارجية والفلاشات)
app.get('/api/backup/drives', requireAuth, (req, res) => {
  try {
    const drives = getAvailableDrives();
    res.json(drives);
  } catch (err) {
    console.error('Error getting drives:', err);
    res.status(500).json({ error: 'خطأ في استكشاف محركات الأقراص' });
  }
});

// جلب قائمة النسخ الاحتياطية وإعدادات الجدولة
app.get('/api/backup/list', requireAuth, async (req, res) => {
  try {
    const settingsRow = await get(`SELECT value FROM settings WHERE key = 'backup_config'`);
    let config = {
      externalPath: '',
      autoBackupEnabled: true,
      intervalHours: 6,
      lastBackupAt: null
    };
    if (settingsRow && settingsRow.value) {
      try { config = { ...config, ...JSON.parse(settingsRow.value) }; } catch (e) {}
    }

    const localBackups = listBackups();
    const externalBackups = config.externalPath && fs.existsSync(config.externalPath) 
      ? listBackups(config.externalPath) 
      : [];

    res.json({
      config,
      localBackups,
      externalBackups
    });
  } catch (err) {
    console.error('Error listing backups:', err);
    res.status(500).json({ error: 'خطأ في جلب قائمة النسخ الاحتياطية' });
  }
});

// حفظ إعدادات النسخ الاحتياطي (المسار الخارجي، الجدولة)
app.post('/api/backup/settings', requireAuth, async (req, res) => {
  try {
    const { externalPath, autoBackupEnabled, intervalHours } = req.body;
    const config = {
      externalPath: externalPath || '',
      autoBackupEnabled: autoBackupEnabled !== undefined ? autoBackupEnabled : true,
      intervalHours: Number(intervalHours) || 6
    };

    await run(
      `INSERT INTO settings (key, value, updated_at) VALUES ('backup_config', ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      [JSON.stringify(config)]
    );

    // Reconfigure scheduler if enabled
    if (config.autoBackupEnabled) {
      startAutoBackupSchedule(config.intervalHours, async () => {
        const row = await get(`SELECT value FROM settings WHERE key = 'backup_config'`);
        if (row && row.value) {
          try { return JSON.parse(row.value).externalPath; } catch (e) {}
        }
        return null;
      });
    }

    res.json({ message: 'تم حفظ إعدادات النسخ الاحتياطي بنجاح', config });
  } catch (err) {
    console.error('Error saving backup settings:', err);
    res.status(500).json({ error: 'خطأ في حفظ إعدادات النسخ' });
  }
});

// إنشاء نسخة احتياطية فورية (محلياً أو على مسار خارجي محدد)
app.post('/api/backup/create', requireAuth, async (req, res) => {
  try {
    const { externalPath } = req.body;
    let targetExtDir = externalPath;

    if (!targetExtDir) {
      const cfgRow = await get(`SELECT value FROM settings WHERE key = 'backup_config'`);
      if (cfgRow && cfgRow.value) {
        try { targetExtDir = JSON.parse(cfgRow.value).externalPath; } catch (e) {}
      }
    }

    const backupResult = await createBackup({
      destinationDir: targetExtDir && fs.existsSync(targetExtDir) ? targetExtDir : null,
      isAuto: false
    });

    logAudit(req, {
      action_type: 'BACKUP_CREATE',
      entity_type: 'backup',
      entity_id: backupResult.fileName,
      entity_name: backupResult.fileName,
      details: `إنشاء نسخة احتياطية للمنظومة: ${backupResult.fileName} (${(backupResult.sizeBytes / (1024 * 1024)).toFixed(2)} ميجابايت)`,
    });

    res.json({
      message: 'تم إنشاء النسخة الاحتياطية بنجاح',
      backup: backupResult
    });
  } catch (err) {
    console.error('Error creating backup:', err);
    res.status(500).json({ error: 'خطأ أثناء إنشاء النسخة الاحتياطية: ' + err.message });
  }
});

// تنزيل نسخة احتياطية مباشرة عبر المتصفح
app.get('/api/backup/download/:fileName', requireAuth, (req, res) => {
  try {
    const { fileName } = req.params;
    // Security check against directory traversal
    const safeName = path.basename(fileName);
    const backupsDir = path.join(__dirname, '..', 'backups');
    const filePath = path.join(backupsDir, safeName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'ملف النسخة الاحتياطية غير موجود' });
    }

    res.download(filePath, safeName);
  } catch (err) {
    console.error('Error downloading backup:', err);
    res.status(500).json({ error: 'خطأ في تنزيل النسخة الاحتياطية' });
  }
});

// حذف نسخة احتياطية (Admin only)
app.delete('/api/backup/:fileName', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const { fileName } = req.params;
    const safeName = path.basename(fileName);
    const deleted = deleteBackup(safeName);
    if (deleted) {
      logAudit(req, {
        action_type: 'DELETE_BACKUP',
        entity_type: 'backup',
        entity_id: safeName,
        entity_name: safeName,
        details: `حذف نسخة احتياطية: ${safeName}`,
      });
      res.json({ message: 'تم حذف النسخة الاحتياطية بنجاح' });
    } else {
      res.status(404).json({ error: 'الملف غير موجود' });
    }
  } catch (err) {
    console.error('Error deleting backup:', err);
    res.status(500).json({ error: 'خطأ في حذف النسخة الاحتياطية' });
  }
});

// استرجاع نسخة احتياطية من قائمة النسخ (Admin only)
app.post('/api/backup/restore', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { fileName, isExternal, externalPath } = req.body;
    if (!fileName) {
      return res.status(400).json({ error: 'اسم ملف النسخة الاحتياطية مطلوب' });
    }

    const safeName = path.basename(fileName);
    let targetPath = '';

    if (isExternal && externalPath && fs.existsSync(externalPath)) {
      targetPath = path.join(externalPath, safeName);
    } else {
      const backupsDir = path.join(baseDir, 'backups');
      targetPath = path.join(backupsDir, safeName);
    }

    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: 'ملف النسخة الاحتياطية المحدد غير موجود' });
    }

    console.log(`🔄 جاري بدء استرجاع النسخة الاحتياطية من: ${targetPath}`);
    const restoreResult = await restoreBackup(targetPath);

    logAudit(req, {
      action_type: 'RESTORE_BACKUP',
      entity_type: 'backup',
      entity_id: safeName,
      entity_name: safeName,
      details: `استرجاع نسخة احتياطية شاملة للمنظومة: ${safeName} (تم حفظ نسخة أمان: ${restoreResult.safetyBackup})`,
    });

    notifyDataChanged();
    res.json({
      message: 'تم استرجاع النسخة الاحتياطية بنجاح واكتمال التحقق من قاعدة البيانات',
      result: restoreResult
    });
  } catch (err) {
    console.error('Error restoring backup:', err);
    res.status(500).json({ error: 'خطأ في استرجاع النسخة الاحتياطية: ' + err.message });
  }
});

// استرجاع نسخة احتياطية من ملف مرفوع مباشرة (Admin only)
app.post('/api/backup/upload-restore', requireAuth, requireRole('admin'), upload.single('backupFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'يرجى اختيار ملف النسخة الاحتياطية (.zip أو .db)' });
    }

    const uploadedPath = req.file.path;
    console.log(`🔄 جاري بدء استرجاع النسخة الاحتياطية المرفوعة من: ${uploadedPath}`);
    const restoreResult = await restoreBackup(uploadedPath);

    // Clean up the uploaded temporary archive
    try {
      if (fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
    } catch (e) {}

    logAudit(req, {
      action_type: 'RESTORE_BACKUP',
      entity_type: 'backup',
      entity_id: req.file.originalname,
      entity_name: req.file.originalname,
      details: `استرجاع نسخة احتياطية مرفوعة: ${req.file.originalname}`,
    });

    notifyDataChanged();
    res.json({
      message: 'تم استرجاع النسخة الاحتياطية المرفوعة بنجاح',
      result: restoreResult
    });
  } catch (err) {
    console.error('Error restoring uploaded backup:', err);
    res.status(500).json({ error: 'خطأ في استرجاع النسخة الاحتياطية: ' + err.message });
  }
});

const distDir = path.join(__dirname, '..', 'dist');

// 404 Handler for unmatched API and uploads endpoints (prevent SPA fallback from serving HTML)
app.all(['/api/*', '/uploads/*'], (req, res) => {
  res.status(404).json({ error: 'المسار أو الملف المطلوب غير موجود' });
});

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Global error handler for multer and other errors
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'حجم الملف يتجاوز الحد الأقصى المسموح (100 ميجابايت)' });
    }
    return res.status(400).json({ error: 'خطأ في رفع الملف: ' + err.message });
  }
  if (err.message && (err.message.includes('نوع الملف غير مسموح') || err.message.includes('MIME'))) {
    return res.status(415).json({ error: 'نوع الملف غير مسموح - يُسمح بالصور JPG/PNG/WebP وفيديوهات MP4/WebM/MOV وملفات PDF' });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'خطأ داخلي في الخادم' });
});

// Start Server on 0.0.0.0 so local network / Wi-Fi devices can connect
app.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIpAddresses();
  console.log(`=======================================================`);
  console.log(`🚀 خادم منظومة فحص المجندين يعمل الآن بنجاح على المنفذ: ${PORT}`);
  console.log(`💻 الرابط المحلي على هذا الجهاز: http://localhost:${PORT}`);
  if (ips.length > 0) {
    console.log(`📶 رابط الربط الشبكي عبر الواي فاي للأجهزة الأخرى:`);
    ips.forEach(i => console.log(`   👉 http://${i.ip}:${PORT} (${i.interfaceName})`));
  }
  console.log(`=======================================================`);

  // Initialize background automated periodic backups (every 6 hours)
  startAutoBackupSchedule(6, async () => {
    try {
      const row = await get(`SELECT value FROM settings WHERE key = 'backup_config'`);
      if (row && row.value) {
        return JSON.parse(row.value).externalPath;
      }
    } catch (e) {}
    return null;
  });

  // Start embedded local AI sidecar asynchronously (loopback only)
  if (process.env.NODE_ENV !== 'test' && modelManager.hasAssets) {
    modelManager.start().catch((aiErr) => {
      console.warn('AI sidecar auto-start notice:', aiErr.message);
    });
  }
});
