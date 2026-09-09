import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Trash2, 
  Edit3, 
  Video, 
  Camera, 
  User, 
  Calendar, 
  CreditCard, 
  Home, 
  Briefcase, 
  ShieldAlert, 
  Activity, 
  Users,
  CheckCircle2
} from 'lucide-react';

export default function RecruitModal({ recruit, onClose, onPrint, onDelete, onUpdate }) {
  if (!recruit) return null;

  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-darkslate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-4 bg-darkslate-850">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg">
              {recruit.name ? recruit.name[0] : 'م'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{recruit.name}</h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {recruit.batch_name}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                الرقم القومي: <span className="font-mono text-slate-200">{recruit.national_id}</span> • تاريخ الحضور: {recruit.attendance_date}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPrint(recruit)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الاستمارة الرسمية</span>
            </button>

            <button
              onClick={() => {
                if (confirm(`هل أنت متأكد من رغبتك في حذف ملف المجند "${recruit.name}"؟ هذا الإجراء نهائي.`)) {
                  onDelete(recruit.id);
                }
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700 transition-colors"
              title="حذف الملف"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - 2 Columns */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Media (Photo + 30s Video) */}
          <div className="space-y-4">
            
            {/* Recruit Photo */}
            <div className="bg-darkslate-850 border border-slate-800 rounded-2xl p-3 flex flex-col items-center">
              <span className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5 self-start">
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                الصورة الشخصية (كاميرا مباشرة)
              </span>
              <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
                {recruit.photo_path ? (
                  <img
                    src={recruit.photo_path}
                    alt={recruit.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                    <User className="w-12 h-12 mb-2 stroke-1" />
                    لا توجد صورة مسجلة
                  </div>
                )}
              </div>
            </div>

            {/* 30-Second Video Clip */}
            <div className="bg-darkslate-850 border border-slate-800 rounded-2xl p-3 flex flex-col">
              <span className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-rose-400" />
                مقطع الفيديو المرفق (30 ثانية)
              </span>
              <div className="w-full aspect-video rounded-xl overflow-hidden bg-black border border-slate-700">
                {recruit.video_path ? (
                  <video
                    src={recruit.video_path}
                    controls
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                    <Video className="w-10 h-10 mb-2 stroke-1 text-slate-600" />
                    لا يوجد مقطع فيديو مسجل
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Column: Full Official Dossier Fields (2 cols wide) */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* 1. البيانات الشخصية والتعليمية */}
            <div className="bg-darkslate-850 border border-slate-800 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                <User className="w-4 h-4" />
                البيانات الأساسية والتعليمية
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block">الديانة</span>
                  <span className="font-bold text-white text-sm">{recruit.religion}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">المؤهل الدراسي</span>
                  <span className="font-bold text-white text-sm">{recruit.qualification}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">تاريخ الميلاد</span>
                  <span className="font-bold text-white text-sm font-mono">{recruit.birth_date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">الحالة الاجتماعية / الزوجة</span>
                  <span className="font-bold text-white text-sm">{recruit.wife || 'أعزب'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">إجادة القراءة والكتابة</span>
                  <span className="font-bold text-white text-sm">{recruit.literacy}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">السفر خارج البلاد</span>
                  <span className="font-bold text-white text-sm">{recruit.travel_abroad}</span>
                </div>
              </div>
            </div>

            {/* 2. السكن والوظائف */}
            <div className="bg-darkslate-850 border border-slate-800 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-blue-400 flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                <Home className="w-4 h-4" />
                عنوان السكن والمهن
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="sm:col-span-3">
                  <span className="text-slate-400 block">عنوان السكن بالتفصيل</span>
                  <span className="font-bold text-white text-sm">{recruit.address}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">المهنة الحالية</span>
                  <span className="font-bold text-white text-sm">{recruit.current_job}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block">مهن وحرف أخرى</span>
                  <span className="font-bold text-white text-sm">{recruit.other_jobs}</span>
                </div>
              </div>
            </div>

            {/* 3. المناظرة والفحص الطبي */}
            <div className="bg-darkslate-850 border border-slate-800 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-amber-400 flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                <Activity className="w-4 h-4" />
                المناظرة الأمنية والفحص الطبي
              </h3>
              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-slate-400 block">مناظرة المجند (المظهر، البنية، العلامات المميزة، السلوك)</span>
                  <p className="font-semibold text-slate-100 bg-slate-900/80 p-2 rounded-xl mt-1 border border-slate-800">
                    {recruit.inspection}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block">الحالة المرضية للمجند</span>
                  <p className="font-semibold text-slate-100 bg-slate-900/80 p-2 rounded-xl mt-1 border border-slate-800">
                    {recruit.medical_status}
                  </p>
                </div>
              </div>
            </div>

            {/* 4. بيانات العائلة والتحريات الجنائية والسياسية */}
            <div className="bg-darkslate-850 border border-slate-800 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-purple-400 flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                <ShieldAlert className="w-4 h-4" />
                بيانات الأسرة والفحص الأمني والسياسي
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block">اسم الوالد ومهنته</span>
                  <span className="font-bold text-white">{recruit.father_name} ({recruit.father_job})</span>
                </div>
                <div>
                  <span className="text-slate-400 block">اسم الأم ومهنتها</span>
                  <span className="font-bold text-white">{recruit.mother_name} ({recruit.mother_job})</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block">فحص الإخوة والأخوات</span>
                  <p className="font-semibold text-slate-200 bg-slate-900/80 p-2 rounded-xl mt-1 border border-slate-800">
                    {recruit.siblings_check}
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block">الحالة الاجتماعية للعائلة</span>
                  <span className="font-bold text-white">{recruit.family_social_status}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block">الحالة السياسية والجنائية للعائلة</span>
                  <p className="font-bold text-emerald-300 bg-emerald-500/10 p-2 rounded-xl mt-1 border border-emerald-500/20">
                    {recruit.family_security_status}
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
