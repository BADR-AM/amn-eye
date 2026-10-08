import { run, get, query } from '../db.js';

/**
 * Idempotent FTS5 Full-Text Search Schema & Index Migration for Recruits
 *
 * Preserves all original data, adds an FTS5 index on approved text fields,
 * and maintains real-time synchronization via SQLite triggers.
 *
 * Normalizes Arabic letters in the index (Alef variants, Taa Marbuta, Yaa)
 * while preserving the original characters so both forms match accurately.
 */

// SQL expression to concatenate original text and normalized Arabic text in FTS index
const normCol = (col) => `(COALESCE(${col}, '') || ' ' || REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(${col}, ''), 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ة', 'ه'), 'ى', 'ي'), 'ٱ', 'ا'))`;

export async function ensureFtsTable() {
  try {
    // 1. Create FTS5 virtual table
    await run(`
      CREATE VIRTUAL TABLE IF NOT EXISTS recruits_fts USING fts5(
        recruit_id UNINDEXED,
        name,
        national_id,
        recruit_code,
        qualification,
        current_job,
        other_jobs,
        address,
        company,
        notes,
        inspection,
        medical_status,
        tokenize = 'unicode61 remove_diacritics 2'
      );
    `);

    // 2. Drop existing triggers to ensure schema & normalization updates take effect
    await run(`DROP TRIGGER IF EXISTS trg_recruits_fts_insert;`);
    await run(`DROP TRIGGER IF EXISTS trg_recruits_fts_delete;`);
    await run(`DROP TRIGGER IF EXISTS trg_recruits_fts_update;`);

    // 3. Trigger on INSERT
    await run(`
      CREATE TRIGGER trg_recruits_fts_insert
      AFTER INSERT ON recruits
      BEGIN
        INSERT INTO recruits_fts (
          recruit_id, name, national_id, recruit_code, qualification,
          current_job, other_jobs, address, company, notes, inspection, medical_status
        ) VALUES (
          new.id,
          ${normCol('new.name')},
          COALESCE(new.national_id, ''),
          COALESCE(new.recruit_code, ''),
          ${normCol('new.qualification')},
          ${normCol('new.current_job')},
          ${normCol('new.other_jobs')},
          ${normCol('new.address')},
          ${normCol('new.company')},
          ${normCol('new.notes')},
          ${normCol('new.inspection')},
          ${normCol('new.medical_status')}
        );
      END;
    `);

    // 4. Trigger on DELETE
    await run(`
      CREATE TRIGGER trg_recruits_fts_delete
      AFTER DELETE ON recruits
      BEGIN
        DELETE FROM recruits_fts WHERE recruit_id = old.id;
      END;
    `);

    // 5. Trigger on UPDATE
    await run(`
      CREATE TRIGGER trg_recruits_fts_update
      AFTER UPDATE ON recruits
      BEGIN
        DELETE FROM recruits_fts WHERE recruit_id = old.id;
        INSERT INTO recruits_fts (
          recruit_id, name, national_id, recruit_code, qualification,
          current_job, other_jobs, address, company, notes, inspection, medical_status
        ) VALUES (
          new.id,
          ${normCol('new.name')},
          COALESCE(new.national_id, ''),
          COALESCE(new.recruit_code, ''),
          ${normCol('new.qualification')},
          ${normCol('new.current_job')},
          ${normCol('new.other_jobs')},
          ${normCol('new.address')},
          ${normCol('new.company')},
          ${normCol('new.notes')},
          ${normCol('new.inspection')},
          ${normCol('new.medical_status')}
        );
      END;
    `);

    // 6. Backfill index if FTS table is empty but recruits table has data
    const ftsCount = await get(`SELECT COUNT(*) as count FROM recruits_fts`);
    const recruitsCount = await get(`SELECT COUNT(*) as count FROM recruits`);

    if (recruitsCount && recruitsCount.count > 0 && (!ftsCount || ftsCount.count === 0)) {
      await rebuildFtsIndex();
    }

    return true;
  } catch (err) {
    console.error('⚠️ خطأ أثناء تهيئة فهرس البحث FTS5:', err.message);
    return false;
  }
}

/**
 * Rebuilds the entire FTS5 index from the recruits table.
 * Idempotent, safe, and non-destructive to original recruit records.
 */
export async function rebuildFtsIndex() {
  try {
    await run(`DELETE FROM recruits_fts;`);
    await run(`
      INSERT INTO recruits_fts (
        recruit_id, name, national_id, recruit_code, qualification,
        current_job, other_jobs, address, company, notes, inspection, medical_status
      )
      SELECT
        id,
        ${normCol('name')},
        COALESCE(national_id, ''),
        COALESCE(recruit_code, ''),
        ${normCol('qualification')},
        ${normCol('current_job')},
        ${normCol('other_jobs')},
        ${normCol('address')},
        ${normCol('company')},
        ${normCol('notes')},
        ${normCol('inspection')},
        ${normCol('medical_status')}
      FROM recruits;
    `);
    const count = await get(`SELECT COUNT(*) as count FROM recruits_fts`);
    console.log(`✅ تم بناء فهرس FTS5 بنجاح: ${count.count} سجل مفهرس`);
    return count.count;
  } catch (err) {
    console.error('❌ خطأ في إعادة بناء فهرس FTS5:', err.message);
    throw err;
  }
}
