// Egyptian National ID Governorate codes mapping
const GOVERNORATES = {
  '01': 'القاهرة',
  '02': 'الإسكندرية',
  '03': 'بورسعيد',
  '04': 'السويس',
  '11': 'دمياط',
  '12': 'الدقهلية',
  '13': 'الشرقية',
  '14': 'القليوبية',
  '15': 'كفر الشيخ',
  '16': 'الغربية',
  '17': 'المنوفية',
  '18': 'البحيرة',
  '19': 'الإسماعيلية',
  '21': 'الجيزة',
  '22': 'بني سويف',
  '23': 'الفيوم',
  '24': 'المنيا',
  '25': 'أسيوط',
  '26': 'سوهاج',
  '27': 'قنا',
  '28': 'أسوان',
  '29': 'الأقصر',
  '31': 'البحر الأحمر',
  '32': 'الوادي الجديد',
  '33': 'مطروح',
  '34': 'شمال سيناء',
  '35': 'جنوب سيناء',
  '88': 'خارج الجمهورية'
};

/**
 * Extracts birth date and governorate from Egyptian 14-digit National ID
 */
export function parseEgyptianNationalId(id) {
  if (!id || typeof id !== 'string') return null;
  const cleanId = id.trim();
  if (cleanId.length !== 14 || !/^\d{14}$/.test(cleanId)) return null;

  const centuryCode = cleanId[0];
  const yearPart = cleanId.substring(1, 3);
  const monthPart = cleanId.substring(3, 5);
  const dayPart = cleanId.substring(5, 7);
  const govCode = cleanId.substring(7, 9);

  let fullYear = 0;
  if (centuryCode === '2') fullYear = 1900 + parseInt(yearPart, 10);
  else if (centuryCode === '3') fullYear = 2000 + parseInt(yearPart, 10);
  else return null;

  const month = parseInt(monthPart, 10);
  const day = parseInt(dayPart, 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const formattedMonth = month < 10 ? `0${month}` : `${month}`;
  const formattedDay = day < 10 ? `0${day}` : `${day}`;
  const birthDate = `${fullYear}-${formattedMonth}-${formattedDay}`;
  const governorate = GOVERNORATES[govCode] || 'غير محدد';

  return {
    birthDate,
    fullYear,
    month,
    day,
    governorate,
    isValid: true
  };
}
