import React from 'react';
import { Printer, X, Download, Shield } from 'lucide-react';
import centralSecurityLogo from '../assets/central_security_logo.png';

export default function OfficialReport({ recruit, onClose }) {
  if (!recruit) return null;

  const handlePrint = () => {
    window.print();
  };

  // Format attendance date
  const attendanceDate = recruit.attendance_date || '  /  / 2026';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-start p-4 sm:p-8 overflow-y-auto">
      
      {/* Top action bar - Hidden during print */}
      <div className="w-full max-w-4xl flex items-center justify-between bg-darkslate-900 border border-slate-800 p-4 rounded-2xl mb-6 shadow-2xl no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">معاينة طباعة استمارة الفحص الرسمية (A4)</h3>
            <p className="text-xs text-slate-400">مطابقة للترويسة الحكومية المعتمدة لمركز تدريب المجندين</p>
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
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Official A4 Document Sheet */}
      <div className="w-full max-w-[210mm] min-h-[297mm] bg-white text-black p-[12mm] shadow-2xl rounded-sm border border-slate-300 font-sans print:border-none print:shadow-none print:p-0 print:m-0 print:w-full print:text-[13px]">
        
        {/* Official Header */}
        <div className="relative border-b-2 border-black pb-2 mb-2">
          
          {/* Central Security Shield Logo in Right Corner */}
          <div className="absolute right-0 top-0 w-24 h-28 flex flex-col items-center justify-center">
            <img 
              src={centralSecurityLogo} 
              alt="شعار الأمن المركزي" 
              className="w-20 h-24 object-contain"
            />
          </div>

          {/* Right/Center Hierarchy */}
          <div className="text-center font-bold space-y-0.5">
            <h2 className="text-lg tracking-wider font-extrabold">وزارة الداخليـــــة</h2>
            <h3 className="text-base font-bold">الإدارة العامة للأمن المركزي</h3>
            <h4 className="text-sm font-bold">منطقة وسط الدلتا</h4>
            <h4 className="text-sm font-bold">مركز تدريب المجندين</h4>
            <h5 className="text-xs font-semibold underline underline-offset-4">وحدة الأمن والتحريات</h5>
          </div>

          {/* Photo Box in Left Corner */}
          <div className="absolute left-0 top-0 w-24 h-32 border-2 border-black rounded flex flex-col items-center justify-center overflow-hidden bg-slate-50">
            {recruit.photo_path ? (
              <img
                src={recruit.photo_path}
                alt="صورة المجند"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-1 text-[11px] text-slate-500 font-bold">
                صورة المجند<br />الشخصية
              </div>
            )}
          </div>

          {/* Report Title */}
          <div className="text-center mt-4">
            <span className="inline-block border-2 border-black px-6 py-1 text-base font-extrabold bg-slate-100/50">
              ,, تقرير فحص مجند مستجد حضور &nbsp;&nbsp; {attendanceDate} &nbsp;&nbsp; ,,
            </span>
            <div className="text-xs font-bold text-slate-700 mt-1">
              {recruit.batch_name || ''}
            </div>
          </div>
        </div>

        {/* Form Body - Line by Line with Dotted Leader lines exactly like the user's paper */}
        <div className="text-[14px] leading-[1.7] font-medium space-y-1">
          
          {/* الاسم */}
          <div className="flex items-baseline">
            <span className="font-bold min-w-[80px]">الاســـــم :ـ</span>
            <span className="font-extrabold text-base border-b border-black border-dashed flex-1 px-2">
              {recruit.name}
            </span>
          </div>

          {/* الديانة والمؤهل */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-baseline">
              <span className="font-bold min-w-[80px]">الديانــــة :ـ</span>
              <span className="font-bold border-b border-black border-dashed flex-1 px-2">
                {recruit.religion}
              </span>
            </div>
            <div className="flex items-baseline">
              <span className="font-bold min-w-[80px]">المؤهـــل :ـ</span>
              <span className="font-bold border-b border-black border-dashed flex-1 px-2">
                {recruit.qualification}
              </span>
            </div>
          </div>

          {/* تاريخ الميلاد والزوجة */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-baseline">
              <span className="font-bold min-w-[100px]">تاريخ الميلاد :ـ</span>
              <span className="font-bold border-b border-black border-dashed flex-1 px-2 font-mono">
                {recruit.birth_date}
              </span>
            </div>
            <div className="flex items-baseline">
              <span className="font-bold min-w-[80px]">الزوجـــــة :ـ</span>
              <span className="font-bold border-b border-black border-dashed flex-1 px-2">
                {recruit.wife || 'أعزب'}
              </span>
            </div>
          </div>

          {/* رقم البطاقة */}
          <div className="flex items-baseline">
            <span className="font-bold min-w-[100px]">رقم البطاقـة :ـ</span>
            <span className="font-extrabold text-base border-b border-black border-dashed flex-1 px-2 font-mono tracking-widest">
              {recruit.national_id}
            </span>
          </div>

          {/* عنوان السكن */}
          <div className="flex items-baseline">
            <span className="font-bold min-w-[100px]">عنوان السكن :ـ</span>
            <span className="font-bold border-b border-black border-dashed flex-1 px-2">
              {recruit.address}
            </span>
          </div>

          {/* المهنة الحالية */}
          <div className="flex items-baseline">
            <span className="font-bold min-w-[100px]">المهنة الحالية :ـ</span>
            <span className="font-bold border-b border-black border-dashed flex-1 px-2">
              {recruit.current_job}
            </span>
          </div>

          {/* مهن أخرى */}
          <div className="flex items-baseline">
            <span className="font-bold min-w-[100px]">مهـــن أخرى :ـ</span>
            <span className="font-bold border-b border-black border-dashed flex-1 px-2">
              {recruit.other_jobs}
            </span>
          </div>

          {/* السفر خارج البلاد */}
          <div className="flex items-baseline">
            <span className="font-bold min-w-[130px]">السفر خارج البلاد :ـ</span>
            <span className="font-bold border-b border-black border-dashed flex-1 px-2">
              {recruit.travel_abroad}
            </span>
          </div>

          {/* إجادة القراءة والكتابة */}
          <div className="flex items-baseline">
            <span className="font-bold min-w-[150px]">إجادة القراءة والكتابة :ـ</span>
            <span className="font-bold border-b border-black border-dashed flex-1 px-2">
              {recruit.literacy}
            </span>
          </div>

          {/* مناظرة المجند */}
          <div className="pt-1">
            <div className="font-bold">مناظرة المـجند :ـ</div>
            <div className="border border-black p-2 min-h-[50px] font-bold text-sm bg-slate-50/50 mt-1">
              {recruit.inspection}
            </div>
          </div>

          {/* الحالة المرضية للمجند */}
          <div className="pt-1">
            <div className="font-bold">الحالة المرضية للمجند :ـ</div>
            <div className="border border-black p-2 min-h-[40px] font-bold text-sm bg-slate-50/50 mt-1">
              {recruit.medical_status}
            </div>
          </div>

          {/* بيانات الوالد */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="flex items-baseline">
              <span className="font-bold min-w-[80px]">اسم الوالد :ـ</span>
              <span className="font-bold border-b border-black border-dashed flex-1 px-2">
                {recruit.father_name}
              </span>
            </div>
            <div className="flex items-baseline">
              <span className="font-bold min-w-[80px]">المهنــــة :ـ</span>
              <span className="font-bold border-b border-black border-dashed flex-1 px-2">
                {recruit.father_job}
              </span>
            </div>
          </div>

          {/* بيانات الأم */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-baseline">
              <span className="font-bold min-w-[80px]">أسم الأم :ـ</span>
              <span className="font-bold border-b border-black border-dashed flex-1 px-2">
                {recruit.mother_name}
              </span>
            </div>
            <div className="flex items-baseline">
              <span className="font-bold min-w-[80px]">المهنــــة :ـ</span>
              <span className="font-bold border-b border-black border-dashed flex-1 px-2">
                {recruit.mother_job}
              </span>
            </div>
          </div>

          {/* فحص الأخوات */}
          <div className="pt-1">
            <div className="font-bold">فحص الإخـوة والأخوات :ـ</div>
            <div className="border border-black p-2 min-h-[40px] font-bold text-sm bg-slate-50/50 mt-1">
              {recruit.siblings_check}
            </div>
          </div>

          {/* الحالة الاجتماعية للعائلة */}
          <div className="pt-1">
            <div className="font-bold">الحالة الاجتماعية للعائلة :ـ</div>
            <div className="border border-black p-2 min-h-[40px] font-bold text-sm bg-slate-50/50 mt-1">
              {recruit.family_social_status}
            </div>
          </div>

          {/* الحالة السياسية والجنائية للعائلة */}
          <div className="pt-1">
            <div className="font-bold">الحالة السياسية والجنائية للعائلة :ـ</div>
            <div className="border border-black p-2 min-h-[40px] font-bold text-sm bg-slate-50/50 mt-1">
              {recruit.family_security_status}
            </div>
          </div>

        </div>

        {/* Official Signatures & Approval Footer */}
        <div className="mt-6 pt-3 border-t-2 border-black grid grid-cols-3 gap-4 text-center text-xs font-bold">
          <div>
            <div>محقق الفحص</div>
            <div className="mt-6">..................................</div>
          </div>
          <div>
            <div>رئيس وحدة الأمن والتحريات</div>
            <div className="mt-6">..................................</div>
          </div>
          <div>
            <div>يعتمد / قائد مركز تدريب المجندين</div>
            <div className="mt-6">..................................</div>
          </div>
        </div>

      </div>

    </div>
  );
}
