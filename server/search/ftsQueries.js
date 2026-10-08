import { query, get } from '../db.js';
import { buildFts5Query, extractNationalId, normalizeArabic, normalizeDigits } from '../ai/arabicNormalize.js';

/**
 * Executes a safe, normalized search across recruits using FTS5 and exact fallbacks.
 *
 * @param {string} rawTerm - User's search text
 * @param {object} options - Search options
 * @param {number} [options.batchId] - Filter by recruitment batch
 * @param {string} [options.company] - Filter by company / unit
 * @param {number} [options.limit=20] - Maximum records to return
 * @param {number} [options.offset=0] - Pagination offset
 * @returns {Promise<{ results: Array, total: number, mode: string }>}
 */
export async function searchRecruits(rawTerm, options = {}) {
  const limit = Math.min(Math.max(1, parseInt(options.limit, 10) || 20), 100);
  const offset = Math.max(0, parseInt(options.offset, 10) || 0);
  const term = (rawTerm || '').trim();

  if (!term) {
    return { results: [], total: 0, mode: 'empty' };
  }

  // 1. Check for exact 14-digit National ID first (highest precedence)
  const nid = extractNationalId(term);
  if (nid) {
    const exactNidMatch = await query(`
      SELECT r.id, r.name, r.national_id, r.recruit_code, r.qualification,
             r.current_job, r.other_jobs, r.address, r.company, r.medical_status,
             r.photo_path, r.video_path, b.name as batch_name, r.batch_id
      FROM recruits r
      JOIN batches b ON r.batch_id = b.id
      WHERE r.national_id = ?
      LIMIT 1
    `, [nid]);

    if (exactNidMatch.length > 0) {
      return {
        results: exactNidMatch,
        total: exactNidMatch.length,
        mode: 'exact_national_id'
      };
    }
  }

  // 2. Check for exact recruit code (e.g. REC-1234 or numbers)
  const normalizedDigits = normalizeDigits(term);
  const exactCodeMatch = await query(`
    SELECT r.id, r.name, r.national_id, r.recruit_code, r.qualification,
           r.current_job, r.other_jobs, r.address, r.company, r.medical_status,
           r.photo_path, r.video_path, b.name as batch_name, r.batch_id
    FROM recruits r
    JOIN batches b ON r.batch_id = b.id
    WHERE r.recruit_code = ? OR r.recruit_code = ?
    LIMIT 1
  `, [term, normalizedDigits]);

  if (exactCodeMatch.length > 0) {
    return {
      results: exactCodeMatch,
      total: exactCodeMatch.length,
      mode: 'exact_recruit_code'
    };
  }

  // 3. FTS5 Search
  const ftsQueryStr = buildFts5Query(term);
  if (ftsQueryStr) {
    try {
      let filterSql = '';
      const filterParams = [ftsQueryStr];

      if (options.batchId) {
        filterSql += ` AND r.batch_id = ?`;
        filterParams.push(options.batchId);
      }
      if (options.company) {
        filterSql += ` AND r.company LIKE ?`;
        filterParams.push(`%${options.company}%`);
      }

      // Count total matches
      const countRow = await get(`
        SELECT COUNT(*) as total
        FROM recruits_fts f
        JOIN recruits r ON f.recruit_id = r.id
        WHERE recruits_fts MATCH ? ${filterSql}
      `, filterParams);

      const total = countRow?.total || 0;

      // Fetch paged results ranked by relevance
      const results = await query(`
        SELECT r.id, r.name, r.national_id, r.recruit_code, r.qualification,
               r.current_job, r.other_jobs, r.address, r.company, r.medical_status,
               r.photo_path, r.video_path, b.name as batch_name, r.batch_id,
               bm25(recruits_fts) as rank
        FROM recruits_fts f
        JOIN recruits r ON f.recruit_id = r.id
        JOIN batches b ON r.batch_id = b.id
        WHERE recruits_fts MATCH ? ${filterSql}
        ORDER BY rank
        LIMIT ? OFFSET ?
      `, [...filterParams, limit, offset]);

      if (results.length > 0) {
        return {
          results,
          total,
          mode: 'fts5'
        };
      }
    } catch (ftsErr) {
      // If FTS fails for any reason (e.g. malformed tokenizer syntax), fall back to LIKE
      console.warn('FTS5 query failed, falling back to LIKE:', ftsErr.message);
    }
  }

  // 4. Safe Fallback: Parameterized LIKE matching
  const normTerm = normalizeArabic(term);
  const likeParam = `%${normTerm}%`;

  let fallbackFilter = '';
  const fallbackParams = [likeParam, likeParam, likeParam, likeParam];

  if (options.batchId) {
    fallbackFilter += ` AND r.batch_id = ?`;
    fallbackParams.push(options.batchId);
  }
  if (options.company) {
    fallbackFilter += ` AND r.company LIKE ?`;
    fallbackParams.push(`%${options.company}%`);
  }

  const countFallback = await get(`
    SELECT COUNT(*) as total
    FROM recruits r
    WHERE (r.name LIKE ? OR r.national_id LIKE ? OR r.qualification LIKE ? OR r.current_job LIKE ?)
    ${fallbackFilter}
  `, fallbackParams);

  const fallbackResults = await query(`
    SELECT r.id, r.name, r.national_id, r.recruit_code, r.qualification,
           r.current_job, r.other_jobs, r.address, r.company, r.medical_status,
           r.photo_path, r.video_path, b.name as batch_name, r.batch_id
    FROM recruits r
    JOIN batches b ON r.batch_id = b.id
    WHERE (r.name LIKE ? OR r.national_id LIKE ? OR r.qualification LIKE ? OR r.current_job LIKE ?)
    ${fallbackFilter}
    ORDER BY r.id DESC
    LIMIT ? OFFSET ?
  `, [...fallbackParams, limit, offset]);

  return {
    results: fallbackResults,
    total: countFallback?.total || 0,
    mode: 'like_fallback'
  };
}
