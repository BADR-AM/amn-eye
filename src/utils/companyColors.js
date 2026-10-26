import { authHeaders } from './auth';

export const DEFAULT_COMPANY_COLORS = [
  { 
    id: 'c1', 
    match: 'الأولى', 
    number: '1',
    keywords: ['اولى', 'اولي', 'الاولى', 'الاولى', '1', '١'],
    name: 'السرية الأولى ( ١ )', 
    color: '#16a34a', // أخضر
    textColor: '#ffffff',
    borderColor: '#0f766e'
  },
  { 
    id: 'c2', 
    match: 'الثانية', 
    number: '2',
    keywords: ['ثانية', 'ثانيه', 'تانية', 'تانيه', 'الثانية', 'الثانيه', '2', '٢'],
    name: 'السرية الثانية ( ٢ )', 
    color: '#dc2626', // أحمر
    textColor: '#ffffff',
    borderColor: '#991b1b'
  },
  { 
    id: 'c3', 
    match: 'الثالثة', 
    number: '3',
    keywords: ['ثالثة', 'ثالثه', 'تالته', 'تالتة', 'الثالثة', 'الثالثه', '3', '٣'],
    name: 'السرية الثالثة ( ٣ )', 
    color: '#2563eb', // أزرق
    textColor: '#ffffff',
    borderColor: '#1e40af'
  },
  { 
    id: 'c4', 
    match: 'الرابعة', 
    number: '4',
    keywords: ['رابعة', 'رابعه', 'الرابعة', 'الرابعه', '4', '٤'],
    name: 'السرية الرابعة ( ٤ )', 
    color: '#ffffff', // أبيض
    textColor: '#000000',
    borderColor: '#000000'
  },
  { 
    id: 'c5', 
    match: 'الخامسة', 
    number: '5',
    keywords: ['خامسة', 'خامسه', 'الخامسة', 'الخامسه', '5', '٥'],
    name: 'السرية الخامسة ( ٥ )', 
    color: '#ea580c', // برتقالي
    textColor: '#ffffff',
    borderColor: '#9a3412'
  },
  { 
    id: 'c6', 
    match: 'السادسة', 
    number: '6',
    keywords: ['سادسة', 'سادسه', 'السادسة', 'السادسه', '6', '٦'],
    name: 'السرية السادسة ( ٦ )', 
    color: '#38bdf8', // لبني
    textColor: '#000000',
    borderColor: '#0284c7'
  },
  { 
    id: 'sec', 
    match: 'أمن', 
    number: 'أ',
    keywords: ['أمن', 'امن', 'سرية الامن'],
    name: 'سرية الأمن', 
    color: '#090d16', // كحلي داكن ملكي
    textColor: '#fef08a', // ذهبي فاتح
    borderColor: '#eab308',
    isSpecialUnit: true,
    badgeText: 'سرية الأمن'
  },
  { 
    id: 'base', 
    match: 'أساسية', 
    number: 'ق',
    keywords: ['أساسية', 'اساسية', 'اساسيه', 'أساسيه', 'القوه الاساسيه', 'القوة الأساسية', 'سرية القوة الأساسية', 'سرية القوه الاساسيه'],
    name: 'القوة الأساسية', 
    color: '#1e1b4b', // أرجواني كحلي داكن
    textColor: '#fde047', // ذهبي مميز
    borderColor: '#f59e0b',
    isSpecialUnit: true,
    badgeText: 'القوة الأساسية'
  }
];

/**
 * Normalizes Arabic text by standardizing alifs, yaa/alif maqsura, taa marbuta,
 * removing diacritics, and converting eastern Arabic digits to western digits.
 */
export const normalizeArabic = (str) => {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/[\u064B-\u0652]/g, '') // remove tashkeel/diacritics
    .replace(/[أإآء]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىي]/g, 'ي') // Normalize both ى and ي to ي
    .replace(/[\u0660-\u0669]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48)) // Eastern digits
    .replace(/[\u06F0-\u06F9]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x06F0 + 48))
    .replace(/[^\u0621-\u064Aa-zA-Z0-9\s]/g, ' ') // Strip punctuation/parentheses
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Returns matching color configuration for a recruit's company with resilient fuzzy fallback.
 */
export const getCompanyColorConfig = (companyName, customColors = null) => {
  const list = customColors && customColors.length > 0 ? customColors : DEFAULT_COMPANY_COLORS;
  if (!companyName || String(companyName).trim() === '' || String(companyName).trim() === 'all') {
    return {
      id: 'none',
      name: 'بدون سرية',
      displayName: 'بدون سرية',
      color: '#334155',
      textColor: '#94a3b8',
      borderColor: '#475569'
    };
  }

  const rawStr = String(companyName).trim();
  const normStr = normalizeArabic(rawStr);

  // 1. Exact match by name
  for (const item of list) {
    if (item.name && (rawStr === item.name || normStr === normalizeArabic(item.name))) {
      return { ...item, displayName: item.name };
    }
  }

  // 2. Comprehensive keyword and ID matching
  for (const item of list) {
    const normItemName = normalizeArabic(item.name || '');
    const normItemMatch = normalizeArabic(item.match || '');

    // Match exact number: e.g. "1" or "١"
    if (item.number && (normStr === item.number || normStr === String(item.number))) {
      return { ...item, displayName: item.name };
    }

    // Match keywords defined on item
    if (item.keywords && Array.isArray(item.keywords)) {
      for (const kw of item.keywords) {
        const normKw = normalizeArabic(kw);
        if (normStr === normKw || normStr.includes(normKw)) {
          return { ...item, displayName: item.name };
        }
      }
    }

    // Resilient unit matching by ID or semantic meaning
    if (item.id === 'c1' || normItemMatch.includes('اولي') || normItemName.includes('اولي')) {
      if (normStr.includes('اولي') || normStr === '1' || normStr.includes(' 1 ') || normStr.endsWith(' 1') || normStr.startsWith('1 ')) {
        return { ...item, displayName: item.name };
      }
    } else if (item.id === 'c2' || normItemMatch.includes('ثانيه') || normItemName.includes('ثانيه')) {
      if (normStr.includes('ثانيه') || normStr.includes('تانيه') || normStr === '2' || normStr.includes(' 2 ') || normStr.endsWith(' 2') || normStr.startsWith('2 ')) {
        return { ...item, displayName: item.name };
      }
    } else if (item.id === 'c3' || normItemMatch.includes('ثالثه') || normItemName.includes('ثالثه')) {
      if (normStr.includes('ثالثه') || normStr.includes('تالته') || normStr === '3' || normStr.includes(' 3 ') || normStr.endsWith(' 3') || normStr.startsWith('3 ')) {
        return { ...item, displayName: item.name };
      }
    } else if (item.id === 'c4' || normItemMatch.includes('رابعه') || normItemName.includes('رابعه')) {
      if (normStr.includes('رابعه') || normStr === '4' || normStr.includes(' 4 ') || normStr.endsWith(' 4') || normStr.startsWith('4 ')) {
        return { ...item, displayName: item.name };
      }
    } else if (item.id === 'c5' || normItemMatch.includes('خامسه') || normItemName.includes('خامسه')) {
      if (normStr.includes('خامسه') || normStr === '5' || normStr.includes(' 5 ') || normStr.endsWith(' 5') || normStr.startsWith('5 ')) {
        return { ...item, displayName: item.name };
      }
    } else if (item.id === 'c6' || normItemMatch.includes('سادسه') || normItemName.includes('سادسه')) {
      if (normStr.includes('سادسه') || normStr === '6' || normStr.includes(' 6 ') || normStr.endsWith(' 6') || normStr.startsWith('6 ')) {
        return { ...item, displayName: item.name };
      }
    } else if (item.id === 'sec' || normItemMatch.includes('امن')) {
      if (normStr.includes('امن')) {
        return { ...item, displayName: item.name };
      }
    } else if (item.id === 'base' || normItemMatch.includes('اساس')) {
      if (normStr.includes('اساس')) {
        return { ...item, displayName: item.name };
      }
    }

    if (item.match && (rawStr.includes(item.match) || normStr.includes(normItemMatch))) {
      return { ...item, displayName: item.name };
    }
  }

  // Fallback default: neutral slate gray (never falsely masquerade as Company 3 blue)
  return {
    name: rawStr,
    displayName: rawStr,
    color: '#475569',
    textColor: '#ffffff',
    borderColor: '#64748b'
  };
};

/**
 * Helper to get CSS style attributes directly.
 */
export const getCompanyStyle = (companyName, customColors = null) => {
  const conf = getCompanyColorConfig(companyName, customColors);
  return {
    color: conf.color,
    bg: conf.color,
    text: conf.textColor,
    textColor: conf.textColor,
    border: conf.borderColor || conf.color,
    name: conf.name,
    displayName: conf.displayName || conf.name
  };
};

/**
 * Fetch company colors from server or fallback to local storage / defaults.
 */
export const fetchCompanyColors = async () => {
  try {
    const res = await fetch('/api/settings/company-colors');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        localStorage.setItem('company_colors', JSON.stringify(data));
        return data;
      }
    }
  } catch (err) {
    console.warn('Could not fetch company colors from server, using cache/defaults:', err);
  }

  const cached = localStorage.getItem('company_colors');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {}
  }

  return DEFAULT_COMPANY_COLORS;
};

/**
 * Save company colors to server and cache locally.
 */
export const saveCompanyColors = async (colors) => {
  localStorage.setItem('company_colors', JSON.stringify(colors));
  try {
    const res = await fetch('/api/settings/company-colors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify(colors),
    });
    return res.ok;
  } catch (err) {
    console.error('Error saving company colors to server:', err);
    return false;
  }
};
