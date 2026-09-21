import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path: support APP_DATA_DIR for packaged desktop app, with fallback to project root
const baseDir = process.env.APP_DATA_DIR || path.join(__dirname, '..');
const dataDir = path.join(baseDir, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const dbPath = path.join(dataDir, 'recruits.db');

// If running in packaged app (APP_DATA_DIR set) and the database file doesn't exist yet,
// check if an existing template database exists in the installation directory and copy it over
if (process.env.APP_DATA_DIR && !fs.existsSync(dbPath)) {
  const bundledDbPath = path.join(__dirname, '..', 'data', 'recruits.db');
  if (fs.existsSync(bundledDbPath)) {
    try {
      fs.copyFileSync(bundledDbPath, dbPath);
      console.log('✅ تم نسخ قاعدة البيانات الأولية المرفقة إلى مسار البيانات:', dbPath);
    } catch (copyErr) {
      console.warn('⚠️ تعذر نسخ قاعدة البيانات المرفقة:', copyErr.message);
    }
  }
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ خطأ في فتح قاعدة البيانات:', err.message);
  } else {
    console.log('✅ تم الاتصال بقاعدة بيانات SQLite بنجاح:', dbPath);
  }
});

// Promisified database helpers with automatic retry on SQLITE_BUSY / lock contention
export const query = (sql, params = [], maxRetries = 5) => {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const execute = () => {
      attempts++;
      db.all(sql, params, (err, rows) => {
        if (err) {
          const isBusy = err.code === 'SQLITE_BUSY' || err.message?.includes('busy') || err.message?.includes('locked');
          if (isBusy && attempts <= maxRetries) {
            const delay = Math.min(30 * Math.pow(1.5, attempts), 500) + Math.random() * 20;
            return setTimeout(execute, delay);
          }
          return reject(err);
        }
        resolve(rows);
      });
    };
    execute();
  });
};

export const get = (sql, params = [], maxRetries = 5) => {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const execute = () => {
      attempts++;
      db.get(sql, params, (err, row) => {
        if (err) {
          const isBusy = err.code === 'SQLITE_BUSY' || err.message?.includes('busy') || err.message?.includes('locked');
          if (isBusy && attempts <= maxRetries) {
            const delay = Math.min(30 * Math.pow(1.5, attempts), 500) + Math.random() * 20;
            return setTimeout(execute, delay);
          }
          return reject(err);
        }
        resolve(row);
      });
    };
    execute();
  });
};

export const run = (sql, params = [], maxRetries = 5) => {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const execute = () => {
      attempts++;
      db.run(sql, params, function (err) {
        if (err) {
          const isBusy = err.code === 'SQLITE_BUSY' || err.message?.includes('busy') || err.message?.includes('locked');
          if (isBusy && attempts <= maxRetries) {
            const delay = Math.min(30 * Math.pow(1.5, attempts), 500) + Math.random() * 20;
            return setTimeout(execute, delay);
          }
          return reject(err);
        }
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    };
    execute();
  });
};

export const closeDb = () => {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

// Initialize schema and seed default recruitment batches
export const initDb = async () => {
  // Enable Write-Ahead Logging & high-performance memory cache for ultra-fast concurrency
  await run('PRAGMA journal_mode = WAL;');
  await run('PRAGMA synchronous = NORMAL;');
  await run('PRAGMA busy_timeout = 5000;');
  await run('PRAGMA cache_size = -64000;'); // 64 MB RAM cache
  await run('PRAGMA temp_store = MEMORY;');
  await run('PRAGMA mmap_size = 268435456;'); // 256 MB Memory-Mapped I/O
  await run('PRAGMA foreign_keys = ON;');

  // 1. Batches table (الدفوع التجنيدية)
  await run(`
    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      active INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Recruits table (المجندين مع كامل حقول الاستمارة الرسمية)
  await run(`
    CREATE TABLE IF NOT EXISTS recruits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      attendance_date TEXT NOT NULL,
      name TEXT NOT NULL,
      religion TEXT NOT NULL,
      qualification TEXT NOT NULL,
      birth_date TEXT,
      wife TEXT,
      national_id TEXT,
      address TEXT,
      current_job TEXT,
      other_jobs TEXT,
      travel_abroad TEXT,
      literacy TEXT,
      inspection TEXT,
      medical_status TEXT,
      father_name TEXT,
      father_job TEXT,
      mother_name TEXT,
      mother_job TEXT,
      siblings_check TEXT,
      family_social_status TEXT,
      family_security_status TEXT,
      photo_path TEXT,
      video_path TEXT,
      police_number TEXT DEFAULT '',
      company TEXT DEFAULT '',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE RESTRICT
    )
  `);

  // Auto-migration for existing tables: check and add missing columns
  const tableCols = await query(`PRAGMA table_info(recruits)`);
  const colNames = tableCols.map(c => c.name);
  if (!colNames.includes('police_number')) {
    await run(`ALTER TABLE recruits ADD COLUMN police_number TEXT DEFAULT ''`);
    console.log('✅ تم تحديث المخطط: إضافة عمود police_number');
  }
  if (!colNames.includes('company')) {
    await run(`ALTER TABLE recruits ADD COLUMN company TEXT DEFAULT ''`);
    console.log('✅ تم تحديث المخطط: إضافة عمود company');
  }
  if (!colNames.includes('id_doc_front_path')) {
    await run(`ALTER TABLE recruits ADD COLUMN id_doc_front_path TEXT DEFAULT ''`);
    console.log('✅ تم تحديث المخطط: إضافة عمود id_doc_front_path (وثيقة التعارف - وجه 1)');
  }
  if (!colNames.includes('id_doc_back_path')) {
    await run(`ALTER TABLE recruits ADD COLUMN id_doc_back_path TEXT DEFAULT ''`);
    console.log('✅ تم تحديث المخطط: إضافة عمود id_doc_back_path (وثيقة التعارف - وجه 2)');
  }
  if (!colNames.includes('military_record_path')) {
    await run(`ALTER TABLE recruits ADD COLUMN military_record_path TEXT DEFAULT ''`);
    console.log('✅ تم تحديث المخطط: إضافة عمود military_record_path (أصل السجل العسكري)');
  }
  if (!colNames.includes('is_psychological_case')) {
    await run(`ALTER TABLE recruits ADD COLUMN is_psychological_case INTEGER DEFAULT 0`);
    console.log('✅ تم تحديث المخطط: إضافة عمود is_psychological_case (حالات غير متزنين نفسياً)');
  }
  if (!colNames.includes('psychological_notes')) {
    await run(`ALTER TABLE recruits ADD COLUMN psychological_notes TEXT DEFAULT ''`);
    console.log('✅ تم تحديث المخطط: إضافة عمود psychological_notes');
  }
  if (!colNames.includes('last_psychological_followup')) {
    await run(`ALTER TABLE recruits ADD COLUMN last_psychological_followup TEXT DEFAULT ''`);
    console.log('✅ تم تحديث المخطط: إضافة عمود last_psychological_followup');
  }
  if (!colNames.includes('recruit_code')) {
    await run(`ALTER TABLE recruits ADD COLUMN recruit_code TEXT DEFAULT ''`);
    console.log('✅ تم تحديث المخطط: إضافة عمود recruit_code الموحد والدائم للمجند');
  }

  // 3. System Settings table (إعدادات المنظومة وألوان السرايا)
  await run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 4. Recruit Activities / Medical Tracking table (سجل التحركات والمتابعة الطبية والأمنية)
  await run(`
    CREATE TABLE IF NOT EXISTS recruit_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recruit_id INTEGER NOT NULL,
      activity_type TEXT NOT NULL, -- medical_referral, hospital_return, mission, administrative
      destination TEXT DEFAULT '', -- جهة التحرك (مستشفى الشرطة بطنطا / مدينة نصر / العيادة)
      departure_date TEXT NOT NULL, -- تاريخ وساعة الخروج / الإحالة
      return_date TEXT, -- تاريخ وساعة العودة
      diagnosis TEXT DEFAULT '', -- التشخيص الطبي
      medical_decision TEXT DEFAULT '', -- القرار الطبي (راحة طبية، حجز، لائق، إعادة عرض)
      notes TEXT DEFAULT '', -- ملاحظات القيد
      officer_name TEXT DEFAULT '', -- اسم / رتبة مسجل القيد
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (recruit_id) REFERENCES recruits(id) ON DELETE CASCADE
    )
  `);

  await run(`CREATE INDEX IF NOT EXISTS idx_activities_recruit_id ON recruit_activities(recruit_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_activities_type ON recruit_activities(activity_type)`);

  // Auto-migration for recruit_activities: check and add report_photo_path
  try {
    const actCols = await query(`PRAGMA table_info(recruit_activities)`);
    const actColNames = actCols.map(c => c.name);
    if (!actColNames.includes('report_photo_path')) {
      await run(`ALTER TABLE recruit_activities ADD COLUMN report_photo_path TEXT DEFAULT ''`);
      console.log('✅ تم تحديث المخطط: إضافة عمود report_photo_path إلى recruit_activities');
    }
  } catch (err) {
    console.error('Migration error for recruit_activities:', err);
  }

  // 5. Recruit Documents / Scanned Identification & Military Records (وثائق التعارف والسجل العسكري الممسوحة ضوئياً)
  await run(`
    CREATE TABLE IF NOT EXISTS recruit_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recruit_id INTEGER NOT NULL,
      doc_type TEXT NOT NULL, -- id_doc_front, id_doc_back, military_record, other
      title TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_name TEXT DEFAULT '',
      file_size INTEGER DEFAULT 0,
      mime_type TEXT DEFAULT 'image/jpeg',
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (recruit_id) REFERENCES recruits(id) ON DELETE CASCADE
    )
  `);

  await run(`CREATE INDEX IF NOT EXISTS idx_documents_recruit_id ON recruit_documents(recruit_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_documents_type ON recruit_documents(doc_type)`);

  // 6. Recruit Tickets / Alert & Suspicion Tickets table (تيكتات الاشتباه الجنائي والسياسي والحالات المرضية والنفسية)
  await run(`
    CREATE TABLE IF NOT EXISTS recruit_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recruit_id INTEGER NOT NULL,
      ticket_type TEXT NOT NULL, -- criminal_suspicion, political_suspicion, medical_condition, psychological_condition, security_alert
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT DEFAULT 'medium', -- low, medium, high, critical
      status TEXT DEFAULT 'open', -- open, resolved, closed
      resolution_notes TEXT DEFAULT '',
      resolved_at DATETIME,
      resolved_by TEXT DEFAULT '',
      officer_name TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (recruit_id) REFERENCES recruits(id) ON DELETE CASCADE
    )
  `);

  await run(`CREATE INDEX IF NOT EXISTS idx_tickets_recruit_id ON recruit_tickets(recruit_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_tickets_type ON recruit_tickets(ticket_type)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_tickets_status ON recruit_tickets(status)`);

  // Seed default company colors if not set
  const companyColorsRow = await get(`SELECT value FROM settings WHERE key = 'company_colors'`);
  const defaultCompanyColors = [
    { id: 'c1', match: 'الأولى', name: 'السرية الأولى ( ١ )', color: '#16a34a', textColor: '#ffffff' },
    { id: 'c2', match: 'الثانية', name: 'السرية الثانية ( ٢ )', color: '#dc2626', textColor: '#ffffff' },
    { id: 'c3', match: 'الثالثة', name: 'السرية الثالثة ( ٣ )', color: '#2563eb', textColor: '#ffffff' },
    { id: 'c4', match: 'الرابعة', name: 'السرية الرابعة ( ٤ )', color: '#ffffff', textColor: '#000000' },
    { id: 'c5', match: 'الخامسة', name: 'السرية الخامسة ( ٥ )', color: '#f97316', textColor: '#000000' },
    { id: 'c6', match: 'السادسة', name: 'السرية السادسة ( ٦ )', color: '#38bdf8', textColor: '#000000' },
    { id: 'sec', match: 'أمن', name: 'سرية الأمن', color: '#0f172a', textColor: '#facc15' },
    { id: 'base', match: 'أساسية', name: 'القوة الأساسية', color: '#1e1b4b', textColor: '#38bdf8' }
  ];

  if (!companyColorsRow) {
    await run(`INSERT INTO settings (key, value) VALUES (?, ?)`, ['company_colors', JSON.stringify(defaultCompanyColors)]);
    console.log('✅ تم تهيئة إعدادات ألوان السرايا الافتراضية');
  } else {
    try {
      const existing = JSON.parse(companyColorsRow.value);
      if (Array.isArray(existing) && !existing.some(c => c.id === 'sec' || c.match === 'أمن')) {
        await run(`UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'company_colors'`, [JSON.stringify(defaultCompanyColors)]);
        console.log('✅ تم تحديث ألوان السرايا لتشمل سرية الأمن والقوة الأساسية');
      }
    } catch (e) {}
  }

  // Indexing for instant search + uniqueness (partial: only non-empty IDs)
  await run(`CREATE INDEX IF NOT EXISTS idx_recruits_name ON recruits(name)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_recruits_batch_id ON recruits(batch_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_recruits_company ON recruits(company)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_recruits_attendance ON recruits(attendance_date)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_recruits_qualification ON recruits(qualification)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_recruits_psychological ON recruits(is_psychological_case)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_recruits_police_number ON recruits(police_number)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_activities_recruit_return ON recruit_activities(recruit_id, return_date)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_tickets_recruit_status ON recruit_tickets(recruit_id, status)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_tickets_status_type ON recruit_tickets(status, ticket_type)`);
  await run(`DROP INDEX IF EXISTS idx_recruits_national_id_unique`);
  await run(`DROP INDEX IF EXISTS idx_recruits_national_id`);
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_recruits_national_id_unique ON recruits(national_id) WHERE national_id IS NOT NULL AND national_id != ''`);
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_recruits_recruit_code ON recruits(recruit_code) WHERE recruit_code IS NOT NULL AND recruit_code != ''`);

  // Backfill recruit_code for any existing recruits without a permanent code
  try {
    const recruitsWithoutCode = await query(`SELECT id FROM recruits WHERE recruit_code IS NULL OR recruit_code = ''`);
    for (const r of recruitsWithoutCode) {
      const code = 'REC-' + String(r.id).padStart(7, '0');
      await run(`UPDATE recruits SET recruit_code = ? WHERE id = ?`, [code, r.id]);
    }
  } catch (backfillErr) {
    console.warn('⚠️ تنبيه خلال تهيئة أكواد المجندين:', backfillErr.message);
  }

  // Seed default 4 batches for 2026 if empty
  const existingBatches = await query(`SELECT COUNT(*) as count FROM batches`);
  if (existingBatches[0].count === 0) {
    const currentYear = new Date().getFullYear();
    const defaultBatches = [
      { name: `دفع شهر 1 (يناير ${currentYear})`, year: currentYear, month: 1, active: 0 },
      { name: `دفع شهر 4 (أبريل ${currentYear})`, year: currentYear, month: 4, active: 0 },
      { name: `دفع شهر 7 (يوليو ${currentYear})`, year: currentYear, month: 7, active: 0 },
      { name: `دفع شهر 10 (أكتوبر ${currentYear})`, year: currentYear, month: 10, active: 1 } // default active batch
    ];

    for (const b of defaultBatches) {
      await run(
        `INSERT INTO batches (name, year, month, active) VALUES (?, ?, ?, ?)`,
        [b.name, b.year, b.month, b.active]
      );
    }
    console.log('✅ تم إنشاء الدفوع التجنيدية الأساسية لعام 2026 تلقائياً');
  }

  // 7. Users and Permissions table (جدول إدارة المستخدمين والصلاحيات)
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'officer', -- admin, officer, operator
      qr_login_token TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);

  // Auto-migration for existing users: add qr_login_token if missing
  try {
    const userCols = await query(`PRAGMA table_info(users)`);
    const userColNames = userCols.map(c => c.name);
    if (!userColNames.includes('qr_login_token')) {
      await run(`ALTER TABLE users ADD COLUMN qr_login_token TEXT`);
      console.log('✅ تم تحديث المخطط: إضافة عمود qr_login_token للمستخدمين');
    }
    await run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_qr_token ON users(qr_login_token) WHERE qr_login_token IS NOT NULL AND qr_login_token != ''`);

    // Generate tokens for existing users who do not have one
    const usersWithoutToken = await query(`SELECT id, username FROM users WHERE qr_login_token IS NULL OR qr_login_token = ''`);
    for (const u of usersWithoutToken) {
      const token = crypto.randomBytes(32).toString('hex');
      await run(`UPDATE users SET qr_login_token = ? WHERE id = ?`, [token, u.id]);
    }
  } catch (userMigErr) {
    console.warn('⚠️ خطأ هجرة جدول المستخدمين:', userMigErr.message);
  }

  // Seed default admin if no users exist
  const existingUsers = await query(`SELECT COUNT(*) as count FROM users`);
  if (existingUsers[0].count === 0) {
    // Hash for password '123456'
    const defaultHash = '$2b$10$bNpheeFBkTWNE1sDaCkmcuLCYEYzuHbmA/BVAvsHawdBrLTlhOgcG';
    const adminQrToken = crypto.randomBytes(32).toString('hex');
    await run(
      `INSERT INTO users (username, password_hash, full_name, role, qr_login_token) VALUES (?, ?, ?, ?, ?)`,
      ['admin', defaultHash, 'مدير المنظومة', 'admin', adminQrToken]
    );
    console.log('✅ تم إنشاء حساب مدير المنظومة الافتراضي (admin / 123456) بنجاح مع رمز QR ذكي');
  }

  // 8. Audit Logs table (سجل الرقابة وتتبع العمليات الشامل)
  await run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT NOT NULL DEFAULT 'system',
      user_fullname TEXT NOT NULL DEFAULT 'النظام',
      user_role TEXT NOT NULL DEFAULT 'system',
      action_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT DEFAULT '',
      entity_name TEXT DEFAULT '',
      details TEXT NOT NULL,
      diff_data TEXT DEFAULT '',
      ip_address TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_audit_action_type ON audit_logs(action_type)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at)`);
};

export default db;
