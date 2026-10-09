import { get, run, query } from '../db.js';

/**
 * Realistic Egyptian Military Recruits Sample Dataset
 * Designed for testing, demonstration, and rich conversational retrieval.
 */

export const SAMPLE_RECRUITS = [
  {
    batch_index: 4, // Active batch (October 2026)
    attendance_date: '2026-10-01',
    name: 'أحمد محمد إبراهيم حسن',
    religion: 'مسلم',
    qualification: 'متوسط دبلوم صنايع',
    birth_date: '1999-05-16',
    wife: '',
    national_id: '29905161609991',
    address: 'الغربية - طنطا - شارع النحاس',
    current_job: 'نجار باب وشباك',
    other_jobs: 'أعمال نجارة مسلحة خفيفة',
    travel_abroad: 'لا',
    literacy: 'يجيد القراءة والكتابة',
    inspection: 'سليم المظهر وخالٍ من الملاحظات',
    medical_status: 'لائق طبياً درجة أولى',
    company: 'سرية الأمن',
    police_number: '1042',
    recruit_code: 'SEC-2026-001',
    is_psychological_case: 0
  },
  {
    batch_index: 4,
    attendance_date: '2026-10-01',
    name: 'محمود علي حسن الشناوي',
    religion: 'مسلم',
    qualification: 'متوسط دبلوم كهرباء',
    birth_date: '1998-10-12',
    wife: '',
    national_id: '29810121601234',
    address: 'المنوفية - شبين الكوم - الحي الشرقي',
    current_job: 'كهربائي سلسيون ومنازل',
    other_jobs: 'صيانة شبكات وتمديدات',
    travel_abroad: 'لا',
    literacy: 'يجيد القراءة والكتابة',
    inspection: 'سليم المظهر وهيئة منضبطة',
    medical_status: 'لائق طبياً',
    company: 'سرية الأمن',
    police_number: '1043',
    recruit_code: 'SEC-2026-002',
    is_psychological_case: 0
  },
  {
    batch_index: 4,
    attendance_date: '2026-10-02',
    name: 'إبراهيم صابر عبد الحميد مرسي',
    religion: 'مسلم',
    qualification: 'عادة بدون مؤهل',
    birth_date: '1997-03-15',
    wife: '',
    national_id: '29703151804567',
    address: 'الدقهلية - المنصورة - جديلة',
    current_job: 'سباك صحي وتركيبات',
    other_jobs: 'تسليك شبكات مياه وصرف',
    travel_abroad: 'لا',
    literacy: 'يقرأ ويكتب بطلاقة',
    inspection: 'سليم وخالٍ من الوشم',
    medical_status: 'لائق طبياً',
    company: 'السرية الأولى ( ١ )',
    police_number: '1044',
    recruit_code: 'SEC-2026-003',
    is_psychological_case: 0
  },
  {
    batch_index: 4,
    attendance_date: '2026-10-02',
    name: 'خالد عبد الرحمن يوسف عثمان',
    religion: 'مسلم',
    qualification: 'فوق متوسط معهد فني صناعي',
    birth_date: '1999-12-01',
    wife: '',
    national_id: '29912010107890',
    address: 'القاهرة - عين شمس الغربية',
    current_job: 'سائق رخصة مهنية ثانية',
    other_jobs: 'ميكانيكا خفيفة',
    travel_abroad: 'لا',
    literacy: 'يجيد القراءة والكتابة',
    inspection: 'سليم المظهر ولائق بدنياً',
    medical_status: 'لائق طبياً',
    company: 'القوة الأساسية',
    police_number: '1045',
    recruit_code: 'SEC-2026-004',
    is_psychological_case: 0
  },
  {
    batch_index: 4,
    attendance_date: '2026-10-02',
    name: 'مينا أشرف فؤاد جرجس',
    religion: 'مسيحي',
    qualification: 'متوسط دبلوم ميكانيكا',
    birth_date: '1998-07-20',
    wife: '',
    national_id: '29807201602345',
    address: 'الغربية - المحلة الكبرى - شارع البحر',
    current_job: 'حداد كريتال وتصنيع أبواب',
    other_jobs: 'أعمال لحام',
    travel_abroad: 'لا',
    literacy: 'يجيد القراءة والكتابة',
    inspection: 'سليم المظهر وخالٍ من العلامات المميزة',
    medical_status: 'لائق طبياً',
    company: 'السرية الثانية ( ٢ )',
    police_number: '1046',
    recruit_code: 'SEC-2026-005',
    is_psychological_case: 0
  },
  {
    batch_index: 4,
    attendance_date: '2026-10-03',
    name: 'مصطفى كمال الدين أنور عبد العظيم',
    religion: 'مسلم',
    qualification: 'متوسط دبلوم تجارة',
    birth_date: '1999-01-01',
    wife: '',
    national_id: '29901011603456',
    address: 'كفر الشيخ - دسوق - شارع الجيش',
    current_job: 'نقاش ودهانات حديثة',
    other_jobs: 'ديكورات وجبس معلق',
    travel_abroad: 'لا',
    literacy: 'يجيد القراءة والكتابة',
    inspection: 'سليم ومنضبط السلوك',
    medical_status: 'لائق طبياً',
    company: 'السرية الثالثة ( ٣ )',
    police_number: '1047',
    recruit_code: 'SEC-2026-006',
    is_psychological_case: 0
  },
  {
    batch_index: 4,
    attendance_date: '2026-10-03',
    name: 'طارق سمير عبد المنعم حسنين',
    religion: 'مسلم',
    qualification: 'محو أمية',
    birth_date: '1997-09-09',
    wife: '',
    national_id: '29709091204567',
    address: 'الجيزة - العمرانية الغربية',
    current_job: 'مبلط سيراميك ورخام',
    other_jobs: 'مساعد بناء',
    travel_abroad: 'لا',
    literacy: 'يجيد القراءة والكتابة بحكم الشهادة',
    inspection: 'سليم البنية وخالٍ من العمليات الجراحية',
    medical_status: 'لائق طبياً',
    company: 'السرية الأولى ( ١ )',
    police_number: '1048',
    recruit_code: 'SEC-2026-007',
    is_psychological_case: 0
  },
  {
    batch_index: 4,
    attendance_date: '2026-10-03',
    name: 'علاء صبحي السيد إمام',
    religion: 'مسلم',
    qualification: 'متوسط دبلوم سيارات',
    birth_date: '1998-04-04',
    wife: '',
    national_id: '29804041605678',
    address: 'المنوفية - بركة السبع',
    current_job: 'ميكانيكي سيارات ديزل وبنزين',
    other_jobs: 'كهرباء سيارات',
    travel_abroad: 'لا',
    literacy: 'يجيد القراءة والكتابة',
    inspection: 'سليم البنية والقدرة الحركية',
    medical_status: 'لائق طبياً',
    company: 'القوة الأساسية',
    police_number: '1049',
    recruit_code: 'SEC-2026-008',
    is_psychological_case: 0
  },
  {
    batch_index: 4,
    attendance_date: '2026-10-04',
    name: 'وليد سامي عبد الفتاح بدوي',
    religion: 'مسلم',
    qualification: 'متوسط دبلوم زراعة',
    birth_date: '1999-08-08',
    wife: '',
    national_id: '29908081606789',
    address: 'الغربية - زفتى - شارع الجمهورية',
    current_job: 'حلاق رجالي',
    other_jobs: 'كوافير رجالي وتصفيف',
    travel_abroad: 'لا',
    literacy: 'يجيد القراءة والكتابة',
    inspection: 'مظهر مهندم وسليم طبياً',
    medical_status: 'لائق طبياً',
    company: 'سرية الأمن',
    police_number: '1050',
    recruit_code: 'SEC-2026-009',
    is_psychological_case: 0
  },
  {
    batch_index: 4,
    attendance_date: '2026-10-04',
    name: 'هاني عادل محمود خليل',
    religion: 'مسلم',
    qualification: 'عادة بدون مؤهل',
    birth_date: '1997-11-11',
    wife: '',
    national_id: '29711111607890',
    address: 'الغربية - سمنود - شارع ترعة الساحل',
    current_job: 'ترزي ملابس وبدل',
    other_jobs: 'تفصيل وحياكة عسكرية',
    travel_abroad: 'لا',
    literacy: 'يقرأ ويكتب',
    inspection: 'سليم البدن',
    medical_status: 'لائق طبياً',
    company: 'السرية الثانية ( ٢ )',
    police_number: '1051',
    recruit_code: 'SEC-2026-010',
    is_psychological_case: 0
  },
  {
    batch_index: 4,
    attendance_date: '2026-10-04',
    name: 'سامح فوزي إسماعيل النجار',
    religion: 'مسلم',
    qualification: 'متوسط فندقي سياحة وفنادق',
    birth_date: '1998-06-06',
    wife: '',
    national_id: '29806060108901',
    address: 'القاهرة - المطرية - شارع التروللي',
    current_job: 'طباخ ومساعد شيف',
    other_jobs: 'تجهيز وجبات ومطابخ',
    travel_abroad: 'لا',
    literacy: 'يجيد القراءة والكتابة',
    inspection: 'سليم البنية وخالٍ من الأمراض الجلدية',
    medical_status: 'لائق طبياً',
    company: 'القوة الأساسية',
    police_number: '1052',
    recruit_code: 'SEC-2026-011',
    is_psychological_case: 0
  },
  {
    batch_index: 4,
    attendance_date: '2026-10-04',
    name: 'ياسر رمضان عبد الحليم شلبي',
    religion: 'مسلم',
    qualification: 'فوق متوسط معهد فني تبريد',
    birth_date: '1999-03-03',
    wife: '',
    national_id: '29903031609012',
    address: 'المنوفية - قويسنا - شارع عبد المحسن الصباحي',
    current_job: 'فني صيانة وتبريد وتكييف',
    other_jobs: 'صيانة أجهزة منزلية وغسالات',
    travel_abroad: 'لا',
    literacy: 'يجيد القراءة والكتابة',
    inspection: 'سليم المظهر ومنضبط',
    medical_status: 'لائق طبياً',
    company: 'سرية الأمن',
    police_number: '1053',
    recruit_code: 'SEC-2026-012',
    is_psychological_case: 0
  },
  {
    batch_index: 4,
    attendance_date: '2026-10-05',
    name: 'كريم عصام نبيل البحيري',
    religion: 'مسلم',
    qualification: 'عالي بكالوريوس هندسة مدنية',
    birth_date: '1998-02-02',
    wife: 'منى طارق عبد الحميد (ربة منزل)',
    national_id: '29802021801122',
    address: 'الدقهلية - ميت غمر - شارع الحرية',
    current_job: 'مهندس مدني استشاري',
    other_jobs: 'أعمال مساحة وإشراف هندسي',
    travel_abroad: 'لا',
    literacy: 'مؤهل جامعي ممتاز',
    inspection: 'هيئة ممتازة ومثقف',
    medical_status: 'لائق طبياً',
    company: 'سرية الأمن',
    police_number: '1054',
    recruit_code: 'SEC-2026-013',
    is_psychological_case: 0
  },
  {
    batch_index: 4,
    attendance_date: '2026-10-05',
    name: 'حسام عبد اللطيف محمد جاد',
    religion: 'مسلم',
    qualification: 'عالي بكالوريوس تجارة إدارة أعمال',
    birth_date: '1999-04-04',
    wife: 'هدى إبراهيم أحمد (معلمة)',
    national_id: '29904041602233',
    address: 'الغربية - طنطا - شارع سعيد',
    current_job: 'محاسب مالي وإداري',
    other_jobs: 'إجادة برامج الحاسب الآلي وإكسيل',
    travel_abroad: 'لا',
    literacy: 'مؤهل جامعي',
    inspection: 'مظهر لائق ومنضبط',
    medical_status: 'لائق طبياً',
    company: 'القوة الأساسية',
    police_number: '1055',
    recruit_code: 'SEC-2026-014',
    is_psychological_case: 0
  },
  {
    batch_index: 4,
    attendance_date: '2026-10-05',
    name: 'عمر شريف يحيى الفقي',
    religion: 'مسلم',
    qualification: 'عالي ليسانس تربية لغة عربية',
    birth_date: '1998-05-05',
    wife: '',
    national_id: '29805051603344',
    address: 'كفر الشيخ - كفر الشيخ - دوران 47',
    current_job: 'مدرس لغة عربية',
    other_jobs: 'خطاط وأعمال كتابية',
    travel_abroad: 'لا',
    literacy: 'مؤهل عالي',
    inspection: 'سليم المظهر وحسن السير والسلوك',
    medical_status: 'لائق طبياً',
    company: 'السرية الأولى ( ١ )',
    police_number: '1056',
    recruit_code: 'SEC-2026-015',
    is_psychological_case: 0
  },
  {
    batch_index: 4,
    attendance_date: '2026-10-05',
    name: 'رامي وجدي نسيم ميخائيل',
    religion: 'مسيحي',
    qualification: 'عالي بكالوريوس صيدلة',
    birth_date: '1999-06-06',
    wife: '',
    national_id: '29906061604455',
    address: 'الغربية - كفر الزيات - شارع المستشفى',
    current_job: 'صيدلي كيميائي',
    other_jobs: 'إسعافات أولية وإدارة مستودعات أدوية',
    travel_abroad: 'لا',
    literacy: 'مؤهل عالي ممتاز',
    inspection: 'سليم المظهر',
    medical_status: 'لائق طبياً',
    company: 'السرية الثانية ( ٢ )',
    police_number: '1057',
    recruit_code: 'SEC-2026-016',
    is_psychological_case: 0
  },
  {
    batch_index: 4,
    attendance_date: '2026-10-06',
    name: 'شادي عاطف عبد الحميد منصور',
    religion: 'مسلم',
    qualification: 'عادة بدون مؤهل',
    birth_date: '1997-08-08',
    wife: '',
    national_id: '29708081605566',
    address: 'الغربية - قطور - قرية سجين الكوم',
    current_job: 'عامل بناء وتشطيبات',
    other_jobs: 'أعمال معمارية',
    travel_abroad: 'لا',
    literacy: 'يجيد القراءة والكتابة بصعوبة',
    inspection: 'قلق وتوتر ملحوظ أثناء المناظرة الأمنية',
    medical_status: 'لائق طبياً مع متابعة سلوكية',
    company: 'السرية الثالثة ( ٣ )',
    police_number: '1058',
    recruit_code: 'SEC-2026-017',
    is_psychological_case: 1,
    psychological_notes: 'يعاني من عصبية مفاجئة وتقلبات مزاجية حادة، توصية بعدم تسليمه سلاح ومتابعته أسبوعياً بعيادة النفسية',
    last_psychological_followup: '2026-10-06'
  },
  {
    batch_index: 4,
    attendance_date: '2026-10-06',
    name: 'إيهاب عادل منصور سليمان',
    religion: 'مسلم',
    qualification: 'متوسط دبلوم إدارة وخدمات',
    birth_date: '1998-09-09',
    wife: '',
    national_id: '29809091606677',
    address: 'الغربية - طنطا - شارع حسن رضوان',
    current_job: 'سائق خاص ومندوب مبيعات',
    other_jobs: 'قيادة سيارات',
    travel_abroad: 'دولة الإمارات العربية المتحدة (زيارة عائلية سنة 2024 لمدة 3 أشهر)',
    literacy: 'يجيد القراءة والكتابة',
    inspection: 'سليم المظهر وخالٍ من الملاحظات',
    medical_status: 'لائق طبياً',
    company: 'السرية الثالثة ( ٣ )',
    police_number: '1059',
    recruit_code: 'SEC-2026-018',
    is_psychological_case: 0
  },
  {
    batch_index: 4,
    attendance_date: '2026-10-06',
    name: 'محمد توفيق عبد الستار البربري',
    religion: 'مسلم',
    qualification: 'متوسط دبلوم لحام وصناعات معدنية',
    birth_date: '1999-10-10',
    wife: '',
    national_id: '29910101607788',
    address: 'المنوفية - أشمون - شارع الثورة',
    current_job: 'لحام كهرباء وأكسجين',
    other_jobs: 'أعمال ورش وسباكة معادن',
    travel_abroad: 'لا',
    literacy: 'يجيد القراءة والكتابة',
    inspection: 'إصابة قديمة بالركبة اليمنى وإحالة للجنة الطبية العسكرية',
    medical_status: 'غير لائق طبياً - قرار لجنة عسكرية عليا بعيب خلقي بالركبة',
    company: 'السرية الأولى ( ١ )',
    police_number: '1060',
    recruit_code: 'SEC-2026-019',
    is_psychological_case: 0
  },
  {
    batch_index: 4,
    attendance_date: '2026-10-07',
    name: 'أشرف ممدوح عبد العال درويش',
    religion: 'مسلم',
    qualification: 'متوسط دبلوم زخرفة ونجارة',
    birth_date: '1997-12-12',
    wife: '',
    national_id: '29712121608899',
    address: 'دمياط - كفر البطيخ - شارع المدارس',
    current_job: 'نجار أثاث وموبليا وغرف نوم',
    other_jobs: 'دهان وصيانة خشب ومطابخ',
    travel_abroad: 'لا',
    literacy: 'يجيد القراءة والكتابة',
    inspection: 'سليم البنية ومنضبط',
    medical_status: 'لائق طبياً',
    company: 'السرية الثانية ( ٢ )',
    police_number: '1061',
    recruit_code: 'SEC-2026-020',
    is_psychological_case: 0
  }
];

export async function seedSampleRecruitsIfEmpty(force = false) {
  const currentCount = await get(`SELECT COUNT(*) as count FROM recruits`);
  if (!force && (currentCount?.count || 0) > 1) {
    return { seeded: false, count: currentCount?.count || 0 };
  }

  // Get active batch id or default to batch 4
  const activeBatch = await get(`SELECT id FROM batches WHERE active = 1 LIMIT 1`);
  const batchId = activeBatch?.id || 4;

  let insertedCount = 0;
  for (const r of SAMPLE_RECRUITS) {
    // Check if national_id already exists to prevent duplication
    const exists = await get(`SELECT id FROM recruits WHERE national_id = ?`, [r.national_id]);
    if (exists) continue;

    const res = await run(`
      INSERT INTO recruits (
        batch_id, attendance_date, name, religion, qualification, birth_date,
        wife, national_id, address, current_job, other_jobs, travel_abroad,
        literacy, inspection, medical_status, company, police_number, recruit_code,
        is_psychological_case, psychological_notes, last_psychological_followup
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      batchId, r.attendance_date, r.name, r.religion, r.qualification, r.birth_date,
      r.wife || '', r.national_id, r.address, r.current_job, r.other_jobs, r.travel_abroad,
      r.literacy, r.inspection, r.medical_status, r.company, r.police_number, r.recruit_code,
      r.is_psychological_case || 0, r.psychological_notes || '', r.last_psychological_followup || ''
    ]);

    insertedCount++;
    const recruitId = res.lastID;

    // Add security ticket for travel abroad recruit
    if (r.travel_abroad && r.travel_abroad.includes('الإمارات')) {
      await run(`
        INSERT INTO recruit_tickets (recruit_id, ticket_type, title, description, status)
        VALUES (?, 'اشتباه أمني', 'متابعة سابقة سفر للخارج', 'المجند سبق له السفر للإمارات العربية المتحدة سنة 2024 لزيارة عائلية، يتطلب التحري عن العلاقات الخارجية.', 'open')
      `, [recruitId]);
    }

    // Add behavioral ticket for psychological recruit
    if (r.is_psychological_case === 1) {
      await run(`
        INSERT INTO recruit_tickets (recruit_id, ticket_type, title, description, status)
        VALUES (?, 'ملاحظة سلوكية', 'متابعة نفسية وعصبية مشددة', 'المجند يعاني من عصبية حادة وتوصية بعدم تسليمه سلاح نهائياً والمتابعة الدورية.', 'open')
      `, [recruitId]);
    }

    // Add medical referral activity
    if (r.medical_status.includes('غير لائق')) {
      await run(`
        INSERT INTO recruit_activities (recruit_id, activity_type, destination, departure_date, return_date, notes)
        VALUES (?, 'medical_referral', 'مستشفى الشرطة بطنطا - عيادة العظام', '2026-10-06', '', 'عرض على استشاري العظام لاستكمال قرار اللجنة الطبية العسكرية العليا')
      `, [recruitId]);
    }
  }

  console.log(`✅ تم إدراج ${insertedCount} مجند كبيانات نموذجية واقعية لاختبار المنظومة بنجاح.`);
  return { seeded: true, count: insertedCount };
}
