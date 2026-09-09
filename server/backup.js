import fs from 'fs';
import path from 'path';
import { ZipArchive } from 'archiver';
import { fileURLToPath } from 'url';
import { run, get, query } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories
const rootDir = path.join(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const dbPath = path.join(dataDir, 'recruits.db');
const uploadsDir = path.join(rootDir, 'uploads');
const defaultBackupsDir = path.join(rootDir, 'backups');

if (!fs.existsSync(defaultBackupsDir)) {
  fs.mkdirSync(defaultBackupsDir, { recursive: true });
}

let autoBackupTimer = null;

/**
 * Get available Windows drive letters (e.g. C:, D:, E:, F:, G:)
 */
export const getAvailableDrives = () => {
  const letters = 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const available = [];

  for (const l of letters) {
    const drivePath = `${l}:\\`;
    try {
      if (fs.existsSync(drivePath)) {
        available.push({
          drive: `${l}:`,
          path: drivePath,
          isSystem: l === 'C'
        });
      }
    } catch (e) {}
  }
  return available;
};

/**
 * Create a full compressed backup (.zip) containing recruits.db and all media/documents.
 */
export const createBackup = async ({ destinationDir = null, isAuto = false } = {}) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const zipFileName = `backup_recruits_${timestamp}.zip`;
  const localZipPath = path.join(defaultBackupsDir, zipFileName);

  // 1. Create a safe, non-blocking snapshot of SQLite DB using VACUUM INTO
  const tempDbSnapshot = path.join(dataDir, `snapshot_${Date.now()}.db`);
  try {
    // Escape backslashes for SQLite
    const safeTempPath = tempDbSnapshot.replace(/\\/g, '/');
    await run(`VACUUM INTO '${safeTempPath}'`);
  } catch (err) {
    // Fallback: standard file copy if VACUUM INTO is not supported in older SQLite
    console.warn('VACUUM INTO failed, falling back to fs copy:', err.message);
    fs.copyFileSync(dbPath, tempDbSnapshot);
  }

  // 2. Fetch system stats for manifest
  let totalRecruits = 0;
  let activeBatchName = 'غير محدد';
  try {
    const recCount = await get('SELECT COUNT(*) as count FROM recruits');
    totalRecruits = recCount ? recCount.count : 0;
    const batch = await get('SELECT name FROM batches WHERE active = 1 LIMIT 1');
    if (batch) activeBatchName = batch.name;
  } catch (e) {}

  const manifest = {
    title: 'نسخة احتياطية شاملة - منظومة تسجيل وفحص المجندين',
    authority: 'وزارة الداخلية - قطاع الأمن المركزي - منطقة وسط الدلتا',
    createdAt: new Date().toISOString(),
    isAutomated: isAuto,
    totalRecruits,
    activeBatch: activeBatchName,
    version: '1.0.0'
  };

  // 3. Create zip archive
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(localZipPath);
    const archive = new ZipArchive({ zlib: { level: 8 } });

    output.on('close', resolve);
    archive.on('error', reject);

    archive.pipe(output);

    // Append SQLite DB
    archive.file(tempDbSnapshot, { name: 'recruits.db' });

    // Append manifest.json
    archive.append(JSON.stringify(manifest, null, 2), { name: 'backup_manifest.json' });

    // Append uploads directory (photos, videos, documents) if exists
    if (fs.existsSync(uploadsDir)) {
      archive.directory(uploadsDir, 'uploads');
    }

    archive.finalize();
  });

  // Cleanup temp DB snapshot
  try {
    if (fs.existsSync(tempDbSnapshot)) fs.unlinkSync(tempDbSnapshot);
  } catch (e) {}

  const stats = fs.statSync(localZipPath);
  const result = {
    fileName: zipFileName,
    filePath: localZipPath,
    sizeBytes: stats.size,
    sizeFormatted: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
    createdAt: new Date().toISOString(),
    totalRecruits,
    externalCopied: false,
    externalPath: null
  };

  // 4. Copy to external drive if destinationDir specified
  if (destinationDir && fs.existsSync(destinationDir)) {
    try {
      const targetPath = path.join(destinationDir, zipFileName);
      fs.copyFileSync(localZipPath, targetPath);
      result.externalCopied = true;
      result.externalPath = targetPath;
      console.log(`✅ تم نقل النسخة الاحتياطية بنجاح إلى المسار الخارجي: ${targetPath}`);
    } catch (copyErr) {
      console.error('Failed to copy backup to external drive:', copyErr);
      result.externalError = copyErr.message;
    }
  }

  // 5. Cleanup older local backups (keep last 10)
  cleanupOldBackups(defaultBackupsDir, 10);
  if (destinationDir && fs.existsSync(destinationDir)) {
    cleanupOldBackups(destinationDir, 15);
  }

  return result;
};

/**
 * List all existing backup archives
 */
export const listBackups = (customDir = null) => {
  const dir = customDir && fs.existsSync(customDir) ? customDir : defaultBackupsDir;
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith('backup_recruits_') && f.endsWith('.zip'))
    .map(f => {
      const fullPath = path.join(dir, f);
      const stat = fs.statSync(fullPath);
      return {
        fileName: f,
        filePath: fullPath,
        sizeBytes: stat.size,
        sizeFormatted: (stat.size / (1024 * 1024)).toFixed(2) + ' MB',
        createdAt: stat.mtime.toISOString(),
        timestamp: stat.mtimeMs
      };
    })
    .sort((a, b) => b.timestamp - a.timestamp);

  return files;
};

/**
 * Delete a specific backup archive
 */
export const deleteBackup = (fileName, customDir = null) => {
  const dir = customDir && fs.existsSync(customDir) ? customDir : defaultBackupsDir;
  const target = path.join(dir, fileName);

  if (fs.existsSync(target)) {
    fs.unlinkSync(target);
    return true;
  }
  return false;
};

/**
 * Rotate & cleanup old backups beyond keepCount
 */
const cleanupOldBackups = (dir, keepCount = 10) => {
  try {
    const list = listBackups(dir);
    if (list.length > keepCount) {
      const toDelete = list.slice(keepCount);
      for (const item of toDelete) {
        try { fs.unlinkSync(item.filePath); } catch (e) {}
      }
    }
  } catch (e) {
    console.warn('Could not rotate backups:', e);
  }
};

/**
 * Setup and start periodic auto-backup scheduler
 */
export const startAutoBackupSchedule = (intervalHours = 6, getDestinationPath = null) => {
  if (autoBackupTimer) clearInterval(autoBackupTimer);

  const ms = Math.max(intervalHours, 1) * 60 * 60 * 1000;
  console.log(`⏰ تم تفعيل نظام النسخ الاحتياطي الدوري التلقائي (كل ${intervalHours} ساعات)`);

  autoBackupTimer = setInterval(async () => {
    try {
      let dest = null;
      if (typeof getDestinationPath === 'function') {
        dest = await getDestinationPath();
      }
      console.log('🔄 جاري تنفيذ النسخ الاحتياطي الدوري التلقائي في الخلفية...');
      await createBackup({ destinationDir: dest, isAuto: true });
      console.log('✅ اكتمل النسخ الاحتياطي الدوري بنجاح.');
    } catch (err) {
      console.error('❌ خطأ أثناء تنفيذ النسخ الاحتياطي الدوري:', err);
    }
  }, ms);
};
