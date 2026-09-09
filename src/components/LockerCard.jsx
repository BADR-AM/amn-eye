import React, { forwardRef } from 'react';

// Helper to convert Western digits to Eastern Arabic numerals (١٢٣٤٥٦٧٨٩٠)
export const toArabicNumerals = (str) => {
  if (!str && str !== 0) return '';
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(str).replace(/[0-9]/g, (d) => arabicDigits[d]);
};

export const CentralSecurityEmblem = ({ className = "w-16 h-16" }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Outer circle with dual gold/navy rim */}
    <circle cx="60" cy="60" r="56" fill="#0c1e3d" stroke="#b8860b" strokeWidth="3" />
    <circle cx="60" cy="60" r="52" fill="#08152c" stroke="#d4af37" strokeWidth="1.5" />
    <circle cx="60" cy="60" r="49" fill="#0e2a5c" stroke="#f39c12" strokeDasharray="3 2" strokeWidth="1" />
    
    {/* Upper Ribbon text: الأمن المركزي */}
    <path id="curveTop" d="M 22 60 A 38 38 0 0 1 98 60" fill="none" />
    <text fill="#ffffff" fontSize="11" fontWeight="bold" fontFamily="Cairo, Arial" letterSpacing="1">
      <textPath href="#curveTop" startOffset="50%" textAnchor="middle">
        الأمن المركزي
      </textPath>
    </text>

    {/* Lower Ribbon text: CENTRAL SECURITY */}
    <path id="curveBottom" d="M 98 60 A 38 38 0 0 1 22 60" fill="none" />
    <text fill="#d4af37" fontSize="6.5" fontWeight="bold" letterSpacing="0.8">
      <textPath href="#curveBottom" startOffset="50%" textAnchor="middle">
        CENTRAL SECURITY
      </textPath>
    </text>

    {/* Inner decorative circle for Eagle */}
    <circle cx="60" cy="60" r="30" fill="#0b1b36" stroke="#d4af37" strokeWidth="1" />

    {/* Golden Eagle (شعار النسر المصري الذهبي) */}
    <g transform="translate(39, 39) scale(0.35)">
      {/* Eagle body & shield */}
      <path d="M60 10 L68 25 L85 28 L72 40 L76 58 L60 48 L44 58 L48 40 L35 28 L52 25 Z" fill="#f1c40f" stroke="#b7950b" strokeWidth="2" />
      {/* Eagle Wings */}
      <path d="M60 25 C75 10 105 15 115 45 C100 45 85 40 75 50 C85 60 90 75 80 85 C70 70 65 60 60 65 C55 60 50 70 40 85 C30 75 35 60 45 50 C35 40 20 45 5 45 C15 15 45 10 60 25 Z" fill="#e67e22" stroke="#d35400" strokeWidth="2" />
      <path d="M60 30 C70 20 95 24 102 48 C90 48 78 44 70 52 C78 60 82 72 74 80 C66 68 62 60 60 62 C58 60 54 68 46 80 C38 72 42 60 50 52 C42 44 30 48 18 48 C25 24 50 20 60 30 Z" fill="#f39c12" />
      {/* Eagle Head */}
      <path d="M57 15 C57 10 63 10 63 15 L66 18 L60 22 L54 18 Z" fill="#f1c40f" />
      <circle cx="58" cy="14" r="1.5" fill="#000" />
      {/* Center Shield */}
      <path d="M52 45 L68 45 L66 65 L60 70 L54 65 Z" fill="#c0392b" stroke="#f1c40f" strokeWidth="1.5" />
      <path d="M54 50 L66 50 L64 62 L60 66 L56 62 Z" fill="#ffffff" />
    </g>

    {/* Olive branch wreath underneath */}
    <path d="M35 88 C45 96 75 96 85 88" stroke="#27ae60" strokeWidth="2" fill="none" strokeLinecap="round" />
  </svg>
);

import { getCompanyColorConfig } from '../utils/companyColors';

/**
 * LockerCard Component — كارت الدولاب للمجند
 * Matched 1:1 with official Central Security locker card format.
 * Dynamic header & badge color based on military company (السرية).
 */
const LockerCard = forwardRef(({ 
  recruit, 
  scale = 1, 
  className = "",
  companyColors = null,
  customHeaderColor = null,
  customTextColor = null
}, ref) => {
  if (!recruit) return null;

  // Extract first name (large emphasis on card) and full remaining name
  const names = (recruit.name || '').trim().split(/\s+/);
  const firstName = names[0] || 'مجند';
  const restName = names.slice(1).join(' ') || '';

  // Format attendance date
  let formattedDate = recruit.attendance_date || '';
  if (formattedDate.includes('-')) {
    formattedDate = formattedDate.replace(/-/g, '/');
  }
  const dateArabic = toArabicNumerals(formattedDate);
  const policeNumArabic = toArabicNumerals(recruit.police_number || recruit.national_id?.slice(-6) || '------');

  // Company and Color Resolution
  const companyLabel = recruit.company?.trim() || 'السرية الثالثة ( ٣ )';
  const colorConfig = getCompanyColorConfig(companyLabel, companyColors);
  
  const headerBg = customHeaderColor || colorConfig.color || '#f37021';
  const headerText = customTextColor || colorConfig.textColor || (headerBg === '#ffffff' ? '#000000' : '#ffffff');
  const dividerColor = headerText === '#ffffff' ? 'rgba(255,255,255,0.85)' : '#000000';

  return (
    <div
      ref={ref}
      style={{
        width: `${640 * scale}px`,
        height: `${380 * scale}px`,
        transformOrigin: 'top right',
      }}
      className={`relative bg-white text-black font-sans select-none overflow-hidden border-2 border-black shadow-md flex flex-col ${className}`}
      dir="rtl"
    >
      {/* 1. Header Bar: Color determined dynamically by company */}
      <div 
        style={{ backgroundColor: headerBg, color: headerText }}
        className="w-full border-b-2 border-black pt-3 pb-2 px-4 flex flex-col items-center justify-center transition-colors"
      >
        <h1 
          className="font-black tracking-widest text-[28px] sm:text-[30px] leading-tight"
          style={{ fontFamily: "'Cairo', sans-serif", color: headerText }}
        >
          مركز تدريب المجندين
        </h1>
        <div 
          className="w-11/12 h-[2px] mt-1"
          style={{ backgroundColor: dividerColor }}
        ></div>
      </div>

      {/* 2. Main Card Body */}
      <div className="flex-1 w-full px-5 py-3 flex items-center justify-between">
        
        {/* Left Side: Circular Recruit Photo */}
        <div className="w-[170px] flex flex-col items-center justify-center">
          <div className="w-[155px] h-[155px] rounded-full overflow-hidden border-2 border-slate-400 bg-slate-100 shadow-inner flex items-center justify-center">
            {recruit.photo_path ? (
              <img
                src={recruit.photo_path}
                alt={recruit.name}
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<span class="text-xs text-slate-500 font-bold">صورة المجند</span>';
                }}
              />
            ) : (
              <div className="text-center p-2 text-slate-400 font-medium text-xs">
                لا توجد صورة
              </div>
            )}
          </div>
        </div>

        {/* Center: Names, Company Badge, Police Number, Date, Address */}
        <div className="flex-1 flex flex-col items-center justify-center px-2 text-center">
          {/* First Name in huge bold text */}
          <div 
            className="text-black font-black text-[32px] sm:text-[36px] leading-none mb-1 tracking-wide"
            style={{ fontFamily: "'Cairo', sans-serif" }}
          >
            {firstName}
          </div>

          {/* Rest of full name */}
          <div className="text-black font-bold text-[17px] sm:text-[18px] mb-2 leading-tight">
            {restName || recruit.name}
          </div>

          {/* Company Badge (Color-coded with company) */}
          <div 
            style={{ backgroundColor: headerBg, borderColor: '#000000' }}
            className="border-2 px-6 py-1 rounded-[2px] shadow-sm mb-3 transition-colors"
          >
            <span 
              className="font-extrabold text-[15px] sm:text-[16px]"
              style={{ color: headerText }}
            >
              {companyLabel}
            </span>
          </div>

          {/* Identification Details in Traditional Font style */}
          <div className="w-full flex flex-col items-center space-y-0.5 text-black font-bold text-[14px] sm:text-[15px]">
            <div className="flex items-center justify-center gap-1">
              <span>رقم الشرطة</span>
              <span>:</span>
              <span className="font-mono font-black tracking-wider text-[16px]">{policeNumArabic}</span>
            </div>

            <div className="flex items-center justify-center gap-1">
              <span>ت . تجنيد</span>
              <span>:</span>
              <span className="font-mono">{dateArabic || '٢٠٢٦/٠١/١٥'}</span>
            </div>

            <div className="flex items-center justify-center gap-1 text-[13px] sm:text-[14px] truncate max-w-[280px]">
              <span>العنوان-:</span>
              <span className="truncate">{recruit.address || 'وسط الدلتا'}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Central Security Emblem & Region name */}
        <div className="w-[120px] flex flex-col items-center justify-center">
          <CentralSecurityEmblem className="w-24 h-24 drop-shadow-md" />
          <span 
            className="text-black font-extrabold text-[13px] sm:text-[14px] mt-2 text-center"
            style={{ fontFamily: "'Cairo', sans-serif" }}
          >
            منطقة وسط الدلتا
          </span>
        </div>

      </div>

      {/* Subtle cutting line guide at bottom */}
      <div className="w-full border-t border-dashed border-slate-300 h-0 print:block"></div>
    </div>
  );
});

LockerCard.displayName = 'LockerCard';
export default LockerCard;
