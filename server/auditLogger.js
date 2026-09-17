import { run } from './db.js';
import { verifyToken } from './auth.js';

// Human-friendly field labels in Arabic
export const FIELD_LABELS = {
  name: 'الاسم',
  military_number: 'الرقم العسكري',
  national_id: 'الرقم القومي',
  birth_date: 'تاريخ الميلاد',
  governorate: 'المحافظة',
  address: 'محل الإقامة',
  phone: 'رقم الهاتف',
  current_job: 'المهنة الحالية',
  other_jobs: 'مهن وحرف أخرى',
  qualification: 'المؤهل الدراسي',
  religion: 'الديانة',
  marital_status: 'الحالة الاجتماعية',
  wife: 'الزوجة / الحالة الاجتماعية',
  travel_abroad: 'السفر للخارج',
  literacy: 'القراءة والكتابة',
  medical_status: 'اللياقة الطبية',
  inspection: 'مناظرة المجند',
  father_name: 'اسم الوالد',
  father_job: 'مهنة الوالد',
  mother_name: 'اسم الأم',
  mother_job: 'مهنة الأم',
  siblings_check: 'فحص الإخوة',
  family_social_status: 'الحالة الاجتماعية للأسرة',
  family_security_status: 'الموقف الأمني للعائلة',
  police_number: 'رقم الشرطة (كارت الدولاب)',
  company: 'السرية / الوحدة',
  notes: 'الملاحظات',
  batch_id: 'الدفع التجنيدي',
  is_psychological_case: 'حالة متابعة نفسية',
  psychological_notes: 'ملاحظات نفسية'
};

/**
 * Computes differences between two recruit records
 */
export function computeRecruitDiff(oldRecord = {}, newRecord = {}) {
  const diff = {};
  const changedFieldsArabic = [];

  for (const [key, newVal] of Object.entries(newRecord)) {
    if (['id', 'created_at', 'updated_at', 'photo_path', 'video_path', 'remove_photo', 'remove_video', 'photo_base64'].includes(key)) continue;
    const oldVal = oldRecord[key];

    // Normalize empty strings and null
    const normOld = oldVal === null || oldVal === undefined ? '' : String(oldVal).trim();
    const normNew = newVal === null || newVal === undefined ? '' : String(newVal).trim();

    if (normOld !== normNew) {
      const label = FIELD_LABELS[key] || key;
      diff[key] = {
        label,
        old: normOld || 'ـ',
        new: normNew || 'ـ'
      };
      changedFieldsArabic.push(`${label}: (${normOld || 'فارغ'} ⬅️ ${normNew || 'فارغ'})`);
    }
  }

  return {
    diff,
    hasChanges: Object.keys(diff).length > 0,
    summary: changedFieldsArabic.length > 0 ? changedFieldsArabic.join(' ، ') : 'لم يتم رصد تغييرات جوهرية'
  };
}

/**
 * Asynchronously logs an audit event
 */
export async function logAudit(req, {
  action_type,
  entity_type,
  entity_id = '',
  entity_name = '',
  details = '',
  diff_data = null,
  user_id = null,
  username = '',
  user_fullname = '',
  user_role = ''
}) {
  try {
    let userObj = req?.user;
    if (!userObj && req?.headers?.authorization?.startsWith('Bearer ')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        userObj = verifyToken(token);
      } catch (e) {}
    }

    const finalUserId = userObj?.id ?? user_id;
    const finalUsername = userObj?.username || username || 'system';
    const finalFullName = userObj?.full_name || user_fullname || (finalUsername === 'system' ? 'النظام التلقائي' : finalUsername);
    const finalRole = userObj?.role || user_role || 'system';

    let ip = '';
    if (req) {
      ip = (req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) || req.socket?.remoteAddress || req.ip || '';
      if (ip.includes('::ffff:')) ip = ip.replace('::ffff:', '');
    }

    const diffJson = diff_data ? (typeof diff_data === 'string' ? diff_data : JSON.stringify(diff_data)) : '';

    await run(
      `INSERT INTO audit_logs (
        user_id, username, user_fullname, user_role,
        action_type, entity_type, entity_id, entity_name,
        details, diff_data, ip_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        finalUserId,
        finalUsername,
        finalFullName,
        finalRole,
        action_type,
        entity_type,
        String(entity_id || ''),
        String(entity_name || ''),
        details,
        diffJson,
        ip
      ]
    );
  } catch (err) {
    console.error('⚠️ فشل تسجيل حركة الرقابة (Audit Logging Error):', err.message);
  }
}
