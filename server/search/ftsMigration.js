import { get, run, query } from '../db.js';

const normCol = (col) =>
  `(COALESCE(${col}, '') || ' ' || REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(${col}, ''), 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ة', 'ه'), 'ى', 'ي'), 'ئ', 'ء'))`;

const buildFullRecruitFtsExpr = (prefix = '') => {
  const p = prefix ? `${prefix}.` : '';
  return `
    ${normCol(`${p}name`)} || ' ' ||
    COALESCE(${p}national_id, '') || ' ' ||
    COALESCE(${p}recruit_code, '') || ' ' ||
    COALESCE(${p}police_number, '') || ' ' ||
    COALESCE(${p}military_number, '') || ' ' ||
    ${normCol(`${p}qualification`)} || ' ' ||
    ${normCol(`${p}current_job`)} || ' ' ||
    ${normCol(`${p}other_jobs`)} || ' ' ||
    ${normCol(`${p}address`)} || ' ' ||
    ${normCol(`${p}company`)} || ' ' ||
    ${normCol(`${p}distribution_sector`)} || ' ' ||
    ${normCol(`${p}medical_status`)} || ' ' ||
    ${normCol(`${p}inspection`)} || ' ' ||
    ${normCol(`${p}notes`)} || ' ' ||
    ${normCol(`${p}religion`)} || ' ' ||
    ${normCol(`${p}literacy`)} || ' ' ||
    ${normCol(`${p}travel_abroad`)} || ' ' ||
    ${normCol(`${p}wife`)} || ' ' ||
    ${normCol(`${p}father_name`)} || ' ' ||
    ${normCol(`${p}father_job`)} || ' ' ||
    ${normCol(`${p}mother_name`)} || ' ' ||
    ${normCol(`${p}mother_job`)} || ' ' ||
    ${normCol(`${p}siblings_check`)} || ' ' ||
    ${normCol(`${p}family_social_status`)} || ' ' ||
    ${normCol(`${p}family_security_status`)} || ' ' ||
    ${normCol(`${p}political_suspicion_status`)} || ' ' ||
    ${normCol(`${p}political_suspicion_details`)} || ' ' ||
    ${normCol(`${p}criminal_suspicion_status`)} || ' ' ||
    ${normCol(`${p}criminal_suspicion_details`)} || ' ' ||
    ${normCol(`${p}psychological_notes`)} || ' ' ||
    COALESCE(${p}birth_date, '') || ' ' ||
    COALESCE(${p}attendance_date, '') || ' ' ||
    CASE WHEN ${p}is_psychological_case = 1 THEN 'حالة نفسية حاله نفسيه نفسي عيادة نفسية غير متزن' ELSE '' END || ' ' ||
    CASE WHEN COALESCE(${p}political_suspicion_status, 'سليم') != 'سليم' THEN 'اشتباه سياسي امن سياسي' ELSE '' END || ' ' ||
    CASE WHEN COALESCE(${p}criminal_suspicion_status, 'سليم') != 'سليم' THEN 'اشتباه جنائي امن جنائي احكام قضايا' ELSE '' END
  `;
};

export async function initFts() {
  try {
    const ftsCheck = await get("SELECT sqlite_compileoption_used('ENABLE_FTS5') as enabled");
    const hasFts5 = ftsCheck && (ftsCheck.enabled === 1 || ftsCheck.enabled === '1');

    if (!hasFts5) {
      console.warn('⚠️ SQLite FTS5 extension is not enabled. Falling back to LIKE search.');
      return false;
    }

    // Ensure recruits_fts has the required search_text schema
    const tableInfo = await query("PRAGMA table_info(recruits_fts)").catch(() => []);
    const hasSearchText = Array.isArray(tableInfo) && tableInfo.some(col => col.name === 'search_text');

    if (tableInfo.length > 0 && !hasSearchText) {
      console.log('🔄 إعادة بناء جدول الفهرسة الشامل recruits_fts لدعم كافة الحقول...');
      await run(`DROP TABLE IF EXISTS recruits_fts`);
    }

    await run(`
      CREATE VIRTUAL TABLE IF NOT EXISTS recruits_fts USING fts5(
        recruit_id UNINDEXED,
        search_text,
        tokenize = 'unicode61 remove_diacritics 2'
      );
    `);

    // Clean up both legacy and new trigger names to prevent column mismatch errors
    await run(`DROP TRIGGER IF EXISTS trg_recruits_fts_insert`);
    await run(`DROP TRIGGER IF EXISTS trg_recruits_fts_delete`);
    await run(`DROP TRIGGER IF EXISTS trg_recruits_fts_update`);
    await run(`DROP TRIGGER IF EXISTS recruits_after_insert`);
    await run(`DROP TRIGGER IF EXISTS recruits_after_delete`);
    await run(`DROP TRIGGER IF EXISTS recruits_after_update`);

    await run(`
      CREATE TRIGGER recruits_after_insert
      AFTER INSERT ON recruits
      BEGIN
        INSERT INTO recruits_fts(recruit_id, search_text)
        VALUES (new.id, ${buildFullRecruitFtsExpr('new')});
      END;
    `);

    await run(`
      CREATE TRIGGER recruits_after_delete
      AFTER DELETE ON recruits
      BEGIN
        DELETE FROM recruits_fts WHERE recruit_id = old.id;
      END;
    `);

    await run(`
      CREATE TRIGGER recruits_after_update
      AFTER UPDATE ON recruits
      BEGIN
        DELETE FROM recruits_fts WHERE recruit_id = old.id;
        INSERT INTO recruits_fts(recruit_id, search_text)
        VALUES (new.id, ${buildFullRecruitFtsExpr('new')});
      END;
    `);

    await rebuildFtsIndex();
    console.log('✅ تم تحديث فهرس البحث الشامل FTS5 ليغطي جميع حقول المجندين (43 عموداً).');
    return true;
  } catch (err) {
    console.error('⚠️ فشل تهيئة جدول البحث FTS5:', err.message);
    return false;
  }
}

export async function rebuildFtsIndex() {
  try {
    await run('DELETE FROM recruits_fts');
    await run(`
      INSERT INTO recruits_fts(recruit_id, search_text)
      SELECT id, ${buildFullRecruitFtsExpr('')}
      FROM recruits
    `);
    const count = await get('SELECT COUNT(*) as count FROM recruits_fts');
    console.log(`✅ تم إعادة بناء فهرس FTS5 الشامل: ${count?.count || 0} سجلاً`);
    return true;
  } catch (err) {
    console.error('❌ فشل إعادة بناء فهرس FTS5:', err.message);
    return false;
  }
}

export const ensureFtsTable = initFts;
