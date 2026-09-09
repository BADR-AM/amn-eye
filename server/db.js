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

// Initialize schema and seed default recruitment batches
export const initDb = async () => {
  // Enable Write-Ahead Logging for ultra-fast concurrency across LAN / Wi-Fi
  await run('PRAGMA journal_mode = WAL;');
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
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE RESTRICT
    )
  `);

  // Indexing for instant search + uniqueness
  await run(`CREATE INDEX IF NOT EXISTS idx_recruits_name ON recruits(name)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_recruits_batch_id ON recruits(batch_id)`);
  // Enforce unique national_id (ignore duplicates on existing data)
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_recruits_national_id_unique ON recruits(national_id)`);

  // Seed default 4 batches for 2026 if empty
  const existingBatches = await query(`SELECT COUNT(*) as count FROM batches`);
  if (existingBatches[0].count === 0) {
    const currentYear = 2026;
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
