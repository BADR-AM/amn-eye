/**
 * Medical status classification and normalization module
 * Ensures strict separation between:
 * - 'fit' (لائق طبياً)
 * - 'unfit' (غير لائق طبياً)
 * - 'undetermined' (غير محدد / قيد الفحص)
 *
 * Prevents defect where LIKE '%لائق%' matched 'غير لائق'.
 */

export function classifyMedicalStatus(status) {
  if (!status || typeof status !== 'string') {
    return 'undetermined';
  }

  const s = status.trim().toLowerCase();
  if (!s || s === 'غير محدد' || s === 'تحت الفحص' || s === 'قيد الفحص') {
    return 'undetermined';
  }

  // Explicit check for unfit
  if (s.includes('غير لائق') || s.includes('غير سليم') || s.includes('معافى') || s.includes('معفي')) {
    return 'unfit';
  }

  // Explicit check for fit
  if (s.includes('لائق') || s.includes('سليم')) {
    return 'fit';
  }

  return 'undetermined';
}

/**
 * SQL WHERE clauses that guarantee exact categorization without false positives
 */
export const SQL_MEDICAL_FIT = `((medical_status LIKE '%لائق%' AND medical_status NOT LIKE '%غير لائق%') OR (medical_status LIKE '%سليم%' AND medical_status NOT LIKE '%غير سليم%'))`;
export const SQL_MEDICAL_UNFIT = `(medical_status LIKE '%غير لائق%' OR medical_status LIKE '%غير سليم%' OR medical_status LIKE '%معافى%' OR medical_status LIKE '%معفي%')`;
export const SQL_MEDICAL_UNDETERMINED = `(medical_status IS NULL OR medical_status = '' OR medical_status LIKE '%غير محدد%' OR (NOT (${SQL_MEDICAL_FIT}) AND NOT (${SQL_MEDICAL_UNFIT})))`;

/**
 * Returns human-readable Arabic label for medical status
 */
export function getMedicalStatusLabel(status) {
  const cat = classifyMedicalStatus(status);
  switch (cat) {
    case 'fit':
      return 'لائق طبياً';
    case 'unfit':
      return 'غير لائق طبياً';
    case 'undetermined':
    default:
      return 'غير محدد / قيد الفحص';
  }
}
