/**
 * Conservative Arabic text normalization module for safe search and intent extraction.
 *
 * Designed specifically for Egyptian security & civil records:
 * - Normalizes orthographic variations (Alef, Taa Marbuta, Yaa, Tatweel, Tashkeel)
 * - Converts Arabic-Indic / Persian digits to standard ASCII digits
 * - Preserves exact numbers, National IDs, and distinct identities
 * - Produces sanitized, injection-free queries for SQLite FTS5
 */

const EASTERN_ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * Converts Eastern Arabic and Persian digits to standard Western ASCII digits (0-9).
 * Leaves all other characters unchanged.
 */
export function normalizeDigits(text) {
  if (!text || typeof text !== 'string') return '';
  let res = text;
  for (let i = 0; i < 10; i++) {
    res = res.replaceAll(EASTERN_ARABIC_DIGITS[i], String(i));
    res = res.replaceAll(PERSIAN_DIGITS[i], String(i));
  }
  return res;
}

/**
 * Strips Arabic Tashkeel (diacritics) and Tatweel (kashida).
 */
export function stripDiacritics(text) {
  if (!text || typeof text !== 'string') return '';
  // Removes: Fathatan, Dammatan, Kasratan, Fatha, Damma, Kasra, Shadda, Sukun, Superscript Alef, Tatweel
  return text
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\u0640/g, ''); // Tatweel
}

/**
 * Normalizes common Arabic orthographic variations conservatively:
 * - أ, إ, آ, ٱ -> ا
 * - ة -> ه
 * - ى -> ي
 * Does NOT merge distinct consonants, surnames, or numbers.
 */
export function normalizeArabic(text) {
  if (!text || typeof text !== 'string') return '';
  let s = normalizeDigits(text);
  s = stripDiacritics(s);
  s = s.replace(/[إأآٱ]/g, 'ا');
  s = s.replace(/ة/g, 'ه');
  s = s.replace(/ى/g, 'ي');
  return s.trim();
}

/**
 * Cleans text for tokenization: replaces punctuation and extra spaces.
 */
export function cleanText(text) {
  if (!text || typeof text !== 'string') return '';
  return normalizeArabic(text)
    .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Common Arabic stop words for search intent extraction (keeps nouns, identifiers, and filters).
 */
export const ARABIC_STOP_WORDS = new Set([
  'في', 'من', 'على', 'إلى', 'عن', 'مع', 'هذا', 'هذه', 'ذلك', 'تلك',
  'التي', 'الذي', 'الذين', 'اللاتي', 'أو', 'ثم', 'لكن', 'بل', 'لا',
  'ما', 'ماذا', 'كيف', 'أين', 'متى', 'كم', 'هل', 'هو', 'هي', 'هم',
  'هن', 'كل', 'بعض', 'غير', 'سوى', 'فقط', 'نحن', 'أنا', 'أنت', 'أنتم',
  // Egyptian conversational inquiry words & filler words
  'مين', 'اللي', 'الي', 'هنا', 'عايز', 'عاوز', 'عايزين', 'عاوزين', 'قولي', 'وريني',
  'طلعلي', 'هاتلي', 'ابحث', 'كشف', 'بيان', 'اسماء', 'أسماء', 'قائمة', 'قائمه',
  'جدول', 'تقرير', 'عرفني', 'شغالين', 'واخدين', 'عندهم', 'عنده', 'فيه', 'فيها',
  'حد', 'واحد', 'يا', 'باشا', 'فندم', 'بقى', 'كده', 'دلوقتي', 'علشان', 'عشان'
]);

/**
 * Builds a safe, syntax-error-free SQLite FTS5 query string from user input.
 * Escapes quotes, removes FTS operator keywords, and appends prefix search (*) to tokens.
 *
 * @param {string} input - Raw search string
 * @returns {string} Safe FTS5 MATCH expression or empty string
 */
export function buildFts5Query(input) {
  if (!input || typeof input !== 'string') return '';
  const cleaned = cleanText(input);
  if (!cleaned) return '';

  // Split into individual tokens
  const rawTokens = cleaned.split(/\s+/).filter(t => t.length > 0);
  if (rawTokens.length === 0) return '';

  // Filter out standalone stop words if more than 1 token
  const tokens = rawTokens.length > 1
    ? rawTokens.filter(t => !ARABIC_STOP_WORDS.has(t) && t.length >= 2)
    : rawTokens;

  const validTokens = tokens.length > 0 ? tokens : rawTokens;

  // Escape any special FTS5 characters and format as token*
  const ftsTokens = validTokens.map(token => {
    // Sanitize token: remove internal quotes or operators
    const safeToken = token.replace(/["*]/g, '');
    if (!safeToken) return null;
    return `"${safeToken}"*`;
  }).filter(Boolean);

  if (ftsTokens.length === 0) return '';
  return ftsTokens.join(' AND ');
}

/**
 * Extracts potential 14-digit Egyptian National ID from any text.
 */
export function extractNationalId(text) {
  if (!text || typeof text !== 'string') return null;
  const digits = normalizeDigits(text);
  const match = digits.match(/\b([23]\d{13})\b/);
  return match ? match[1] : null;
}
