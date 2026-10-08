import { extractNationalId, normalizeArabic } from './arabicNormalize.js';
import { validateIntent } from './intentSchema.js';
import { executeQuery } from './queryCatalog.js';
import { formatQueryResult } from './resultFormatter.js';
import { modelManager } from './modelManager.js';
import { modelAdapter } from './modelAdapter.js';

/**
 * Two-tier Hybrid Intent Router:
 * 1. Safe Deterministic Rule & Catalog Routing (Instant, 0 RAM, 100% precise)
 * 2. Local AI LLM-Assisted Planning (Optional, for complex/unstructured natural phrasing)
 */

export async function routeUserQuery(message, options = {}) {
  const rawMsg = (message || '').trim();
  if (!rawMsg) {
    const defaultKpi = await executeQuery('overview_kpi_summary');
    return {
      intent: 'overview_kpi_summary',
      mode: 'deterministic',
      ...formatQueryResult('overview_kpi_summary', defaultKpi)
    };
  }

  // 1. Check for exact 14-digit National ID
  const nid = extractNationalId(rawMsg);
  if (nid) {
    const data = await executeQuery('get_recruit_by_national_id', { national_id: nid });
    return {
      intent: 'get_recruit_by_national_id',
      mode: 'deterministic',
      statusLabel: 'استعلام مباشر بالرقم القومي',
      ...formatQueryResult('get_recruit_by_national_id', data)
    };
  }

  // 2. Deterministic keyword matching
  const norm = normalizeArabic(rawMsg).toLowerCase();

  // Security tickets
  if (norm.includes('تيكت') || norm.includes('اشتباه') || norm.includes('سوابق') || norm.includes('جنائي') || norm.includes('سياسي')) {
    const data = await executeQuery('list_security_tickets');
    return {
      intent: 'list_security_tickets',
      mode: 'deterministic',
      statusLabel: 'استعلام تيكتات الاشتباه والملاحظات الأمنية',
      ...formatQueryResult('list_security_tickets', data)
    };
  }

  // Psychological cases
  if (norm.includes('نفسي') || norm.includes('عصبي') || norm.includes('غير متزن') || norm.includes('سلوك')) {
    const data = await executeQuery('list_psychological_cases');
    return {
      intent: 'list_psychological_cases',
      mode: 'deterministic',
      statusLabel: 'حصر الحالات غير المتزنة نفسياً وعصبياً',
      ...formatQueryResult('list_psychological_cases', data)
    };
  }

  // Hospital movements
  if (norm.includes('مستشفي') || norm.includes('طنطا') || norm.includes('مدينه نصر') || norm.includes('احاله') || norm.includes('تحركات')) {
    const data = await executeQuery('list_hospital_movements');
    return {
      intent: 'list_hospital_movements',
      mode: 'deterministic',
      statusLabel: 'بيان تحركات وإحالات مستشفيات الشرطة',
      ...formatQueryResult('list_hospital_movements', data)
    };
  }

  // Trades and crafts
  if (norm.includes('مهن') || norm.includes('حرف') || norm.includes('كهربائي') || norm.includes('نجار') || norm.includes('سباك') || norm.includes('سائق') || norm.includes('حداد') || norm.includes('صنعه')) {
    const data = await executeQuery('list_trades_and_crafts');
    return {
      intent: 'list_trades_and_crafts',
      mode: 'deterministic',
      statusLabel: 'حصر أصحاب الحرف والمهن الفنية',
      ...formatQueryResult('list_trades_and_crafts', data)
    };
  }

  // Medical status
  if (norm.includes('لائق') || norm.includes('مرض') || norm.includes('طبي') || norm.includes('عمليات') || norm.includes('مناظره')) {
    const data = await executeQuery('stats_by_medical_status');
    return {
      intent: 'stats_by_medical_status',
      mode: 'deterministic',
      statusLabel: 'إحصاء اللياقة الطبية والمناظرة',
      ...formatQueryResult('stats_by_medical_status', data)
    };
  }

  // Companies / Security company
  if (norm.includes('سريه') || norm.includes('سرايا') || norm.includes('قوه اساسيه') || norm.includes('كتيبه')) {
    const data = await executeQuery('stats_by_company');
    return {
      intent: 'stats_by_company',
      mode: 'deterministic',
      statusLabel: 'حصر قوة السرايا وقوة سرية الأمن',
      ...formatQueryResult('stats_by_company', data)
    };
  }

  // Qualifications
  if (norm.includes('مؤهل') || norm.includes('شهاده') || norm.includes('عالي') || norm.includes('متوسط') || norm.includes('جامع') || norm.includes('دبلوم') || norm.includes('اميه')) {
    const data = await executeQuery('stats_by_qualification');
    return {
      intent: 'stats_by_qualification',
      mode: 'deterministic',
      statusLabel: 'حصر وتوزيع المؤهلات الدراسية',
      ...formatQueryResult('stats_by_qualification', data)
    };
  }

  // Batches
  if (norm.includes('دفع') || norm.includes('يناير') || norm.includes('ابريل') || norm.includes('يوليو') || norm.includes('اكتوبر') || norm.includes('دفعه')) {
    const data = await executeQuery('stats_by_batch');
    return {
      intent: 'stats_by_batch',
      mode: 'deterministic',
      statusLabel: 'بيان الدفوع التجنيدية والقوة المقيدة',
      ...formatQueryResult('stats_by_batch', data)
    };
  }

  // Marital status
  if (norm.includes('متزوج') || norm.includes('اعزب') || norm.includes('زوجه') || norm.includes('اجتماعي')) {
    const data = await executeQuery('stats_by_marital_status');
    return {
      intent: 'stats_by_marital_status',
      mode: 'deterministic',
      statusLabel: 'حصر الحالة الاجتماعية والمتزوجين',
      ...formatQueryResult('stats_by_marital_status', data)
    };
  }

  // Religion
  if (norm.includes('ديانه') || norm.includes('مسلم') || norm.includes('مسيحي')) {
    const data = await executeQuery('stats_by_religion');
    return {
      intent: 'stats_by_religion',
      mode: 'deterministic',
      statusLabel: 'توزيع الديانة للمجندين',
      ...formatQueryResult('stats_by_religion', data)
    };
  }

  // Travel abroad
  if (norm.includes('سفر') || norm.includes('خارج') || norm.includes('جواز')) {
    const data = await executeQuery('list_travel_cases');
    return {
      intent: 'list_travel_cases',
      mode: 'deterministic',
      statusLabel: 'حصر المجندين المسجل لهم سفر للخارج',
      ...formatQueryResult('list_travel_cases', data)
    };
  }

  // Overview / General KPIs
  if (norm.includes('اجمالي') || norm.includes('احصائيه') || norm.includes('تقرير عام') || norm.includes('مؤشرات') || norm.includes('مركز')) {
    const data = await executeQuery('overview_kpi_summary');
    return {
      intent: 'overview_kpi_summary',
      mode: 'deterministic',
      statusLabel: 'استخراج المؤشرات العامة للمنظومة',
      ...formatQueryResult('overview_kpi_summary', data)
    };
  }

  // 3. Optional Local LLM Planning (if sidecar running)
  if (modelManager.state === 'ready') {
    try {
      const planned = await modelAdapter.planIntent(rawMsg);
      const validated = validateIntent(planned);
      if (validated) {
        const data = await executeQuery(validated.intent, validated.params);
        return {
          intent: validated.intent,
          mode: 'assisted',
          statusLabel: validated.userFacingExplanation,
          ...formatQueryResult(validated.intent, data)
        };
      }
    } catch (llmErr) {
      console.warn('AI Planning fallback:', llmErr.message);
    }
  }

  // 4. Default: Full-Text FTS5 Search across Recruits
  const searchResult = await executeQuery('search_recruits', { query: rawMsg });
  return {
    intent: 'search_recruits',
    mode: 'deterministic',
    statusLabel: 'البحث الفوري في سجلات المجندين ومطابقة الأسماء',
    ...formatQueryResult('search_recruits', searchResult)
  };
}
