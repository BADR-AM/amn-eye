import { authHeaders } from './auth';

export const DEFAULT_COMPANY_COLORS = [
  { 
    id: 'c1', 
    match: 'الأولى', 
    number: '1',
    name: 'السرية الأولى ( ١ )', 
    color: '#16a34a', // أخضر
    textColor: '#ffffff',
    borderColor: '#0f766e'
  },
  { 
    id: 'c2', 
    match: 'الثانية', 
    number: '2',
    name: 'السرية الثانية ( ٢ )', 
    color: '#dc2626', // أحمر
    textColor: '#ffffff',
    borderColor: '#991b1b'
  },
  { 
    id: 'c3', 
    match: 'الثالثة', 
    number: '3',
    name: 'السرية الثالثة ( ٣ )', 
    color: '#2563eb', // أزرق
    textColor: '#ffffff',
    borderColor: '#1e40af'
  },
  { 
    id: 'c4', 
    match: 'الرابعة', 
    number: '4',
    name: 'السرية الرابعة ( ٤ )', 
    color: '#ffffff', // أبيض
    textColor: '#000000',
    borderColor: '#000000'
  },
  { 
    id: 'c5', 
    match: 'الخامسة', 
    number: '5',
    name: 'السرية الخامسة ( ٥ )', 
    color: '#ea580c', // برتقالي
    textColor: '#ffffff',
    borderColor: '#9a3412'
  },
  { 
    id: 'c6', 
    match: 'السادسة', 
    number: '6',
    name: 'السرية السادسة ( ٦ )', 
    color: '#38bdf8', // لبني
    textColor: '#000000',
    borderColor: '#0284c7'
  }
];

/**
 * Returns matching color configuration for a recruit's company.
 */
export const getCompanyColorConfig = (companyName, customColors = null) => {
  const list = customColors && customColors.length > 0 ? customColors : DEFAULT_COMPANY_COLORS;
  if (!companyName) {
    // Default to Company 3 (Blue) or first
    return list[2] || list[0] || DEFAULT_COMPANY_COLORS[2];
  }

  const str = String(companyName).trim();

  // Try exact match or match keyword
  for (const item of list) {
    if (item.name && str === item.name) return item;
    if (item.match && str.includes(item.match)) return item;
    if (item.number && (str.includes(`(${item.number})`) || str.includes(`( ${item.number} )`))) return item;
  }

  // Fallback default
  return {
    name: str,
    color: '#2563eb',
    textColor: '#ffffff',
    borderColor: '#000000'
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
