/**
 * markdownParser.js
 * Comprehensive parser for recruit dossiers in Markdown (.md) format.
 * Supports YAML frontmatter (--- ... ---) and Arabic/English key-value mappings.
 */

const FIELD_MAPPINGS = {
  // Name
  name: 'name',
  'الاسم': 'name',
  'اسم المجند': 'name',
  'الاسم بالكامل': 'name',

  // National ID
  national_id: 'national_id',
  'الرقم القومي': 'national_id',
  'رقم قومي': 'national_id',
  'بطاقة الرقم القومي': 'national_id',

  // Police Number
  police_number: 'police_number',
  'رقم الشرطة': 'police_number',
  'نمرة الشرطة': 'police_number',

  // Qualification
  qualification: 'qualification',
  'المؤهل': 'qualification',
  'المؤهل الدراسي': 'qualification',

  // Company
  company: 'company',
  'السرية': 'company',
  'سرية': 'company',

  // Birth Date
  birth_date: 'birth_date',
  'تاريخ الميلاد': 'birth_date',
  'الميلاد': 'birth_date',

  // Attendance Date
  attendance_date: 'attendance_date',
  'تاريخ الحضور': 'attendance_date',
  'تاريخ التجنيد': 'attendance_date',

  // Religion
  religion: 'religion',
  'الديانة': 'religion',

  // Address & Governorate
  governorate: 'governorate',
  'المحافظة': 'governorate',
  address: 'address',
  'العنوان': 'address',
  'محل الإقامة': 'address',

  // Current / Other Jobs
  current_job: 'current_job',
  'المهنة الحالية': 'current_job',
  'المهنة': 'current_job',
  'الوظيفة': 'current_job',
  other_jobs: 'other_jobs',
  'مهن سابقة': 'other_jobs',
  'أعمال أخرى': 'other_jobs',

  // Travel Abroad
  travel_abroad: 'travel_abroad',
  'السفر للخارج': 'travel_abroad',
  'سوابق السفر': 'travel_abroad',

  // Literacy
  literacy: 'literacy',
  'القراءة والكتابة': 'literacy',
  'معرفة القراءة والكتابة': 'literacy',

  // Inspection
  inspection: 'inspection',
  'المناظرة': 'inspection',
  'مناظرة': 'inspection',

  // Medical Status
  medical_status: 'medical_status',
  'الحالة الطبية': 'medical_status',
  'القرار الطبي': 'medical_status',

  // Parents
  father_name: 'father_name',
  'اسم الأب': 'father_name',
  'اسم الوالد': 'father_name',
  father_job: 'father_job',
  'مهنة الأب': 'father_job',
  'مهنة الوالد': 'father_job',
  mother_name: 'mother_name',
  'اسم الأم': 'mother_name',
  'اسم الوالدة': 'mother_name',
  mother_job: 'mother_job',
  'مهنة الأم': 'mother_job',
  'مهنة الوالدة': 'mother_job',

  // Siblings & Wife
  wife: 'wife',
  'الزوجة': 'wife',
  'الحالة الاجتماعية': 'wife',
  siblings_check: 'siblings_check',
  'فحص الأشقاء': 'siblings_check',
  'فحص الإخوة': 'siblings_check',

  // Family Status
  family_social_status: 'family_social_status',
  'الحالة الاجتماعية للأسرة': 'family_social_status',
  family_security_status: 'family_security_status',
  'الحالة الأمنية للأسرة': 'family_security_status',

  // Psychological
  is_psychological_case: 'is_psychological_case',
  'الحالة النفسية': 'is_psychological_case',
  'غير متزن نفسيا': 'is_psychological_case',
  psychological_notes: 'psychological_notes',
  'ملاحظات نفسية': 'psychological_notes',

  // General Notes
  notes: 'notes',
  'ملاحظات': 'notes'
};

/**
 * Strips outer quotes, trim whitespace, and clean up string values.
 */
function cleanValue(val) {
  if (val === undefined || val === null) return '';
  let str = String(val).trim();
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
  }
  return str;
}

/**
 * Normalizes an arbitrary key string into standard recruits schema field name.
 */
function normalizeKey(key) {
  if (!key) return null;
  const cleanKey = key.trim().toLowerCase().replace(/^[-*#\s]+/, '').replace(/[:：\s]+$/, '');
  return FIELD_MAPPINGS[cleanKey] || null;
}

/**
 * Parses markdown text into recruit object.
 * @param {string} mdContent Raw markdown text
 * @param {string} [filename] Optional source filename
 * @returns {object} Parsed recruit data
 */
export function parseRecruitMarkdown(mdContent, filename = '') {
  if (!mdContent || typeof mdContent !== 'string') {
    return {
      success: false,
      error: 'محتوى الملف فارغ أو غير صالح',
      filename,
      data: null
    };
  }

  const result = {
    name: '',
    national_id: '',
    police_number: '',
    qualification: 'متوسط',
    company: '',
    birth_date: '',
    attendance_date: new Date().toISOString().split('T')[0],
    religion: 'مسلم',
    address: '',
    current_job: '',
    other_jobs: '',
    travel_abroad: 'لم يسافر',
    literacy: 'يجيد',
    inspection: 'سليم',
    medical_status: 'لائق طبياً وسليم',
    father_name: '',
    father_job: '',
    mother_name: '',
    mother_job: '',
    wife: 'أعزب',
    siblings_check: '',
    family_social_status: 'مستقرة',
    family_security_status: 'خالية من السوابق والشبهات',
    is_psychological_case: 0,
    psychological_notes: '',
    notes: ''
  };

  let bodyContent = '';
  const lines = mdContent.split(/\r?\n/);
  let inFrontmatter = false;
  let frontmatterFound = false;
  let frontmatterLines = [];
  let otherLines = [];

  // 1. Check for YAML frontmatter block (starts at line 0 with ---)
  if (lines.length > 0 && lines[0].trim() === '---') {
    inFrontmatter = true;
    frontmatterFound = true;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (inFrontmatter && line.trim() === '---') {
        inFrontmatter = false;
        continue;
      }
      if (inFrontmatter) {
        frontmatterLines.push(line);
      } else {
        otherLines.push(line);
      }
    }
  } else {
    otherLines = lines;
  }

  // Helper to extract key-value from a line
  const parseLineKeyValue = (line) => {
    // Match keys: English or Arabic words followed by : or ：
    const match = line.match(/^[-*#\s]*([\u0600-\u06FF\w\s_-]+)[:：]\s*(.*)$/);
    if (match) {
      const rawKey = match[1];
      const rawVal = match[2];
      const standardKey = normalizeKey(rawKey);
      if (standardKey) {
        return { key: standardKey, value: cleanValue(rawVal) };
      }
    }
    return null;
  };

  // Parse Frontmatter lines
  for (const line of frontmatterLines) {
    const kv = parseLineKeyValue(line);
    if (kv) {
      if (kv.key === 'is_psychological_case') {
        const lowerVal = kv.value.toLowerCase();
        result.is_psychological_case = (kv.value === '1' || lowerVal === 'true' || lowerVal === 'نعم') ? 1 : 0;
      } else {
        result[kv.key] = kv.value;
      }
    }
  }

  // Parse remaining lines: look for inline key-value pairs or body notes
  const remainingNotes = [];
  for (const line of otherLines) {
    const kv = parseLineKeyValue(line);
    if (kv && (!result[kv.key] || result[kv.key] === 'متوسط' || result[kv.key] === 'مسلم')) {
      // If found in body and not set yet, update field
      if (kv.key === 'is_psychological_case') {
        const lowerVal = kv.value.toLowerCase();
        result.is_psychological_case = (kv.value === '1' || lowerVal === 'true' || lowerVal === 'نعم') ? 1 : 0;
      } else {
        result[kv.key] = kv.value;
      }
    } else {
      remainingNotes.push(line);
    }
  }

  // Body content as notes
  const rawNotes = remainingNotes.join('\n').trim();
  if (rawNotes) {
    if (result.notes) {
      result.notes = result.notes + '\n\n' + rawNotes;
    } else {
      result.notes = rawNotes;
    }
  }

  // Normalize digits in national_id and police_number (convert Arabic Indic digits ٠-٩ to 0-9)
  if (result.national_id) {
    result.national_id = result.national_id.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\D/g, '');
  }
  if (result.police_number) {
    result.police_number = result.police_number.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).trim();
  }

  // If address has governorate separated or provided
  if (result.governorate && !result.address.includes(result.governorate)) {
    result.address = result.governorate + (result.address ? ` - ${result.address}` : '');
  }

  // Determine validity
  const isValid = Boolean(result.name && result.name.trim().length >= 3);
  let validationError = '';
  if (!result.name || result.name.trim().length < 3) {
    validationError = 'اسم المجند مفقود أو غير صالح (يجب أن يكون 3 أحرف على الأقل)';
  } else if (result.national_id && result.national_id.length !== 14) {
    validationError = 'الرقم القومي غير صالح (يجب أن يتكون من 14 رقماً)';
  }

  return {
    success: isValid && !validationError,
    error: validationError,
    filename,
    data: result
  };
}
