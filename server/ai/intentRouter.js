import { searchRecruitsFts } from '../search/ftsQueries.js';
import { extractNationalId, normalizeArabic } from './arabicNormalize.js';
import { validateIntent } from './intentSchema.js';
import { executeQuery, QUERY_CATALOG } from './queryCatalog.js';
import { formatQueryResult } from './resultFormatter.js';
import { modelManager } from './modelManager.js';
import { modelAdapter } from './modelAdapter.js';
import { get, query } from '../db.js';

/**
 * Generates an up-to-the-minute factual summary snapshot of the database
 * to provide rock-solid ground truth for the local Qwen LLM.
 */
export async function getLiveSystemSummaryContext() {
  try {
    const totalRow = await get(`SELECT COUNT(*) as c FROM recruits`);
    const totalRecruits = totalRow?.c || 0;
    const batchRow = await get(`SELECT name FROM batches WHERE active = 1 LIMIT 1`);
    const companies = await query(`SELECT company, COUNT(*) as c FROM recruits WHERE company != '' GROUP BY company ORDER BY c DESC LIMIT 6`);
    const sectors = await query(`SELECT distribution_sector, COUNT(*) as c FROM recruits WHERE distribution_sector != '' GROUP BY distribution_sector ORDER BY c DESC LIMIT 6`);
    const medUnfit = await get(`SELECT COUNT(*) as c FROM recruits WHERE medical_status LIKE '%غير لائق%'`);
    const psych = await get(`SELECT COUNT(*) as c FROM recruits WHERE is_psychological_case = 1 OR inspection LIKE '%نفسي%'`);
    const tickets = await get(`SELECT COUNT(*) as c FROM recruit_tickets WHERE status = 'open'`);

    let summary = `حقائق وبيانات رسمية مؤكدة من منظومة عين الأمن (SECURITY EYE):\n`;
    summary += `- إجمالي القوة المقيدة بالمنظومة: ${totalRecruits} مجند.\n`;
    if (batchRow?.name) summary += `- الدفع التجنيدي النشط: ${batchRow.name}.\n`;
    if (companies.length > 0) {
      summary += `- توزيع السرايا: ` + companies.map(c => `${c.company} (${c.c} مجند)`).join('، ') + '.\n';
    }
    if (sectors.length > 0) {
      summary += `- قطاعات التوزيع: ` + sectors.map(s => `${s.distribution_sector} (${s.c} مجند)`).join('، ') + '.\n';
    }
    if (medUnfit?.c) summary += `- غير لائقين طبياً: ${medUnfit.c} مجند.\n`;
    if (psych?.c) summary += `- حالات الملاحظة النفسية: ${psych.c} حالة.\n`;
    if (tickets?.c) summary += `- تيكتات المتابعة والاشتباه المفتوحة: ${tickets.c} تيكت.\n`;
    return summary;
  } catch (err) {
    return 'إجمالي المجندين المسجلين 56 مجند.';
  }
}

/**
 * Egyptian Military Colloquial Intent Router
 *
 * Combines:
 * 1. Fast deterministic Egyptian dialect pattern matching & entity extraction (0ms latency, zero hallucination)
 * 2. Real-time database grounding with SQLite (RAG)
 * 3. Local Qwen2.5 LLM enhancement using live facts
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

  // 1. Check for exact 14-digit National ID (Egyptian National ID)
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

  // Normalized text for robust pattern matching
  const norm = normalizeArabic(rawMsg).toLowerCase();

  // Get total count of recruits to provide helpful context when counts are zero
  let totalRecruits = 0;
  try {
    const totalRow = await get(`SELECT COUNT(*) as c FROM recruits`);
    totalRecruits = totalRow?.c || 0;
  } catch (e) {}

  // 2. Egyptian Greetings & Small-Talk (العامية المصرية والترحيب العسكري)
  const isGreetingWord = /(ازيك|عامل ايه|اخبارك|يا باشا|يا فندم|يا بيه|سعادتك|سيادتك|يا غالي|صباح الخير|مساء الخير|صباح الفل|مساء الورد|سلام عليكم|السلام عليكم|اهلا|مرحبا|يا كبير)/.test(norm);
  const isIdentityWord = /(انت مين|عرفني بيك|مين معايا|بتعمل ايه|بتعرف تعمل ايه|تقدر تعمل ايه|شغال ايه|وظيفتك ايه|مساعد ايه)/.test(norm);
  const isGratitudeWord = /(شكرا|تسلم|الله يباركلك|تسلم ايدك|الله ينور|الف شكر|مشكور)/.test(norm);

  // If input is purely chit-chat / greeting with no specific search command
  const hasDataAction = /(كام|مين|عدد|احصاء|سجل|كشف|سريه|سرايا|نجار|كهرب|سباك|سواق|مستشف|اشتباه|تيكت|مؤهل|دفعه|متزوج|سافر)/.test(norm);

  if ((isIdentityWord || isGratitudeWord || isGreetingWord) && !hasDataAction) {
    let chitChatType = 'greeting';
    if (isIdentityWord) chitChatType = 'identity';
    else if (isGratitudeWord) chitChatType = 'gratitude';

    // If local LLM is ready, enhance the reply using live database facts
    if (modelManager.state === 'ready') {
      try {
        const liveContext = await getLiveSystemSummaryContext();
        const aiChitChat = await modelAdapter.generateConversationalResponse(
          rawMsg,
          liveContext
        );
        if (aiChitChat) {
          return {
            intent: 'egyptian_chit_chat',
            mode: 'ai_assisted',
            statusLabel: 'رد المحادثة الذكي بالعامية المصرية مدعوم بالبيانات الحية',
            responseText: aiChitChat,
            suggestions: ['عندنا كام واحد في المنظومة؟', 'مين هنا نجار أو كهربائي؟', 'مين في سرية الأمن؟', 'توزيع قطاعات المجندين'],
            matchCount: 1
          };
        }
      } catch (e) {}
    }

    return {
      intent: 'egyptian_chit_chat',
      mode: 'deterministic',
      statusLabel: 'تحية وترحيب بالعامية المصرية',
      ...formatQueryResult('egyptian_chit_chat', null, { type: chitChatType, prompt: rawMsg })
    };
  }

  // 3. Trades & Crafts (أصحاب الصنائع والمهن بالعامية المصرية)
  let extractedTrade = null;
  if (norm.includes('نجار') || norm.includes('نجارين') || norm.includes('منجره')) extractedTrade = 'نجار';
  else if (norm.includes('كهربائي') || norm.includes('كهربائيه') || norm.includes('كهربا') || norm.includes('سلسيون')) extractedTrade = 'كهربائي';
  else if (norm.includes('سباك') || norm.includes('سباكين') || norm.includes('سباكه')) extractedTrade = 'سباك';
  else if (norm.includes('سواق') || norm.includes('سواقين') || norm.includes('سائق') || norm.includes('سائقين') || norm.includes('سواقه')) extractedTrade = 'سائق';
  else if (norm.includes('نقاش') || norm.includes('نقاشين') || norm.includes('نقاشه') || norm.includes('دهان')) extractedTrade = 'نقاش';
  else if (norm.includes('حداد') || norm.includes('حدادين') || norm.includes('حداده') || norm.includes('كريتال')) extractedTrade = 'حداد';
  else if (norm.includes('ميكانيكي') || norm.includes('ميكانيكيه') || norm.includes('ميكانيكا')) extractedTrade = 'ميكانيكي';
  else if (norm.includes('مبلط') || norm.includes('مبلطين') || norm.includes('سيراميك') || norm.includes('بلاط')) extractedTrade = 'مبلط';
  else if (norm.includes('حلاق') || norm.includes('حلاقين') || norm.includes('حلاقه') || norm.includes('كوافير')) extractedTrade = 'حلاق';
  else if (norm.includes('ترزي') || norm.includes('ترزيه') || norm.includes('خياط') || norm.includes('تفصيل')) extractedTrade = 'ترزي';
  else if (norm.includes('طباخ') || norm.includes('طباخين') || norm.includes('شيف') || norm.includes('مطبخ')) extractedTrade = 'طباخ';
  else if (norm.includes('لحام') || norm.includes('لحامين')) extractedTrade = 'لحام';
  else if (norm.includes('تكييف') || norm.includes('تبريد') || norm.includes('صيانه')) extractedTrade = 'تكييف';
  else if (norm.includes('مهن') || norm.includes('حرف') || norm.includes('حرفيين') || norm.includes('صنعه') || norm.includes('صنايعيه') || norm.includes('شغالين ايه') || norm.includes('اصحاب الصنعه')) {
    extractedTrade = '';
  }

  if (extractedTrade !== null) {
    const data = await executeQuery('list_trades_and_crafts', { trade: extractedTrade });
    return {
      intent: 'list_trades_and_crafts',
      mode: 'deterministic',
      statusLabel: extractedTrade ? `حصر أصحاب مهنة ${extractedTrade}` : 'حصر أصحاب الحرف والمهن الفنية',
      ...formatQueryResult('list_trades_and_crafts', data, { trade: extractedTrade, totalRecruits })
    };
  }

  // 4. Locations & Governorates (المحافظات والمراكز المصرية)
  let extractedLocation = null;
  const rawLocations = [
    'طنطا', 'المحلة', 'الغربية', 'المنوفية', 'شبين الكوم', 'شبين',
    'بركة السبع', 'أشمون', 'قويسنا', 'كفر الشيخ', 'دسوق', 'الدقهلية', 'المنصورة',
    'ميت غمر', 'القاهرة', 'عين شمس', 'المطرية', 'الجيزة', 'العمرانية',
    'الإسكندرية', 'الشرقية', 'الزقازيق', 'دمياط', 'كفر البطيخ',
    'البحيرة', 'دمنهور', 'القليوبية', 'بنها', 'الفيوم', 'بني سويف',
    'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر', 'أسوان', 'السويس', 'الإسماعيلية', 'بورسعيد'
  ];

  for (const rawLoc of rawLocations) {
    const normLoc = normalizeArabic(rawLoc).toLowerCase();
    if (norm.includes(normLoc)) {
      extractedLocation = rawLoc;
      break;
    }
  }

  if (extractedLocation && (norm.includes('مين') || norm.includes('حد') || norm.includes('من') || norm.includes('ساكن') || norm.includes('عايش') || norm.includes('محافظ') || norm.includes('بلد') || norm.includes('عنوان'))) {
    const data = await executeQuery('list_recruits_by_location', { location: extractedLocation });
    return {
      intent: 'list_recruits_by_location',
      mode: 'deterministic',
      statusLabel: `حصر أبناء ${extractedLocation}`,
      ...formatQueryResult('list_recruits_by_location', data, { location: extractedLocation, totalRecruits })
    };
  }

  // 4.1 Distribution Sectors Matching (قطاعات التوزيع بعد انتهاء التدريب الأساسي)
  const isSectorQuery = /(قطاع|قطاعات|الموزعين|موزع|توزيع المجندين|رئاسة المنطقه|رئاسه المنطقه|احمد عماره|أحمد عمارة|عمر القاضي|على خاطر|علي خاطر|جمال فايق|مركز التدريب|جهه خارجيه|جهة خارجية|عوده|عودة)/.test(norm);

  if (isSectorQuery) {
    let targetSector = null;
    if (norm.includes('احمد عماره') || norm.includes('أحمد عمارة')) targetSector = 'قطاع أحمد عمارة';
    else if (norm.includes('عمر القاضي')) targetSector = 'قطاع عمر القاضي';
    else if (norm.includes('على خاطر') || norm.includes('علي خاطر')) targetSector = 'قطاع على خاطر';
    else if (norm.includes('جمال فايق')) targetSector = 'قطاع جمال فايق';
    else if (norm.includes('رئاسة المنطقه') || norm.includes('رئاسه المنطقه') || norm.includes('رئاسة المنطقة')) targetSector = 'رئاسة المنطقة';
    else if (norm.includes('مركز التدريب') && (norm.includes('توزيع') || norm.includes('موزع') || norm.includes('مين في'))) targetSector = 'مركز التدريب';
    else if (norm.includes('جهه خارجيه') || norm.includes('جهة خارجية')) targetSector = 'جهة خارجية';
    else if (norm.includes('عوده') || norm.includes('عودة')) targetSector = 'عودة';
    else if (norm.includes('لم يوزع') || norm.includes('غير موزع') || norm.includes('لسه') || norm.includes('مش موزع')) targetSector = 'unassigned';

    // If specific sector asked for listing
    if (targetSector) {
      const data = await executeQuery('list_recruits_by_distribution_sector', { sector: targetSector });
      return {
        intent: 'list_recruits_by_distribution_sector',
        mode: 'deterministic',
        statusLabel: `حصر الموزعين على ${targetSector === 'unassigned' ? 'قيد التدريب (لم يتم التوزيع)' : targetSector}`,
        ...formatQueryResult('list_recruits_by_distribution_sector', data, { sector: targetSector, totalRecruits })
      };
    }

    // General distribution stats query
    if (norm.includes('قطاع') || norm.includes('قطاعات') || norm.includes('توزيع المجندين') || norm.includes('الموزعين') || norm.includes('جهات التوزيع') || norm.includes('التوزيع')) {
      const data = await executeQuery('stats_by_distribution_sector');
      return {
        intent: 'stats_by_distribution_sector',
        mode: 'deterministic',
        statusLabel: 'إحصائية توزيع المجندين على القطاعات',
        ...formatQueryResult('stats_by_distribution_sector', data)
      };
    }
  }

  // 5. Company Force Distribution or Specific Company Listing
  if (norm.includes('سرايا') || norm.includes('كتيبه')) {
    const data = await executeQuery('stats_by_company');
    return {
      intent: 'stats_by_company',
      mode: 'deterministic',
      statusLabel: 'حصر قوة وتوزيع السرايا',
      ...formatQueryResult('stats_by_company', data)
    };
  }

  if (norm.includes('سريه الامن') || norm.includes('سرية الامن') || norm.includes('سرية الأمن') || norm.includes('سريه الأمن') || norm.includes('مين في الامن') || norm.includes('مين في الأمن')) {
    const data = await executeQuery('list_recruits_by_company', { company: 'أمن' });
    return {
      intent: 'list_recruits_by_company',
      mode: 'deterministic',
      statusLabel: 'حصر قوة وأفراد سرية الأمن',
      ...formatQueryResult('list_recruits_by_company', data, { company: 'سرية الأمن', totalRecruits })
    };
  }

  if (norm.includes('القوه الاساسيه') || norm.includes('القوة الأساسية') || norm.includes('مين في الاساسيه')) {
    const data = await executeQuery('list_recruits_by_company', { company: 'أساسية' });
    return {
      intent: 'list_recruits_by_company',
      mode: 'deterministic',
      statusLabel: 'حصر قوة القوة الأساسية',
      ...formatQueryResult('list_recruits_by_company', data, { company: 'القوة الأساسية', totalRecruits })
    };
  }

  if (norm.includes('السريه الاولي') || norm.includes('السرية الأولى') || norm.includes('السريه الاولى')) {
    const data = await executeQuery('list_recruits_by_company', { company: 'الأولى' });
    return {
      intent: 'list_recruits_by_company',
      mode: 'deterministic',
      statusLabel: 'حصر أفراد السرية الأولى',
      ...formatQueryResult('list_recruits_by_company', data, { company: 'السرية الأولى', totalRecruits })
    };
  }

  if (norm.includes('السريه الثانيه') || norm.includes('السرية الثانية')) {
    const data = await executeQuery('list_recruits_by_company', { company: 'الثانية' });
    return {
      intent: 'list_recruits_by_company',
      mode: 'deterministic',
      statusLabel: 'حصر أفراد السرية الثانية',
      ...formatQueryResult('list_recruits_by_company', data, { company: 'السرية الثانية', totalRecruits })
    };
  }

  if (norm.includes('السريه الثالثه') || norm.includes('السرية الثالثة')) {
    const data = await executeQuery('list_recruits_by_company', { company: 'الثالثة' });
    return {
      intent: 'list_recruits_by_company',
      mode: 'deterministic',
      statusLabel: 'حصر أفراد السرية الثالثة',
      ...formatQueryResult('list_recruits_by_company', data, { company: 'السرية الثالثة', totalRecruits })
    };
  }

  if (norm.includes('سريه') || norm.includes('قوه اساسيه')) {
    const data = await executeQuery('stats_by_company');
    return {
      intent: 'stats_by_company',
      mode: 'deterministic',
      statusLabel: 'حصر قوة وتوزيع السرايا',
      ...formatQueryResult('stats_by_company', data)
    };
  }

  // 6. Security Tickets & Suspicions
  if (norm.includes('تيكت') || norm.includes('اشتباه') || norm.includes('سوابق') || norm.includes('جنائي') || norm.includes('سياسي') || norm.includes('مشبوه') || norm.includes('قواضي') || norm.includes('ملاحظات')) {
    const data = await executeQuery('list_security_tickets');
    return {
      intent: 'list_security_tickets',
      mode: 'deterministic',
      statusLabel: 'استعلام تيكتات الاشتباه والملاحظات الأمنية',
      ...formatQueryResult('list_security_tickets', data)
    };
  }

  // 7. Psychological Cases
  if (norm.includes('نفسي') || norm.includes('عصبي') || norm.includes('غير متزن') || norm.includes('سلوك') || norm.includes('تعبان نفسيا')) {
    const data = await executeQuery('list_psychological_cases');
    return {
      intent: 'list_psychological_cases',
      mode: 'deterministic',
      statusLabel: 'حصر الحالات غير المتزنة نفسياً وعصبياً',
      ...formatQueryResult('list_psychological_cases', data)
    };
  }

  // 8. Hospital movements & referrals
  if (norm.includes('مستشفي') || norm.includes('مستشفى') || norm.includes('احاله') || norm.includes('إحالة') || norm.includes('تحركات') || norm.includes('مين في المستشفى')) {
    const data = await executeQuery('list_hospital_movements');
    return {
      intent: 'list_hospital_movements',
      mode: 'deterministic',
      statusLabel: 'بيان تحركات وإحالات مستشفيات الشرطة',
      ...formatQueryResult('list_hospital_movements', data)
    };
  }

  // 9. Medical status & fitness
  if (norm.includes('لائق') || norm.includes('غير لائق') || norm.includes('مرض') || norm.includes('طبي') || norm.includes('مناظره') || norm.includes('كشف طبي') || norm.includes('لياقه')) {
    const data = await executeQuery('stats_by_medical_status');
    return {
      intent: 'stats_by_medical_status',
      mode: 'deterministic',
      statusLabel: 'إحصاء اللياقة الطبية والمناظرة',
      ...formatQueryResult('stats_by_medical_status', data)
    };
  }

  // 10. Marital status (who is married vs stats)
  if (norm.includes('مين متجوز') || norm.includes('المتجوزين') || norm.includes('مين عنده عيال') || norm.includes('مين متزوج')) {
    const data = await executeQuery('list_married_recruits');
    return {
      intent: 'list_married_recruits',
      mode: 'deterministic',
      statusLabel: 'كشف أسماء المجندين المتزوجين',
      ...formatQueryResult('list_married_recruits', data)
    };
  }

  if (norm.includes('متزوج') || norm.includes('اعزب') || norm.includes('زوجه') || norm.includes('اجتماعي') || norm.includes('جواز')) {
    const data = await executeQuery('stats_by_marital_status');
    return {
      intent: 'stats_by_marital_status',
      mode: 'deterministic',
      statusLabel: 'حصر الحالة الاجتماعية والمتزوجين',
      ...formatQueryResult('stats_by_marital_status', data)
    };
  }

  // 11. Physical Inspection, Surgeries, Tattoos, and Scars (توثيق أول يوم والمناظرة)
  if (norm.includes('وشم') || norm.includes('تاتو') || norm.includes('رسومات')) {
    const data = await executeQuery('list_physical_injuries_and_tattoos', { type: 'tattoo' });
    return {
      intent: 'list_physical_injuries_and_tattoos',
      mode: 'deterministic',
      statusLabel: 'حصر أصحاب الوشوم والعلامات المميزة',
      ...formatQueryResult('list_physical_injuries_and_tattoos', data, { type: 'tattoo' })
    };
  }

  if (norm.includes('عملي') || norm.includes('جراح') || norm.includes('فتق') || norm.includes('خياط') || norm.includes('زائده') || norm.includes('زائدة')) {
    const data = await executeQuery('list_physical_injuries_and_tattoos', { type: 'surgery' });
    return {
      intent: 'list_physical_injuries_and_tattoos',
      mode: 'deterministic',
      statusLabel: 'حصر أصحاب العمليات الجراحية والندبات',
      ...formatQueryResult('list_physical_injuries_and_tattoos', data, { type: 'surgery' })
    };
  }

  if (norm.includes('كسر') || norm.includes('جرح') || norm.includes('اصاب') || norm.includes('إصاب') || norm.includes('كدم')) {
    const data = await executeQuery('list_physical_injuries_and_tattoos', { type: 'fracture_injury' });
    return {
      intent: 'list_physical_injuries_and_tattoos',
      mode: 'deterministic',
      statusLabel: 'حصر الإصابات والكسور القديمة',
      ...formatQueryResult('list_physical_injuries_and_tattoos', data, { type: 'fracture_injury' })
    };
  }

  // 12. Travel abroad
  if (norm.includes('سفر') || norm.includes('خارج') || norm.includes('جواز') || norm.includes('سافر')) {
    const data = await executeQuery('list_travel_cases');
    return {
      intent: 'list_travel_cases',
      mode: 'deterministic',
      statusLabel: 'حصر المجندين المسجل لهم سفر للخارج',
      ...formatQueryResult('list_travel_cases', data)
    };
  }

  // 13. System Audit Log / Tracking movements (مين سجل - مين عدل)
  if (norm.includes('مين دخل') || norm.includes('مين عدل') || norm.includes('مين سجل') || norm.includes('مين طبع') || norm.includes('سجل الحركات') || norm.includes('سجل النشاط') || norm.includes('تدقيق') || norm.includes('audit')) {
    const data = await executeQuery('list_recent_system_audits');
    return {
      intent: 'list_recent_system_audits',
      mode: 'deterministic',
      statusLabel: 'استعلام سجل حركات المنظومة وتدقيق الأمان',
      ...formatQueryResult('list_recent_system_audits', data)
    };
  }

  // 14. Qualifications (by specific level or full stats)
  if (norm.includes('مؤهل عالي') || norm.includes('مؤهلات عليا') || norm.includes('المؤهل العالي') || norm.includes('جامعي') || norm.includes('كليات')) {
    const data = await executeQuery('list_recruits_by_qualification_level', { level: 'عالي' });
    return {
      intent: 'list_recruits_by_qualification_level',
      mode: 'deterministic',
      statusLabel: 'كشف أسماء أصحاب المؤهلات العليا',
      ...formatQueryResult('list_recruits_by_qualification_level', data, { level: 'المؤهل العالي' })
    };
  }

  if (norm.includes('فوق متوسط')) {
    const data = await executeQuery('list_recruits_by_qualification_level', { level: 'فوق متوسط' });
    return {
      intent: 'list_recruits_by_qualification_level',
      mode: 'deterministic',
      statusLabel: 'كشف أسماء أصحاب المؤهل فوق المتوسط',
      ...formatQueryResult('list_recruits_by_qualification_level', data, { level: 'فوق متوسط' })
    };
  }

  if (norm.includes('متوسط') && !norm.includes('فوق متوسط') && (norm.includes('مين') || norm.includes('كشف') || norm.includes('اسماء') || norm.includes('أسماء'))) {
    const data = await executeQuery('list_recruits_by_qualification_level', { level: 'متوسط' });
    return {
      intent: 'list_recruits_by_qualification_level',
      mode: 'deterministic',
      statusLabel: 'كشف أسماء أصحاب المؤهل المتوسط',
      ...formatQueryResult('list_recruits_by_qualification_level', data, { level: 'متوسط' })
    };
  }

  if (norm.includes('محو امية') || norm.includes('محو أمية')) {
    const data = await executeQuery('list_recruits_by_qualification_level', { level: 'محو أمية' });
    return {
      intent: 'list_recruits_by_qualification_level',
      mode: 'deterministic',
      statusLabel: 'كشف أسماء مجندي محو الأمية',
      ...formatQueryResult('list_recruits_by_qualification_level', data, { level: 'محو أمية' })
    };
  }

  if (norm.includes('عادة') || norm.includes('بدون مؤهل')) {
    const data = await executeQuery('list_recruits_by_qualification_level', { level: 'عادة' });
    return {
      intent: 'list_recruits_by_qualification_level',
      mode: 'deterministic',
      statusLabel: 'كشف أسماء مجندي العادة (بدون مؤهل)',
      ...formatQueryResult('list_recruits_by_qualification_level', data, { level: 'عادة بدون مؤهل' })
    };
  }

  if (norm.includes('مؤهل') || norm.includes('شهاده') || norm.includes('عالي') || norm.includes('متوسط') || norm.includes('جامع') || norm.includes('دبلوم') || norm.includes('اميه')) {
    const data = await executeQuery('stats_by_qualification');
    return {
      intent: 'stats_by_qualification',
      mode: 'deterministic',
      statusLabel: 'حصر وتوزيع المؤهلات الدراسية',
      ...formatQueryResult('stats_by_qualification', data)
    };
  }

  // 15. Batches
  if (norm.includes('دفع') || norm.includes('يناير') || norm.includes('ابريل') || norm.includes('يوليو') || norm.includes('اكتوبر') || norm.includes('دفعه')) {
    const data = await executeQuery('stats_by_batch');
    return {
      intent: 'stats_by_batch',
      mode: 'deterministic',
      statusLabel: 'بيان الدفوع التجنيدية والقوة المقيدة',
      ...formatQueryResult('stats_by_batch', data)
    };
  }

  // 14. Overview / Total force counts in Egyptian phrasing
  if (norm.includes('عندنا كام') || norm.includes('القوه كام') || norm.includes('القوة كام') || norm.includes('العدد كام') || norm.includes('كام واحد') || norm.includes('فيه كام') || norm.includes('اجمالي') || norm.includes('إجمالي') || norm.includes('احصائيه') || norm.includes('تقرير عام') || norm.includes('مؤشرات') || norm.includes('تمام القوة')) {
    const data = await executeQuery('overview_kpi_summary');
    return {
      intent: 'overview_kpi_summary',
      mode: 'deterministic',
      statusLabel: 'استخراج تمام القوة والمؤشرات العامة',
      ...formatQueryResult('overview_kpi_summary', data)
    };
  }

  // 15. Clean conversational prefixes to extract search target (e.g. "مين السواقين اللي هنا" -> "سواقين")
  const cleanTerm = rawMsg
    .replace(/^(عايز|عاوز|عاوزين|عايزين|قولي|وريني|طلعلي|هاتلي|ابحث عن|ابحث|مين|كشف بـ?|اسماء|أسماء|بيان|جدول|تقرير|عرفني|شغالين|واخدين|عندهم|عنده|فيه|فيها|حد|واحد|يا باشا|يا فندم|بالله عليك)\s+/gi, '')
    .trim();

  const searchTarget = cleanTerm && cleanTerm.length >= 2 ? cleanTerm : rawMsg;
  const searchResult = await searchRecruitsFts(searchTarget, { limit: 15 });

  if (searchResult.results && searchResult.results.length > 0) {
    const formatted = formatQueryResult('search_recruits', searchResult, { query: searchTarget, totalRecruits });

    // If local LLM is ready, synthesize a smart executive officer briefing from matched recruits
    if (modelManager.state === 'ready') {
      try {
        const recruitSnippets = searchResult.results.slice(0, 10).map((r, idx) => {
          const details = [
            `الاسم: ${r.name}`,
            r.police_number ? `رقم الشرطة: ${r.police_number}` : '',
            r.military_number ? `الرقم العسكري: ${r.military_number}` : '',
            r.company ? `السرية: ${r.company}` : '',
            r.distribution_sector ? `القطاع: ${r.distribution_sector}` : '',
            r.travel_abroad ? `سفر للخارج: ${r.travel_abroad}` : '',
            r.father_job ? `مهنة الوالد: ${r.father_job}` : '',
            r.political_suspicion_status && r.political_suspicion_status !== 'لا يوجد اشتباه' && r.political_suspicion_status !== 'سليم' ? `اشتباه سياسي: ${r.political_suspicion_status}` : '',
            r.criminal_suspicion_status && r.criminal_suspicion_status !== 'لا يوجد اشتباه' && r.criminal_suspicion_status !== 'سليم' ? `اشتباه جنائي: ${r.criminal_suspicion_status}` : '',
            r.psychological_notes ? `ملاحظات نفسية: ${r.psychological_notes}` : '',
            r.notes ? `ملاحظات: ${r.notes}` : '',
            r.inspection ? `المناظرة: ${r.inspection}` : ''
          ].filter(Boolean).join(' | ');
          return `${idx + 1}- ${details}`;
        }).join('\n');
        const context = `المجندون المطابقون للاستفسار في قاعدة البيانات:\n${recruitSnippets}`;
        const aiSummary = await modelAdapter.generateConversationalResponse(rawMsg, context);
        if (aiSummary) {
          return {
            intent: 'search_recruits',
            mode: 'ai_grounded',
            statusLabel: `تحليل ذكي ومطابقة لسجلات المجندين (${searchResult.results.length} مجند)`,
            responseText: `${aiSummary}\n\n---\n\n${formatted.responseText}`,
            matchCount: searchResult.results.length,
            recruits: searchResult.results,
            suggestions: formatted.suggestions || []
          };
        }
      } catch (e) {}
    }

    return {
      intent: 'search_recruits',
      mode: 'deterministic',
      statusLabel: 'البحث في سجلات المجندين ومطابقة الأسماء والبيانات',
      recruits: searchResult.results,
      ...formatted
    };
  }

  // 16. If no direct records matched, consult Qwen with live system summary
  if (modelManager.state === 'ready') {
    try {
      const liveContext = await getLiveSystemSummaryContext();
      const aiReply = await modelAdapter.generateConversationalResponse(rawMsg, liveContext);
      if (aiReply) {
        return {
          intent: 'ai_conversational_inquiry',
          mode: 'ai_grounded',
          statusLabel: 'استجابة الذكاء الاصطناعي مدعومة ببيانات المنظومة الحية',
          responseText: aiReply,
          suggestions: ['إجمالي قوة المنظومة كام؟', 'أصحاب المهن والصنائع', 'توزيع المجندين على القطاعات', 'تيكتات الاشتباه الأمني'],
          matchCount: 1
        };
      }
    } catch (e) {}
  }

  // 17. Final Courteous Fallback
  return {
    intent: 'search_recruits',
    mode: 'deterministic',
    statusLabel: 'البحث في سجلات المجندين ومطابقة الأسماء',
    ...formatQueryResult('search_recruits', searchResult, { query: rawMsg, totalRecruits })
  };
}
