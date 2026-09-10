import { 
  X, 
  Printer, 
  Eye, 
  Camera, 
  Video,
  IdCard,
  FileText,
  Scan,
  ShieldAlert
} from 'lucide-react';

export default function SideInvestigationPanel({ 
  recruit, 
  onClose, 
  onOpenFullDossier, 
  onPrint,
  onOpenLockerCard,
  onOpenDocuments,
  onOpenTickets,
  onOpenPsychological
}) {
  if (!recruit) return null;

  return (
    <div className="w-full bg-darkslate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col transition-all duration-300">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-darkslate-850">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-sm border border-emerald-500/30">
            {recruit.name ? recruit.name[0] : 'م'}
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white truncate max-w-[200px]">{recruit.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
              <span className="text-emerald-400 font-bold">{recruit.batch_name}</span>
              {recruit.police_number && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-orange-400 font-mono font-bold">ش: {recruit.police_number}</span>
                </>
              )}
              {recruit.company && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-orange-300 truncate max-w-[100px]">{recruit.company}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          title="إغلاق اللوحة الجانبية"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body Content */}
      <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-280px)] text-xs">
        
        {/* Media row: Photo & Video Preview */}
        <div className="grid grid-cols-2 gap-2">
          {/* Photo */}
          <div className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-800 border border-slate-700 relative">
            {recruit.photo_path ? (
              <img src={recruit.photo_path} alt={recruit.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-[10px]">
                <Camera className="w-5 h-5 mb-1" />
                بدون صورة
              </div>
            )}
            <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
              صورة شخصية
            </span>
          </div>

          {/* Video */}
          <div className="aspect-[4/3] rounded-xl overflow-hidden bg-black border border-slate-700 relative">
            {recruit.video_path ? (
              <video src={recruit.video_path} controls className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-[10px]">
                <Video className="w-5 h-5 mb-1" />
                بدون فيديو
              </div>
            )}
            <span className="absolute bottom-1 right-1 bg-black/70 text-rose-300 text-[9px] px-1.5 py-0.5 rounded font-bold">
              فيديو 30ث
            </span>
          </div>
        </div>

        {/* Quick Details List */}
        <div className="space-y-2">
          
          <div className="bg-darkslate-850 p-2.5 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] block">الرقم القومي والميلاد</span>
            <div className="flex justify-between items-center font-mono font-bold text-slate-200">
              <span>{recruit.national_id}</span>
              <span>{recruit.birth_date}</span>
            </div>
          </div>

          <div className="bg-darkslate-850 p-2.5 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] block">المؤهل والمهنة</span>
            <div className="font-bold text-white text-xs">{recruit.qualification}</div>
            <div className="text-slate-400 text-[11px]">{recruit.current_job || 'بدون عمل'}</div>
          </div>

          <div className="bg-darkslate-850 p-2.5 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] block">عنوان السكن</span>
            <div className="font-semibold text-slate-200 text-xs">{recruit.address}</div>
          </div>

          <div className="bg-darkslate-850 p-2.5 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] block">المناظرة والفحص الطبي</span>
            <div className="text-emerald-400 font-bold text-[11px]">{recruit.medical_status}</div>
            <p className="text-slate-300 text-[11px] line-clamp-2">{recruit.inspection}</p>
          </div>

          <div className="bg-darkslate-850 p-2.5 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] block">الحالة الأمنية والسياسية</span>
            <div className="text-slate-200 font-bold text-[11px] line-clamp-2">{recruit.family_security_status}</div>
          </div>

        </div>

      </div>

      {/* Footer Action Buttons */}
      <div className="p-4 border-t border-slate-800 bg-darkslate-850 space-y-2">
        {/* Ticket & Suspicion Alerts Button */}
        <button
          onClick={() => onOpenTickets?.(recruit)}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
            recruit.open_tickets_count > 0
              ? 'bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border-rose-500/50 shadow-md'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>التيكتات وبلاغات الاشتباه</span>
          </div>
          {recruit.open_tickets_count > 0 ? (
            <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
              {recruit.open_tickets_count} نشط
            </span>
          ) : (
            <span className="text-[10px] text-slate-400">إضافة تيكت +</span>
          )}
        </button>

        {/* Psychological Follow-up Button */}
        <button
          onClick={() => onOpenPsychological?.(recruit)}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
            recruit.is_psychological_case
              ? 'bg-fuchsia-950/60 hover:bg-fuchsia-900/80 text-fuchsia-300 border-fuchsia-500/50 shadow-md'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">🧠</span>
            <span>المتابعة النفسية والعصبية</span>
          </div>
          {recruit.is_psychological_case ? (
            <span className="bg-fuchsia-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
              حالة متابعة
            </span>
          ) : (
            <span className="text-[10px] text-slate-400">تسجيل / فحص</span>
          )}
        </button>

        <button
          onClick={() => onOpenDocuments?.(recruit)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-bold text-xs border border-blue-500/30 transition-all"
        >
          <Scan className="w-4 h-4 text-blue-400" />
          <span>وثيقة التعارف وأصل السجل العسكري</span>
          {(recruit.id_doc_front_path || recruit.id_doc_back_path) && (
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          )}
        </button>

        <button
          onClick={() => onOpenLockerCard?.(recruit)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 font-bold text-xs border border-orange-500/30 transition-all"
        >
          <IdCard className="w-4 h-4 text-orange-400" />
          <span>معاينة وتصدير كارت الدولاب</span>
        </button>

        <button
          onClick={() => onPrint(recruit)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة الاستمارة الرسمية A4</span>
        </button>

        <button
          onClick={() => onOpenFullDossier(recruit)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs border border-slate-700 transition-all"
        >
          <Eye className="w-4 h-4" />
          <span>عرض الملف الكامل (Dossier)</span>
        </button>
      </div>

    </div>
  );
}
