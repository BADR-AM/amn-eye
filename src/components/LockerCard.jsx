import React, { forwardRef } from 'react';
import { getCompanyColorConfig } from '../utils/companyColors';
import centralSecurityLogo from '../assets/central_security_logo.png';

// Helper to convert Western digits to Eastern Arabic numerals (١٢٣٤٥٦٧٨٩٠)
export const toArabicNumerals = (str) => {
  if (!str && str !== 0) return '';
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(str).replace(/[0-9]/g, (d) => arabicDigits[d]);
};

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

        {/* Right Side: Official Central Security Emblem & Region name */}
        <div className="w-[125px] flex flex-col items-center justify-center">
          <img 
            src={centralSecurityLogo} 
            alt="شعار الأمن المركزي" 
            className="w-[95px] h-[115px] object-contain drop-shadow-sm select-none"
          />
          <span 
            className="text-black font-extrabold text-[13px] sm:text-[14px] mt-1 text-center leading-tight tracking-tight"
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
