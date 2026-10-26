import { query, get } from '../db.js';
import { extractNationalId, normalizeArabic, normalizeDigits } from '../ai/arabicNormalize.js';

const CONVERSATIONAL_STOP_WORDS = new Set([
  'مين', 'من', 'ما', 'ماذا', 'هل', 'فين', 'اين', 'امتي', 'متي', 'كيف', 'ازاي',
  'اللي', 'الذي', 'التي', 'الذين', 'الي', 'في', 'فى', 'علي', 'على', 'عن', 'مع',
  'كل', 'جميع', 'اي', 'ايه', 'عايز', 'عوز', 'اريد', 'هات', 'اعرض', 'وريني', 'شوف',
  'ابحث', 'بحث', 'طلع', 'قائمه', 'بيانات', 'معلومات', 'تفاصيل', 'اسماء', 'اسم',
  'مجند', 'مجندين', 'المجند', 'المجندين', 'العساكر', 'عسكري', 'افراد', 'الافراد',
  'الناس', 'الشباب', 'عنده', 'عندهم', 'لديه', 'لديهم', 'فيهم', 'منهم', 'بتوع', 'بتاع',
  'هو', 'هي', 'هم', 'كان', 'كانت', 'مسجل', 'مسجلين', 'المسجلين', 'المحفوظه', 'المحفوظين'
].map(w => normalizeArabic(w)));

const SELECT_RECRUIT_COLS = `
  r.id, r.name, r.national_id, r.recruit_code, r.police_number, r.military_number,
  r.qualification, r.current_job, r.other_jobs, r.address, r.company, r.distribution_sector,
  r.medical_status, r.inspection, r.notes, r.religion, r.literacy, r.travel_abroad,
  r.wife, r.father_name, r.father_job, r.mother_name, r.mother_job, r.siblings_check,
  r.family_social_status, r.family_security_status, r.political_suspicion_status,
  r.political_suspicion_details, r.criminal_suspicion_status, r.criminal_suspicion_details,
  r.is_psychological_case, r.psychological_notes, r.birth_date, r.attendance_date,
  r.photo_path, r.video_path, b.name as batch_name, r.batch_id
`;

export async function searchRecruitsFts(rawTerm, options = {}) {
  const limit = parseInt(options.limit || '25', 10);
  const offset = parseInt(options.offset || '0', 10);
  const term = rawTerm ? rawTerm.trim() : '';

  if (!term) {
    return { results: [], total: 0, mode: 'empty' };
  }

  // 1. Check for exact 14-digit National ID first (highest precedence)
  const nid = extractNationalId(term);
  if (nid) {
    const exactNidMatch = await query(`
      SELECT ${SELECT_RECRUIT_COLS}
      FROM recruits r
      LEFT JOIN batches b ON r.batch_id = b.id
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
    SELECT ${SELECT_RECRUIT_COLS}
    FROM recruits r
    LEFT JOIN batches b ON r.batch_id = b.id
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

  const allTokens = term
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map(t => normalizeArabic(t))
    .filter(t => t.length > 0);

  const meaningfulTokens = allTokens.filter(t => !CONVERSATIONAL_STOP_WORDS.has(t) && t.length > 1);
  const sanitizedTokens = meaningfulTokens.length > 0 ? meaningfulTokens : allTokens;

  if (sanitizedTokens.length === 0) {
    return { results: [], total: 0, mode: 'empty' };
  }

  let filterSql = '';
  const filterParams = [];

  if (options.batchId && options.batchId !== 'all') {
    filterSql += ' AND r.batch_id = ?';
    filterParams.push(options.batchId);
  }

  if (options.company) {
    filterSql += ' AND r.company LIKE ?';
    filterParams.push(`%${options.company}%`);
  }

  const joinedNormalized = sanitizedTokens.join(' ');
  let semanticSqlCondition = null;

  if (/(سافر|سفر|بره|خارج البلاد|دوله)/.test(joinedNormalized)) {
    semanticSqlCondition = `r.travel_abroad IS NOT NULL AND TRIM(r.travel_abroad) != '' AND TRIM(r.travel_abroad) NOT IN ('لا', 'لا يوجد', 'لم يسافر', 'بدون', '-')`;
  } else if (/(سياسي|اخوان|انتماء)/.test(joinedNormalized)) {
    semanticSqlCondition = `(COALESCE(r.political_suspicion_status, 'سليم') != 'سليم' OR (r.political_suspicion_details IS NOT NULL AND TRIM(r.political_suspicion_details) != ''))`;
  } else if (/(جنائي|قضيه|قضايا|حكم|احكام|سوابق)/.test(joinedNormalized)) {
    semanticSqlCondition = `(COALESCE(r.criminal_suspicion_status, 'سليم') != 'سليم' OR (r.criminal_suspicion_details IS NOT NULL AND TRIM(r.criminal_suspicion_details) != ''))`;
  } else if (/(نفسي|نفسيه|عصبيه|عياده|غير متزن)/.test(joinedNormalized)) {
    semanticSqlCondition = `(r.is_psychological_case = 1 OR (r.psychological_notes IS NOT NULL AND TRIM(r.psychological_notes) != ''))`;
  } else if (/(امي|بصمجي|لا يقرا|لا يكتب)/.test(joinedNormalized)) {
    semanticSqlCondition = `(r.literacy LIKE '%أمي%' OR r.literacy LIKE '%امي%' OR r.literacy LIKE '%بصم%' OR r.literacy LIKE '%لا يقرأ%')`;
  }

  if (semanticSqlCondition) {
    const semCount = await get(`
      SELECT COUNT(*) as total FROM recruits r WHERE ${semanticSqlCondition} ${filterSql}
    `, filterParams);
    if ((semCount?.total || 0) > 0) {
      const semResults = await query(`
        SELECT ${SELECT_RECRUIT_COLS}
        FROM recruits r
        LEFT JOIN batches b ON r.batch_id = b.id
        WHERE ${semanticSqlCondition} ${filterSql}
        ORDER BY r.id DESC
        LIMIT ? OFFSET ?
      `, [...filterParams, limit, offset]);
      return { results: semResults, total: semCount.total, mode: 'semantic_sql' };
    }
  }

  try {
    const ftsAndQuery = sanitizedTokens.map(t => `"${t}"*`).join(' AND ');

    const countAndRow = await get(`
      SELECT COUNT(*) as total
      FROM recruits_fts f
      JOIN recruits r ON f.recruit_id = r.id
      WHERE recruits_fts MATCH ? ${filterSql}
    `, [ftsAndQuery, ...filterParams]);

    if (countAndRow && countAndRow.total > 0) {
      const results = await query(`
        SELECT ${SELECT_RECRUIT_COLS}, bm25(recruits_fts) as rank
        FROM recruits_fts f
        JOIN recruits r ON f.recruit_id = r.id
        LEFT JOIN batches b ON r.batch_id = b.id
        WHERE recruits_fts MATCH ? ${filterSql}
        ORDER BY rank
        LIMIT ? OFFSET ?
      `, [ftsAndQuery, ...filterParams, limit, offset]);

      return { results, total: countAndRow.total, mode: 'fts5_and' };
    }

    if (sanitizedTokens.length > 1) {
      const ftsOrQuery = sanitizedTokens.map(t => `"${t}"*`).join(' OR ');
      const orParams = [ftsOrQuery, ...filterParams];
      const countOrRow = await get(`
        SELECT COUNT(*) as total
        FROM recruits_fts f
        JOIN recruits r ON f.recruit_id = r.id
        WHERE recruits_fts MATCH ? ${filterSql}
      `, orParams);

      if ((countOrRow?.total || 0) > 0) {
        const orResults = await query(`
          SELECT ${SELECT_RECRUIT_COLS}, bm25(recruits_fts) as rank
          FROM recruits_fts f
          JOIN recruits r ON f.recruit_id = r.id
          LEFT JOIN batches b ON r.batch_id = b.id
          WHERE recruits_fts MATCH ? ${filterSql}
          ORDER BY rank
          LIMIT ? OFFSET ?
        `, [...orParams, limit, offset]);

        if (orResults.length > 0) {
          return { results: orResults, total: countOrRow.total, mode: 'fts5_or' };
        }
      }
    }
  } catch (ftsErr) {
    console.warn('FTS5 query failed, falling back to LIKE:', ftsErr.message);
  }

  const normTerm = normalizeArabic(sanitizedTokens.join(' '));
  const rawLike = `%${term}%`;
  const normLike = `%${normTerm}%`;

  const likeCols = [
    'r.name', 'r.national_id', 'r.recruit_code', 'r.police_number', 'r.military_number',
    'r.qualification', 'r.current_job', 'r.other_jobs', 'r.address', 'r.company',
    'r.distribution_sector', 'r.medical_status', 'r.inspection', 'r.notes',
    'r.travel_abroad', 'r.father_name', 'r.father_job', 'r.mother_name', 'r.mother_job',
    'r.political_suspicion_status', 'r.political_suspicion_details',
    'r.criminal_suspicion_status', 'r.criminal_suspicion_details', 'r.psychological_notes'
  ];

  const whereClause = likeCols.map(c => `(${c} LIKE ? OR ${c} LIKE ?)`).join(' OR ');
  const likeParams = [];
  likeCols.forEach(() => {
    likeParams.push(rawLike, normLike);
  });

  const countFallback = await get(`
    SELECT COUNT(*) as total
    FROM recruits r
    WHERE (${whereClause}) ${filterSql}
  `, [...likeParams, ...filterParams]);

  const fallbackResults = await query(`
    SELECT ${SELECT_RECRUIT_COLS}
    FROM recruits r
    LEFT JOIN batches b ON r.batch_id = b.id
    WHERE (${whereClause}) ${filterSql}
    ORDER BY r.id DESC
    LIMIT ? OFFSET ?
  `, [...likeParams, ...filterParams, limit, offset]);

  return {
    results: fallbackResults,
    total: countFallback?.total || 0,
    mode: 'like_fallback'
  };
}

export const searchRecruits = searchRecruitsFts;
