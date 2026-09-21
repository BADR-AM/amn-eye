import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Printer, X, Download, Shield } from 'lucide-react';
import centralSecurityLogo from '../assets/central_security_logo.png';
import { getUser } from '../utils/auth';

// Helper to derive a clean 6-character alphanumeric fingerprint if not provided
const getAccountFingerprint = (user) => {
  if (!user) return 'SYS001';
  if (user.account_fingerprint && user.account_fingerprint.trim().length >= 4) {
    return user.account_fingerprint.trim().toUpperCase();
  }
  const source = `${user.username || 'user'}-${user.id || 1}-${user.role || 'op'}`;
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = ((hash << 5) - hash) + source.charCodeAt(i);
    hash |= 0;
  }
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = (user.role === 'admin' ? 'AD' : (user.role === 'officer' ? 'OF' : 'OP'));
  let n = Math.abs(hash);
  while (result.length < 6) {
    result += chars[n % chars.length];
    n = Math.floor(n / chars.length) + 7;
  }
  return result.substring(0, 6);
};

// Dynamic text scaling for single line fields
const DynamicFieldLine = ({ label, value, minLabelWidth = "min-w-[75px]", highlight = false, isMono = false }) => {
  const text = (value || '').trim();
  const len = text.length;

  let fontClass = "text-[12.5px]";
  if (len > 50) {
    fontClass = "text-[9.5px] leading-tight";
  } else if (len > 30) {
    fontClass = "text-[11px] leading-tight";
  }

  return (
    <div className="flex items-baseline overflow-hidden leading-tight">
      <span className={`font-bold shrink-0 text-[12.5px] ${minLabelWidth}`}>{label} :ـ</span>
      <span className={`border-b border-black border-dashed flex-1 px-1.5 truncate ${fontClass} ${highlight ? 'font-extrabold' : 'font-bold'} ${isMono ? 'font-mono' : ''}`}>
        {text || 'ـ'}
      </span>
    </div>
  );
};

// Dynamic text scaling for inspection / medical / family status boxes
const DynamicTextBox = ({ title, text, minHeight = "min-h-[22px]" }) => {
  const val = (text || '').trim();
  const len = val.length;

  let fontClass = "text-[11px] leading-snug";
  if (len > 120) {
    fontClass = "text-[8.5px] leading-tight";
  } else if (len > 60) {
    fontClass = "text-[9.5px] leading-tight";
  }

  return (
    <div className="pt-0.5">
      <div className="font-bold text-[11.5px] leading-none mb-0.5">{title} :ـ</div>
      <div className={`border border-black px-2 py-1 ${minHeight} max-h-[38px] overflow-hidden ${fontClass} font-bold bg-slate-50/40 break-words`}>
        {val || 'ـ'}
      </div>
    </div>
  );
};

export default function OfficialReport({ recruit, currentUser: propCurrentUser, onClose }) {
  const currentUser = propCurrentUser || getUser();
  const accountFingerprint = getAccountFingerprint(currentUser);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!recruit) return null;

  const handlePrint = () => {
    window.print();
  };

  // Format attendance date
  const attendanceDate = recruit.attendance_date || '  /  / 2026';

  const [qrCodeUrl, setQrCodeUrl] = useState('');

  // Generate official permanent QR Code for recruit report
  useEffect(() => {
    const permanentCode = recruit.national_id 
      ? recruit.national_id 
      : (recruit.recruit_code || `REC-${String(recruit.id).padStart(7, '0')}`);
    const payload = `SEC-EYE:REC:${permanentCode}`;
    QRCode.toDataURL(payload, {
      width: 180,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' }
    }).then(url => setQrCodeUrl(url)).catch(() => {});
  }, [recruit?.national_id, recruit?.recruit_code, recruit?.id]);

  return (
    <div className="official-report-overlay fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-start p-2 sm:p-6 overflow-y-auto" dir="rtl">
      
      {/* Top action bar - Hidden during print */}
      <div className="w-[210mm] max-w-full flex items-center justify-between bg-darkslate-900 border border-slate-800 p-3 sm:p-4 rounded-2xl mb-4 shadow-2xl no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">معاينة طباعة استمارة الفحص الرسمية (A4)</h3>
            <p className="text-xs text-slate-400">
              طباعة صفحة واحدة مؤمنة A4 • إصدار <span className="font-mono text-emerald-400 font-bold">VER 02.3</span> • بصمة الحساب: <span className="font-mono text-amber-300 font-bold">{accountFingerprint}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-950/60 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الاستمارة (Ctrl + P)</span>
          </button>

          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="إغلاق"
            aria-label="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Official A4 Document Sheet - Standard A4 210mm x 297mm */}
      <div className="official-report-sheet w-[210mm] max-w-full min-h-[297mm] bg-white text-black px-[12mm] py-[10mm] shadow-2xl rounded-sm border border-slate-300 font-sans flex flex-col justify-between box-border my-2">
        
        {/* 1. Official Header (Fixed Top) */}
        <div className="relative border-b-2 border-black pb-2 shrink-0 min-h-[38mm]">
          
          {/* Central Security Shield Logo in Right Corner */}
          <div className="absolute right-0 top-0 w-20 h-28 flex flex-col items-center justify-center">
            <img 
              src={centralSecurityLogo} 
              alt="شعار الأمن المركزي" 
              className="w-16 h-22 object-contain drop-shadow"
            />
          </div>

          {/* Right/Center Hierarchy */}
          <div className="text-center font-bold space-y-0 leading-tight pr-24 pl-32">
            <h2 className="text-base tracking-wider font-extrabold">وزارة الداخليـــــة</h2>
            <h3 className="text-sm font-bold">الإدارة العامة للأمن المركزي</h3>
            <h4 className="text-xs font-bold">منطقة وسط الدلتا • مركز تدريب المجندين</h4>
            <h5 className="text-[11px] font-semibold underline underline-offset-2">وحدة الأمن والتحريات</h5>
          </div>

          {/* Photo Box in Left Corner - Maximized space, standard 4x6 / 3.5x4.5 portrait ratio */}
          <div className="absolute left-0 top-0 w-[30mm] h-[38mm] border-2 border-black rounded-sm flex flex-col items-center justify-center overflow-hidden bg-slate-50 shadow-sm">
            {recruit.photo_path ? (
              <img
                src={recruit.photo_path}
                alt="صورة المجند"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-1 text-[10px] text-slate-500 font-bold flex flex-col items-center justify-center h-full">
                <span>صورة المجند<br />الشخصية</span>
              </div>
            )}
          </div>

          {/* Report Title Banner */}
          <div className="text-center mt-2 pr-24 pl-32">
            <span className="inline-block border-2 border-black px-5 py-0.5 text-[13px] font-black bg-slate-100/60 shadow-xs">
              ,, تقرير فحص مجند مستجد حضور &nbsp;&nbsp; {attendanceDate} &nbsp;&nbsp; ,,
            </span>
            <div className="text-[11px] font-bold text-slate-800 mt-0.5">
              {recruit.batch_name || ''} {recruit.company ? `• ${recruit.company}` : ''}
            </div>
          </div>
        </div>

        {/* 2. Form Body - Line by Line with Dynamic Text Fitting (Flexible Middle) */}
        <div className="flex-1 flex flex-col justify-between py-1 text-[12.5px] leading-tight space-y-0.5 overflow-hidden">
          
          {/* الاسم */}
          <DynamicFieldLine label="الاســـــم" value={recruit.name} minLabelWidth="min-w-[70px]" highlight={true} />

          {/* الديانة والمؤهل */}
          <div className="grid grid-cols-2 gap-3">
            <DynamicFieldLine label="الديانــــة" value={recruit.religion} minLabelWidth="min-w-[70px]" />
            <DynamicFieldLine label="المؤهـــل" value={recruit.qualification} minLabelWidth="min-w-[70px]" />
          </div>

          {/* تاريخ الميلاد والزوجة */}
          <div className="grid grid-cols-2 gap-3">
            <DynamicFieldLine label="تاريخ الميلاد" value={recruit.birth_date} minLabelWidth="min-w-[85px]" isMono={true} />
            <DynamicFieldLine label="الزوجـــــة" value={recruit.wife || 'أعزب'} minLabelWidth="min-w-[70px]" />
          </div>

          {/* رقم البطاقة */}
          <DynamicFieldLine label="رقم البطاقـة" value={recruit.national_id} minLabelWidth="min-w-[85px]" highlight={true} isMono={true} />

          {/* عنوان السكن */}
          <DynamicFieldLine label="عنوان السكن" value={recruit.address} minLabelWidth="min-w-[85px]" />

          {/* المهنة الحالية والمهن الأخرى */}
          <div className="grid grid-cols-2 gap-3">
            <DynamicFieldLine label="المهنة الحالية" value={recruit.current_job} minLabelWidth="min-w-[85px]" />
            <DynamicFieldLine label="مهـــن أخرى" value={recruit.other_jobs} minLabelWidth="min-w-[80px]" />
          </div>

          {/* السفر خارج البلاد وإجادة القراءة والكتابة */}
          <div className="grid grid-cols-2 gap-3">
            <DynamicFieldLine label="السفر خارج البلاد" value={recruit.travel_abroad} minLabelWidth="min-w-[105px]" />
            <DynamicFieldLine label="إجادة القراءة والكتابة" value={recruit.literacy} minLabelWidth="min-w-[125px]" />
          </div>

          {/* مناظرة المجند */}
          <DynamicTextBox title="مناظرة المـجند" text={recruit.inspection} minHeight="min-h-[20px]" />

          {/* الحالة المرضية للمجند */}
          <DynamicTextBox title="الحالة المرضية للمجند" text={recruit.medical_status} minHeight="min-h-[20px]" />

          {/* بيانات الوالد */}
          <div className="grid grid-cols-2 gap-3">
            <DynamicFieldLine label="اسم الوالد" value={recruit.father_name} minLabelWidth="min-w-[70px]" />
            <DynamicFieldLine label="المهنــــة" value={recruit.father_job} minLabelWidth="min-w-[65px]" />
          </div>

          {/* بيانات الأم */}
          <div className="grid grid-cols-2 gap-3">
            <DynamicFieldLine label="اسم الأم" value={recruit.mother_name} minLabelWidth="min-w-[70px]" />
            <DynamicFieldLine label="المهنــــة" value={recruit.mother_job} minLabelWidth="min-w-[65px]" />
          </div>

          {/* فحص الأخوات */}
          <DynamicTextBox title="فحص الإخـوة والأخوات" text={recruit.siblings_check} minHeight="min-h-[20px]" />

          {/* الحالة الاجتماعية للعائلة */}
          <DynamicTextBox title="الحالة الاجتماعية للعائلة" text={recruit.family_social_status} minHeight="min-h-[20px]" />

          {/* الحالة السياسية والجنائية للعائلة */}
          <DynamicTextBox title="الحالة السياسية والجنائية للعائلة" text={recruit.family_security_status} minHeight="min-h-[20px]" />

        </div>

        {/* 3. Official Signatures & Fixed Security Footer (Fixed Bottom) */}
        <div className="shrink-0 mt-auto pt-1.5 border-t-2 border-black">
          
          {/* 3 Official Signatures */}
          <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-bold pb-1.5">
            <div>
              <div>محقق الفحص</div>
              <div className="mt-3 text-slate-700">..................................</div>
            </div>
            <div>
              <div>رئيس وحدة الأمن والتحريات</div>
              <div className="mt-3 text-slate-700">..................................</div>
            </div>
            <div>
              <div>يعتمد / قائد مركز تدريب المجندين</div>
              <div className="mt-3 text-slate-700">..................................</div>
            </div>
          </div>

          {/* Fixed Security Verification Strip with QR Code & Account Fingerprint */}
          <div className="pt-1.5 border-t border-dashed border-black flex items-center justify-between text-[10px] leading-tight">
            <div className="flex items-center gap-2">
              {qrCodeUrl && (
                <img 
                  src={qrCodeUrl} 
                  alt="رمز التحقق الرقمي" 
                  className="w-[48px] h-[48px] border border-black p-0.5 shrink-0 bg-white"
                  style={{ width: '48px', height: '48px' }}
                />
              )}
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-black text-[10.5px]">وثيقة فحص رسمية مؤمنة رقمياً</span>
                  <span className="px-1 py-0.2 rounded bg-black text-white font-mono text-[9px] font-bold">
                    {recruit.recruit_code || `REC-${String(recruit.id).padStart(7, '0')}`}
                  </span>
                </div>
                <span className="font-mono text-[9.5px] text-slate-700">
                  الرقم القومي: {recruit.national_id || '------'} | رقم الشرطة: {recruit.police_number || '------'}
                </span>
                <span className="text-[9px] text-slate-800 font-mono font-bold flex items-center gap-1">
                  <span>SECURITY EYE • {new Date().toLocaleDateString('ar-EG')}</span>
                  <span className="text-black font-extrabold">• بصمة الحساب: [{accountFingerprint}]</span>
                </span>
              </div>
            </div>

            <div className="text-left font-mono text-[9px] text-slate-600 leading-tight">
              <div className="font-bold text-black">منظومة فحص وتسجيل المجندين</div>
              <div>VER 02.3 • قطاع الأمن المركزي</div>
              <div className="text-[8.5px] text-slate-700 font-bold">AUTH: [{accountFingerprint}]</div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
