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

  const cardElement = (
    <div
      ref={ref}
      style={{
        width: '640px',
        height: '380px',
        minWidth: '640px',
        minHeight: '380px',
        maxWidth: '640px',
        maxHeight: '380px',
        fontFamily: "'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif",
        letterSpacing: '0px',
        wordSpacing: '0px',
        direction: 'rtl',
      }}
      className={`relative bg-white text-black select-none overflow-hidden border-2 border-black shadow-md flex flex-col ${className}`}
      dir="rtl"
    >
      {/* 1. Header Bar: Color determined dynamically by company */}
      <div 
        style={{ backgroundColor: headerBg, color: headerText }}
        className="w-full border-b-2 border-black pt-2.5 pb-2 px-4 flex flex-col items-center justify-center transition-colors shrink-0"
      >
        <h1 
          className="font-black text-[27px] leading-tight m-0 text-center"
          style={{ fontFamily: "'Cairo', 'Segoe UI', Tahoma, sans-serif", color: headerText, letterSpacing: '0px' }}
        >
          مركز تدريب المجندين
        </h1>
        <div 
          className="w-11/12 h-[2px] mt-1"
          style={{ backgroundColor: dividerColor }}
        ></div>
      </div>

      {/* 2. Main Card Body */}
      <div className="flex-1 w-full px-5 py-2.5 flex items-center justify-between">
        
        {/* Left Side: Circular Recruit Photo */}
        <div className="w-[160px] flex flex-col items-center justify-center shrink-0">
          <div className="w-[145px] h-[145px] rounded-full overflow-hidden border-2 border-slate-400 bg-slate-100 shadow-inner flex items-center justify-center">
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
        <div className="flex-1 flex flex-col items-center justify-center px-2 text-center min-w-0">
          {/* First Name in huge bold text */}
          <div 
            className="text-black font-black text-[32px] leading-none mb-1 text-center"
            style={{ fontFamily: "'Cairo', 'Segoe UI', Tahoma, sans-serif", letterSpacing: '0px' }}
          >
            {firstName}
          </div>

          {/* Rest of full name */}
          <div 
            className="text-black font-bold text-[16px] mb-2 leading-tight text-center truncate max-w-[290px]"
            style={{ fontFamily: "'Cairo', 'Segoe UI', Tahoma, sans-serif", letterSpacing: '0px' }}
          >
            {restName || recruit.name}
          </div>

          {/* Company Badge (Color-coded with company) */}
          <div 
            style={{ backgroundColor: headerBg, borderColor: '#000000' }}
            className="border-2 px-5 py-1 rounded-[2px] shadow-sm mb-2.5 transition-colors inline-block"
          >
            <span 
              className="font-extrabold text-[14px]"
              style={{ color: headerText, fontFamily: "'Cairo', 'Segoe UI', Tahoma, sans-serif", letterSpacing: '0px' }}
            >
              {companyLabel}
            </span>
          </div>

          {/* Identification Details */}
          <div className="w-full flex flex-col items-center space-y-0.5 text-black font-bold text-[13.5px]">
            <div className="flex items-center justify-center gap-1.5" dir="rtl">
              <span style={{ fontFamily: "'Cairo', sans-serif", letterSpacing: '0px' }}>رقم الشرطة :</span>
              <span className="font-mono font-black text-[15px]">{policeNumArabic}</span>
            </div>

            <div className="flex items-center justify-center gap-1.5" dir="rtl">
              <span style={{ fontFamily: "'Cairo', sans-serif", letterSpacing: '0px' }}>ت . تجنيد :</span>
              <span className="font-mono">{dateArabic || '٢٠٢٦/٠١/١٥'}</span>
            </div>

            <div className="flex items-center justify-center gap-1 text-[12.5px] truncate max-w-[280px]" dir="rtl">
              <span className="shrink-0" style={{ fontFamily: "'Cairo', sans-serif", letterSpacing: '0px' }}>العنوان :</span>
              <span className="truncate" style={{ fontFamily: "'Cairo', sans-serif", letterSpacing: '0px' }}>{recruit.address || 'وسط الدلتا'}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Official Central Security Emblem & Region name */}
        <div className="w-[120px] flex flex-col items-center justify-center shrink-0">
          <img 
            src={centralSecurityLogo} 
            alt="شعار الأمن المركزي" 
            className="w-[90px] h-[110px] object-contain drop-shadow-sm select-none"
          />
          <span 
            className="text-black font-extrabold text-[13px] mt-1 text-center leading-tight"
            style={{ fontFamily: "'Cairo', 'Segoe UI', Tahoma, sans-serif", letterSpacing: '0px' }}
          >
            منطقة وسط الدلتا
          </span>
        </div>

      </div>

      {/* Subtle cutting line guide at bottom */}
      <div className="w-full border-t border-dashed border-slate-300 h-0 print:block"></div>
    </div>
  );

  if (scale && scale !== 1) {
    return (
      <div 
        style={{ 
          width: `${640 * scale}px`, 
          height: `${380 * scale}px`,
          overflow: 'hidden',
          display: 'inline-block'
        }}
      >
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top right' }}>
          {cardElement}
        </div>
      </div>
    );
  }

  return cardElement;
});

LockerCard.displayName = 'LockerCard';
export default LockerCard;
