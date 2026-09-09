import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path in local project directory
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'recruits.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ خطأ في فتح قاعدة البيانات:', err.message);
  } else {
    console.log('✅ تم الاتصال بقاعدة بيانات SQLite المحلية بنجاح:', dbPath);
  }
});

// Promisified database helpers
export const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
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
  // Enable Write-Ahead Logging for ultra-fast concurrency across LAN / Wi-Fi
  await run('PRAGMA journal_mode = WAL;');
  await run('PRAGMA busy_timeout = 5000;');
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

  // 3. System Settings table (إعدادات المنظومة وألوان السرايا)
  await run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed default company colors if not set
  const companyColorsRow = await get(`SELECT value FROM settings WHERE key = 'company_colors'`);
  if (!companyColorsRow) {
    const defaultColors = [
      { id: 'c1', match: 'الأولى', name: 'السرية الأولى ( ١ )', color: '#16a34a', textColor: '#ffffff' },
      { id: 'c2', match: 'الثانية', name: 'السرية الثانية ( ٢ )', color: '#dc2626', textColor: '#ffffff' },
      { id: 'c3', match: 'الثالثة', name: 'السرية الثالثة ( ٣ )', color: '#2563eb', textColor: '#ffffff' },
      { id: 'c4', match: 'الرابعة', name: 'السرية الرابعة ( ٤ )', color: '#ffffff', textColor: '#000000' },
      { id: 'c5', match: 'الخامسة', name: 'السرية الخامسة ( ٥ )', color: '#f97316', textColor: '#000000' },
      { id: 'c6', match: 'السادسة', name: 'السرية السادسة ( ٦ )', color: '#38bdf8', textColor: '#000000' }
    ];
    await run(`INSERT INTO settings (key, value) VALUES (?, ?)`, ['company_colors', JSON.stringify(defaultColors)]);
    console.log('✅ تم تهيئة إعدادات ألوان السرايا الافتراضية');
  }

  // Indexing for instant search + uniqueness (partial: only non-empty IDs)
  await run(`CREATE INDEX IF NOT EXISTS idx_recruits_name ON recruits(name)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_recruits_batch_id ON recruits(batch_id)`);
  await run(`DROP INDEX IF EXISTS idx_recruits_national_id_unique`);
  await run(`DROP INDEX IF EXISTS idx_recruits_national_id`);
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_recruits_national_id_unique ON recruits(national_id) WHERE national_id IS NOT NULL AND national_id != ''`);

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
};

export default db;
