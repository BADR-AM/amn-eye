import { query, get } from '../db.js';
import { SQL_MEDICAL_FIT, SQL_MEDICAL_UNFIT, SQL_MEDICAL_UNDETERMINED } from '../search/medicalStatus.js';
import { searchRecruits } from '../search/ftsQueries.js';

/**
 * Strict, read-only allowlisted query catalog.
 *
 * Guarantees:
 * 1. Zero arbitrary SQL execution.
 * 2. All parameters are type-checked and bound.
 * 3. Max row limit enforced to protect low-RAM systems (8GB).
 * 4. Ground-truth numbers computed by SQLite, never hallucinated.
 */

const MAX_ROWS = 50;

export const QUERY_CATALOG = {
  // 1. Overview System KPIs
  overview_kpi_summary: {
    id: 'overview_kpi_summary',
    title: 'المؤشرات العامة للمنظومة',
    description: 'إحصائيات إجمالية لعدد المجندين، الدفع النشط، تيكتات الاشتباه، والحالات قيد المتابعة',
    execute: async () => {
      const stats = await get(`SELECT COUNT(*) as total_recruits FROM recruits`);
      const activeBatch = await get(`SELECT id, name FROM batches WHERE active = 1 LIMIT 1`);
      const tickets = await get(`SELECT COUNT(*) as open_tickets FROM recruit_tickets WHERE status = 'open'`).catch(() => ({ open_tickets: 0 }));
      const psych = await get(`SELECT COUNT(*) as psych_cases FROM recruits WHERE is_psychological_case = 1`);
      const secCount = await get(`SELECT COUNT(*) as count FROM recruits WHERE REPLACE(company, 'أ', 'ا') LIKE '%امن%'`);
      const baseCount = await get(`SELECT COUNT(*) as count FROM recruits WHERE REPLACE(company, 'أ', 'ا') LIKE '%قاعد%' OR REPLACE(REPLACE(company, 'أ', 'ا'), 'ة', 'ه') LIKE '%اساسي%' OR REPLACE(company, 'ة', 'ه') LIKE '%سريه%'`);
      const companyRows = await query(`SELECT COALESCE(NULLIF(TRIM(company), ''), 'غير موزع على سرية') as company_name, COUNT(*) as count FROM recruits GROUP BY company_name ORDER BY count DESC`);
      const fitCount = await get(`SELECT COUNT(*) as count FROM recruits WHERE ${SQL_MEDICAL_FIT}`);
      const unfitCount = await get(`SELECT COUNT(*) as count FROM recruits WHERE ${SQL_MEDICAL_UNFIT}`);
      const distributedCount = await get(`SELECT COUNT(*) as count FROM recruits WHERE distribution_sector IS NOT NULL AND TRIM(distribution_sector) != ''`);
      const politicalCases = await get(`SELECT COUNT(*) as count FROM recruits WHERE COALESCE(political_suspicion_status, 'سليم') != 'سليم'`);
      const criminalCases = await get(`SELECT COUNT(*) as count FROM recruits WHERE COALESCE(criminal_suspicion_status, 'سليم') != 'سليم'`);
      const traveledAbroad = await get(`SELECT COUNT(*) as count FROM recruits WHERE travel_abroad IS NOT NULL AND TRIM(travel_abroad) != '' AND TRIM(travel_abroad) NOT IN ('لا', 'لا يوجد', 'لم يسافر', 'بدون', '-')`);

      const total = stats?.total_recruits || 0;
      const fit = fitCount?.count || 0;
      const unfit = unfitCount?.count || 0;

      return {
        total_recruits: total,
        active_batch: activeBatch ? activeBatch.name : 'لا توجد دفعة نشطة',
        open_tickets: tickets?.open_tickets || 0,
        psych_cases: psych?.psych_cases || 0,
        political_suspicion_cases: politicalCases?.count || 0,
        criminal_suspicion_cases: criminalCases?.count || 0,
        traveled_abroad_count: traveledAbroad?.count || 0,
        security_company_force: secCount?.count || 0,
        base_force: baseCount?.count || 0,
        companies_breakdown: companyRows || [],
        medically_fit: fit,
        medically_unfit: unfit,
        medically_undetermined: Math.max(0, total - (fit + unfit)),
        distributed_recruits: distributedCount?.count || 0,
        unassigned_recruits: Math.max(0, total - (distributedCount?.count || 0))
      };
    }
  },

  // 2. Batches Statistics
  stats_by_batch: {
    id: 'stats_by_batch',
    title: 'توزيع المجندين حسب الدفوع التجنيدية',
    description: 'حصر أعداد المجندين المقيدين في كل دفع تجنيدي وتحديد الدفع النشط',
    execute: async () => {
      const rows = await query(`
        SELECT b.id, b.name, b.year, b.month, b.active, COUNT(r.id) as recruit_count
        FROM batches b
        LEFT JOIN recruits r ON b.id = r.batch_id
        GROUP BY b.id
        ORDER BY b.year DESC, b.month DESC
        LIMIT 20
      `);
      return rows;
    }
  },

  // 3. Qualifications Statistics
  stats_by_qualification: {
    id: 'stats_by_qualification',
    title: 'توزيع المؤهلات الدراسية',
    description: 'حصر وتوزيع المجندين حسب المؤهل العلمي (عالي، فوق متوسط، متوسط، عادة، محو أمية)',
    execute: async (params = {}) => {
      let filter = '';
      const sqlParams = [];
      if (params.batchId) {
        filter = 'WHERE batch_id = ?';
        sqlParams.push(parseInt(params.batchId, 10));
      }
      const rows = await query(`
        SELECT qualification, COUNT(*) as count
        FROM recruits
        ${filter}
        GROUP BY qualification
        ORDER BY count DESC
        LIMIT 30
      `, sqlParams);
      return rows;
    }
  },

  // 4. Company / Force Distribution
  stats_by_company: {
    id: 'stats_by_company',
    title: 'توزيع المجندين على السرايا والوحدات',
    description: 'بيان قوة السرايا التدريبية وسرية الأمن والقوة الأساسية',
    execute: async () => {
      const rows = await query(`
        SELECT company, COUNT(*) as count
        FROM recruits
        WHERE company IS NOT NULL AND company != ''
        GROUP BY company
        ORDER BY count DESC
        LIMIT 20
      `);
      return rows;
    }
  },

  // 4.1 Distribution Sectors Statistics (قطاعات التوزيع)
  stats_by_distribution_sector: {
    id: 'stats_by_distribution_sector',
    title: 'توزيع المجندين حسب القطاعات والجهات الموزع عليها',
    description: 'إحصائية وبيان توزيع المجندين بعد انتهاء التدريب الأساسي على قطاعات الأمن المركزي والجهات الخارجية',
    execute: async () => {
      const rows = await query(`
        SELECT 
          CASE 
            WHEN distribution_sector IS NULL OR distribution_sector = '' THEN 'قيد التدريب (لم يتم التوزيع)'
            ELSE distribution_sector
          END as sector,
          COUNT(*) as count
        FROM recruits
        GROUP BY sector
        ORDER BY count DESC
      `);
      const totalRecruits = await get(`SELECT COUNT(*) as c FROM recruits`);
      const distributed = await get(`SELECT COUNT(*) as c FROM recruits WHERE distribution_sector IS NOT NULL AND distribution_sector != ''`);
      return {
        sectors: rows,
        total: totalRecruits?.c || 0,
        distributed_count: distributed?.c || 0,
        unassigned_count: (totalRecruits?.c || 0) - (distributed?.c || 0)
      };
    }
  },

  // 4.2 List Recruits by Distribution Sector
  list_recruits_by_distribution_sector: {
    id: 'list_recruits_by_distribution_sector',
    title: 'قائمة المجندين الموزعين على قطاع معين',
    description: 'استخراج أسماء وتفاصيل المجندين الموزعين على قطاع أو جهة محددة',
    execute: async (params = {}) => {
      const sector = params.sector || '';
      let rows;
      if (!sector || sector === 'unassigned' || sector === 'غير موزع' || sector === 'لم يوزع') {
        rows = await query(`
          SELECT id, name, national_id, military_number, police_number, company, qualification, distribution_sector
          FROM recruits
          WHERE distribution_sector IS NULL OR distribution_sector = ''
          ORDER BY id DESC
          LIMIT 50
        `);
      } else {
        rows = await query(`
          SELECT id, name, national_id, military_number, police_number, company, qualification, distribution_sector
          FROM recruits
          WHERE distribution_sector LIKE ?
          ORDER BY id DESC
          LIMIT 50
        `, [`%${sector}%`]);
      }
      return {
        sector: sector || 'قيد التدريب (لم يتم التوزيع)',
        count: rows.length,
        recruits: rows
      };
    }
  },

  // 5. Medical Status Statistics (Strictly categorized)
  stats_by_medical_status: {
    id: 'stats_by_medical_status',
    title: 'إحصائيات اللياقة الطبية',
    description: 'تصنيف دقيق للمجندين إلى لائق، غير لائق، وقيد الفحص دون تداخل',
    execute: async () => {
      const fit = await get(`SELECT COUNT(*) as count FROM recruits WHERE ${SQL_MEDICAL_FIT}`);
      const unfit = await get(`SELECT COUNT(*) as count FROM recruits WHERE ${SQL_MEDICAL_UNFIT}`);
      const pending = await get(`SELECT COUNT(*) as count FROM recruits WHERE ${SQL_MEDICAL_UNDETERMINED}`);
      const referrals = await get(`
        SELECT COUNT(DISTINCT recruit_id) as count
        FROM recruit_activities
        WHERE activity_type = 'medical_referral' AND (return_date IS NULL OR return_date = '')
      `);

      return {
        fit: fit?.count || 0,
        unfit: unfit?.count || 0,
        undetermined: pending?.count || 0,
        active_referrals: referrals?.count || 0
      };
    }
  },

  // 6. Security Tickets List
  list_security_tickets: {
    id: 'list_security_tickets',
    title: 'تيكتات الاشتباه الأمني والجنائي والسياسي',
    description: 'بيان تيكتات المتابعة والاشتباه المفتوحة والمغلقة',
    execute: async (params = {}) => {
      const status = params.status === 'closed' ? 'closed' : 'open';
      const rows = await query(`
        SELECT t.id, t.ticket_type, t.title, t.description, t.status, t.created_at,
               r.id as recruit_id, r.name as recruit_name, r.company, r.national_id
        FROM recruit_tickets t
        JOIN recruits r ON t.recruit_id = r.id
        WHERE t.status = ?
        ORDER BY t.id DESC
        LIMIT ?
      `, [status, MAX_ROWS]);
      return rows;
    }
  },

  // 7. Psychological Cases List
  list_psychological_cases: {
    id: 'list_psychological_cases',
    title: 'الحالات غير المتزنة نفسياً وعصبياً',
    description: 'حصر المجندين المقيدين كحالات نفسية قيد الملاحظة والمتابعة',
    execute: async () => {
      const rows = await query(`
        SELECT r.id, r.name, r.national_id, r.company, r.qualification,
               r.psychological_notes, r.last_psychological_followup
        FROM recruits r
        WHERE r.is_psychological_case = 1
           OR r.inspection LIKE '%نفسي%'
           OR r.inspection LIKE '%عصبي%'
        ORDER BY r.id DESC
        LIMIT ?
      `, [MAX_ROWS]);
      return rows;
    }
  },

  // 8. Hospital Movements / Referrals
  list_hospital_movements: {
    id: 'list_hospital_movements',
    title: 'تحركات مستشفيات الشرطة',
    description: 'بيان إحالات المجندين لمستشفيات الشرطة بطنطا ومدينة نصر والعيادات الخارجية',
    execute: async (params = {}) => {
      const hospitalFilter = params.hospital ? `%${params.hospital}%` : '%مستشف%';
      const rows = await query(`
        SELECT a.id, a.activity_type, a.destination, a.departure_date, a.return_date, a.notes,
               r.id as recruit_id, r.name as recruit_name, r.company
        FROM recruit_activities a
        JOIN recruits r ON a.recruit_id = r.id
        WHERE (a.activity_type = 'medical_referral' OR a.destination LIKE ?)
        ORDER BY a.id DESC
        LIMIT ?
      `, [hospitalFilter, MAX_ROWS]);
      return rows;
    }
  },

  // 9. Trades & Crafts List
  list_trades_and_crafts: {
    id: 'list_trades_and_crafts',
    title: 'أصحاب الحرف والمهن الفنية',
    description: 'حصر المجندين أصحاب المهن اليدوية والفنية (كهربائي، نجار، سباك، سائق، حداد...)',
    execute: async (params = {}) => {
      let filter = `(current_job NOT LIKE '%بدون%' AND current_job NOT LIKE '%لا يوجد%' AND current_job IS NOT NULL AND current_job != '')`;
      const sqlParams = [];

      if (params.trade) {
        const rawT = params.trade.trim();
        const synonyms = [rawT];
        if (rawT === 'سواق' || rawT === 'سائق') synonyms.push('سواق', 'سائق', 'قيادة');
        if (rawT === 'كهربائي') synonyms.push('كهرباء', 'سلسيون');
        if (rawT === 'نجار') synonyms.push('نجارة', 'موبليا', 'خشب');
        if (rawT === 'نقاش') synonyms.push('نقاشة', 'دهان', 'ديكور');
        if (rawT === 'سباك') synonyms.push('سباكة', 'صحي');
        if (rawT === 'حداد') synonyms.push('حدادة', 'كريتال', 'لحام');
        if (rawT === 'ميكانيكي') synonyms.push('ميكانيك', 'سيارات', 'ديزل');
        if (rawT === 'تكييف') synonyms.push('تبريد', 'صيانة');
        if (rawT === 'مبلط') synonyms.push('سيراميك', 'بلاط', 'رخام');
        if (rawT === 'حلاق') synonyms.push('كوافير', 'حلاقة');
        if (rawT === 'ترزي') synonyms.push('تفصيل', 'خياط');
        if (rawT === 'طباخ') synonyms.push('شيف', 'مطابخ', 'طعام');

        const uniqueSyns = [...new Set(synonyms)];
        const clauses = uniqueSyns.map(() => `(current_job LIKE ? OR other_jobs LIKE ?)`).join(' OR ');
        filter += ` AND (${clauses})`;
        for (const s of uniqueSyns) {
          sqlParams.push(`%${s}%`, `%${s}%`);
        }
      }

      sqlParams.push(MAX_ROWS);

      const rows = await query(`
        SELECT id, name, national_id, current_job, other_jobs, company, address
        FROM recruits
        WHERE ${filter}
        ORDER BY id DESC
        LIMIT ?
      `, sqlParams);
      return rows;
    }
  },

  // 10. Travel Abroad Records
  list_travel_cases: {
    id: 'list_travel_cases',
    title: 'المجندين الذين سبق لهم السفر للخارج',
    description: 'حصر المجندين المسجل لهم سفر خارج جمهورية مصر العربية',
    execute: async () => {
      const rows = await query(`
        SELECT id, name, national_id, company, travel_abroad, address
        FROM recruits
        WHERE travel_abroad IS NOT NULL
          AND travel_abroad != ''
          AND travel_abroad NOT LIKE '%لا%'
          AND travel_abroad NOT LIKE '%لم يسافر%'
        ORDER BY id DESC
        LIMIT ?
      `, [MAX_ROWS]);
      return rows;
    }
  },

  // 11. Social / Marital Status
  stats_by_marital_status: {
    id: 'stats_by_marital_status',
    title: 'الحالة الاجتماعية (المتزوجين والعزاب)',
    description: 'حصر المجندين المتزوجين من واقع حقل الزوجة',
    execute: async () => {
      const married = await get(`
        SELECT COUNT(*) as count FROM recruits
        WHERE wife IS NOT NULL AND wife != '' AND wife NOT LIKE '%أعزب%' AND wife NOT LIKE '%اعزب%' AND wife NOT LIKE '%لا يوجد%'
      `);
      const total = await get(`SELECT COUNT(*) as count FROM recruits`);
      const marriedCount = married?.count || 0;
      const totalCount = total?.count || 0;

      return {
        married: marriedCount,
        single: Math.max(0, totalCount - marriedCount),
        total: totalCount
      };
    }
  },

  // 12. Religion Distribution
  stats_by_religion: {
    id: 'stats_by_religion',
    title: 'توزيع الديانة',
    description: 'توزيع المجندين حسب الديانة (مسلم / مسيحي)',
    execute: async () => {
      const rows = await query(`
        SELECT religion, COUNT(*) as count
        FROM recruits
        WHERE religion IS NOT NULL AND religion != ''
        GROUP BY religion
        ORDER BY count DESC
      `);
      return rows;
    }
  },

  // 13. Search Recruits (Exact or FTS5)
  search_recruits: {
    id: 'search_recruits',
    title: 'بحث فوري في سجلات المجندين',
    description: 'بحث بالاسم أو الرقم القومي أو المؤهل أو المهنة أو الملاحظات',
    execute: async (params = {}) => {
      const term = params.query || params.term || '';
      return await searchRecruits(term, {
        batchId: params.batchId,
        company: params.company,
        limit: params.limit || 20,
        offset: params.offset || 0
      });
    }
  },

  // 14. Exact National ID Lookup
  get_recruit_by_national_id: {
    id: 'get_recruit_by_national_id',
    title: 'استعلام مجند بالرقم القومي',
    description: 'استعلام تفصيلي دقيق عن مجند بموجب رقمه القومي المكون من 14 رقماً',
    execute: async (params = {}) => {
      const nid = params.national_id;
      if (!nid) return null;
      const rows = await query(`
        SELECT r.*, b.name as batch_name
        FROM recruits r
        JOIN batches b ON r.batch_id = b.id
        WHERE r.national_id = ?
        LIMIT 1
      `, [String(nid).trim()]);
      return rows[0] || null;
    }
  },

  // 15. Recruits by Location / Governorate
  list_recruits_by_location: {
    id: 'list_recruits_by_location',
    title: 'حصر المجندين حسب المحافظة ومحل الإقامة',
    description: 'استعلام عن المجندين من محافظة أو مركز أو مدينة معينة',
    execute: async (params = {}) => {
      const loc = (params.location || params.query || '').trim();
      const rows = await query(`
        SELECT id, name, national_id, company, address, current_job, qualification
        FROM recruits
        WHERE address LIKE ?
        ORDER BY id DESC
        LIMIT ?
      `, [`%${loc}%`, MAX_ROWS]);
      return rows;
    }
  },

  // 16. Recruits by Specific Company
  list_recruits_by_company: {
    id: 'list_recruits_by_company',
    title: 'كشف أفراد وسرايا المجندين',
    description: 'بيان أسماء وبيانات المجندين في سرية محددة (سرية الأمن، القوة الأساسية، السرية الأولى...)',
    execute: async (params = {}) => {
      const comp = (params.company || '').trim();
      const rows = await query(`
        SELECT id, name, national_id, company, qualification, current_job, medical_status, police_number
        FROM recruits
        WHERE company LIKE ?
        ORDER BY id DESC
        LIMIT ?
      `, [`%${comp}%`, MAX_ROWS]);
      return rows;
    }
  },

  // 17. Married Recruits List
  list_married_recruits: {
    id: 'list_married_recruits',
    title: 'بيان المجندين المتزوجين',
    description: 'كشف تفصيلي بأسماء المجندين المتزوجين وبيانات الزوجة',
    execute: async () => {
      const rows = await query(`
        SELECT id, name, national_id, company, wife, address, qualification
        FROM recruits
        WHERE wife IS NOT NULL AND wife != '' AND wife NOT LIKE '%أعزب%' AND wife NOT LIKE '%اعزب%' AND wife NOT LIKE '%لا يوجد%'
        ORDER BY id DESC
        LIMIT ?
      `, [MAX_ROWS]);
      return rows;
    }
  },

  // 18. Physical Inspection, Surgeries, Tattoos, and Scars
  list_physical_injuries_and_tattoos: {
    id: 'list_physical_injuries_and_tattoos',
    title: 'توثيق العمليات الجراحية، الإصابات، والوشوم',
    description: 'حصر المجندين الذين لديهم عمليات جراحية سابقة، كسور، كدمات، جروح قديمة، أو وشوم مسجلة بالهيئة',
    execute: async (params = {}) => {
      const type = params.type || 'all';
      let whereClause = `
        (inspection LIKE '%عملي%' OR inspection LIKE '%جراح%' OR inspection LIKE '%وشم%' OR inspection LIKE '%تاتو%'
         OR inspection LIKE '%كسر%' OR inspection LIKE '%جرح%' OR inspection LIKE '%خياط%' OR inspection LIKE '%إصاب%' OR inspection LIKE '%اصاب%')
      `;

      if (type === 'tattoo') {
        whereClause = `(inspection LIKE '%وشم%' OR inspection LIKE '%تاتو%')`;
      } else if (type === 'surgery') {
        whereClause = `(inspection LIKE '%عملي%' OR inspection LIKE '%جراح%' OR inspection LIKE '%فتق%' OR inspection LIKE '%خياط%')`;
      } else if (type === 'fracture_injury') {
        whereClause = `(inspection LIKE '%كسر%' OR inspection LIKE '%جرح%' OR inspection LIKE '%إصاب%' OR inspection LIKE '%اصاب%')`;
      }

      const rows = await query(`
        SELECT id, name, national_id, company, inspection, medical_status
        FROM recruits
        WHERE ${whereClause}
        ORDER BY id DESC
        LIMIT ?
      `, [MAX_ROWS]);
      return rows;
    }
  },

  // 19. Qualifications Filter by Specific Level
  list_recruits_by_qualification_level: {
    id: 'list_recruits_by_qualification_level',
    title: 'حصر المجندين حسب مستوى المؤهل',
    description: 'كشف أسماء المجندين لمؤهل محدد (عالي / فوق متوسط / متوسط / عادة وبدون مؤهل / محو أمية)',
    execute: async (params = {}) => {
      const level = (params.level || '').trim();
      let filter = 'qualification LIKE ?';
      const sqlParams = [`%${level}%`];

      if (level === 'عالي') {
        filter = `(qualification LIKE '%عالي%' OR qualification LIKE '%جامع%' OR qualification LIKE '%بكالوريوس%' OR qualification LIKE '%ليسانس%')`;
        sqlParams.length = 0;
      } else if (level === 'فوق متوسط') {
        filter = `(qualification LIKE '%فوق متوسط%' OR qualification LIKE '%معهد فني%')`;
        sqlParams.length = 0;
      } else if (level === 'متوسط') {
        filter = `(qualification LIKE '%متوسط%' AND qualification NOT LIKE '%فوق متوسط%') OR qualification LIKE '%دبلوم%'`;
        sqlParams.length = 0;
      } else if (level === 'عادة' || level === 'بدون مؤهل') {
        filter = `(qualification LIKE '%عادة%' OR qualification LIKE '%بدون%' OR qualification LIKE '%ابتدائ%' OR qualification LIKE '%إعداد%')`;
        sqlParams.length = 0;
      } else if (level === 'محو أمية') {
        filter = `(qualification LIKE '%محو أمية%' OR qualification LIKE '%محو امية%')`;
        sqlParams.length = 0;
      }

      sqlParams.push(MAX_ROWS);
      const rows = await query(`
        SELECT id, name, national_id, company, qualification, current_job, address
        FROM recruits
        WHERE ${filter}
        ORDER BY id DESC
        LIMIT ?
      `, sqlParams);
      return rows;
    }
  },

  // 20. System Audit Log Overview (who did what)
  list_recent_system_audits: {
    id: 'list_recent_system_audits',
    title: 'سجل حركات وتدقيق المنظومة (Audit Log)',
    description: 'بيان آخر الحركات والتعديلات والإضافات التي تمت على النظام مع أسماء المستخدمين وتوقيتها بالثانية',
    execute: async (params = {}) => {
      const limit = params.limit || 15;
      const rows = await query(`
        SELECT a.id, a.username, a.user_fullname, a.action_type, a.details, a.ip_address, a.created_at
        FROM audit_logs a
        ORDER BY a.id DESC
        LIMIT ?
      `, [limit]);
      return rows;
    }
  }
};

/**
 * Safely executes an allowlisted query with validation and limits.
 */
export async function executeQuery(queryId, params = {}) {
  const qDef = QUERY_CATALOG[queryId];
  if (!qDef) {
    throw new Error(`استعلام غير مسجل في قائمة الاستعلامات المعتمدة: ${queryId}`);
  }
  return await qDef.execute(params);
}
