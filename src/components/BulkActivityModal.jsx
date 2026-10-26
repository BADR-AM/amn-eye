import React, { useState } from 'react';
import { 
  X, 
  Stethoscope, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Send, 
  ArrowRight, 
  UserCheck, 
  Users, 
  FileText,
  Loader2
} from 'lucide-react';
import { authHeaders } from '../utils/auth';

const COMMON_DESTINATIONS = [
  'مستشفى الشرطة بطنطا',
  'مستشفى الشرطة بالعجوزة',
  'مستشفى الشرطة بمدينة نصر',
  'مستشفى طنطا الجامعي',
  'مجمع العيادات التخصصية',
  'مأمورية ترحيل وخدمات خارجية',
  'مركز تدريب خارجي'
];

const COMMON_DECISIONS = [
  'لائق واستكمال التدريب بالمركز',
  'راحة طبية داخلية 24 ساعة',
  'راحة طبية 48 ساعة بالسرية',
  'راحة طبية 3 أيام',
  'حجز واستمرار الرعاية بالمستشفى',
  'إعادة العرض والمتابعة بعد أسبوع',
  'إنجاز المأمورية بنجاح والعودة للمقر'
];

export default function BulkActivityModal({
  isOpen,
  onClose,
  recruits = [],
  selectedRecruitIds = [],
  onSuccess
}) {
  if (!isOpen) return null;

  // Filter selected recruit objects
  const selectedRecruits = recruits.filter(r => selectedRecruitIds.includes(r.id));
  const activeOpenCount = selectedRecruits.filter(r => r.active_activity).length;

  // Mode: 'dispatch' (قيام) | 'return' (عودة)
  const [mode, setMode] = useState(activeOpenCount > 0 && activeOpenCount === selectedRecruits.length ? 'return' : 'dispatch');

  // Form State - Dispatch
  const [activityType, setActivityType] = useState('medical_referral');
  const [destination, setDestination] = useState(COMMON_DESTINATIONS[0]);
  const [departureDate, setDepartureDate] = useState(new Date().toISOString().slice(0, 16));
  const [diagnosis, setDiagnosis] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [officerName, setOfficerName] = useState('');

  // Form State - Return
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 16));
  const [medicalDecision, setMedicalDecision] = useState(COMMON_DECISIONS[0]);
  const [returnDiagnosis, setReturnDiagnosis] = useState('');
  const [returnNotes, setReturnNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Submit Dispatch
  const handleDispatch = async (e) => {
    e.preventDefault();
    if (selectedRecruitIds.length === 0) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/recruits/bulk-activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          recruit_ids: selectedRecruitIds,
          activity_type: activityType,
          destination,
          departure_date: departureDate,
          diagnosis,
          notes: dispatchNotes,
          officer_name: officerName
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'فشل تسجيل القيام الجماعي');
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء تسجيل القيام');
    } finally {
      setLoading(false);
    }
  };

  // Submit Return
  const handleReturn = async (e) => {
    e.preventDefault();
    if (selectedRecruitIds.length === 0) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/recruits/bulk-activities/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          recruit_ids: selectedRecruitIds,
          return_date: returnDate,
          medical_decision: medicalDecision,
          diagnosis: returnDiagnosis,
          notes: returnNotes
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'فشل تسجيل العودة');
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء تسجيل العودة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
      <div className="bg-[#161616] border border-[#333] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-[#2c2c2c] bg-[#1a1a1a] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>إدارة تحركات المستشفيات والمأموريات</span>
                <span className="text-xs bg-red-950 text-red-300 px-2 py-0.5 border border-red-800">
                  {selectedRecruitIds.length} مجند محدد
                </span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                تسجيل إحالة طبية أو مأمورية خارجية مع إبقاء التذكرة مفتوحة لحين تسجيل العودة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2c2c2c] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: قيام vs عودة */}
        <div className="grid grid-cols-2 border-b border-[#2c2c2c] bg-[#121212]">
          <button
            type="button"
            onClick={() => setMode('dispatch')}
            className={`py-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
              mode === 'dispatch'
                ? 'border-red-500 text-white bg-[#1f1616]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Send className="w-4 h-4 text-red-400" />
            <span>تسجيل قيام / إحالة طبية (فتح تذكرة)</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('return')}
            className={`py-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
              mode === 'return'
                ? 'border-emerald-500 text-white bg-[#131f16]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>تسجيل عودة للمركز (إغلاق التذكرة)</span>
          </button>
        </div>

        {/* Selected Recruits Badges Preview */}
        <div className="p-3.5 bg-[#1a1a1a] border-b border-[#262626] flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-gray-400 shrink-0 font-bold flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            المجندين:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {selectedRecruits.slice(0, 8).map(r => (
              <span key={r.id} className="bg-[#242424] border border-[#383838] px-2 py-0.5 text-gray-200 text-[11px] font-semibold flex items-center gap-1">
                <span>{r.name}</span>
                {r.active_activity && (
                  <span className="text-[10px] text-amber-400 font-bold" title="له تذكرة مفتوحة حالياً">
                    (🏥 خارج المعسكر)
                  </span>
                )}
              </span>
            ))}
            {selectedRecruits.length > 8 && (
              <span className="text-[11px] text-gray-400 px-1 font-bold">
                +{selectedRecruits.length - 8} آخرين
              </span>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="m-4 p-3 bg-red-950/70 border border-red-700 text-red-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {mode === 'dispatch' ? (
            <form id="dispatch-form" onSubmit={handleDispatch} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 font-bold mb-1.5">نوع التحرك / الإحالة:</label>
                  <select
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value)}
                    className="w-full bg-[#202020] border border-[#3e3e3e] text-white p-2.5 focus:border-red-500 focus:outline-none"
                  >
                    <option value="medical_referral">عرض بمستشفى الشرطة</option>
                    <option value="clinic">كشف بعيادات خارجية تخصصية</option>
                    <option value="mission">مأمورية أمنية / ترحيل</option>
                    <option value="administrative">مأمورية إدارية / تدريب خارجي</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-bold mb-1.5">تاريخ وساعة القيام:</label>
                  <input
                    type="datetime-local"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    className="w-full bg-[#202020] border border-[#3e3e3e] text-white p-2 focus:border-red-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-bold mb-1.5">جهة التحرك / المستشفى:</label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="مثال: مستشفى الشرطة بطنطا..."
                  className="w-full bg-[#202020] border border-[#3e3e3e] text-white p-2.5 focus:border-red-500 focus:outline-none mb-2"
                  required
                />
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_DESTINATIONS.map(dest => (
                    <button
                      key={dest}
                      type="button"
                      onClick={() => setDestination(dest)}
                      className={`text-[11px] px-2 py-0.5 border transition-all ${
                        destination === dest 
                          ? 'bg-red-950 border-red-500 text-red-200 font-bold' 
                          : 'bg-[#222] border-[#333] text-gray-400 hover:text-white'
                      }`}
                    >
                      {dest}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 font-bold mb-1.5">الشكوى / التشخيص المبدئي:</label>
                  <input
                    type="text"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="مثال: آلام حادة بالصدر، رمد، اشتباه كسر..."
                    className="w-full bg-[#202020] border border-[#3e3e3e] text-white p-2.5 focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-bold mb-1.5">الضابط / المشرف المسؤول:</label>
                  <input
                    type="text"
                    value={officerName}
                    onChange={(e) => setOfficerName(e.target.value)}
                    placeholder="اسم / رتبة مسؤول التحرك..."
                    className="w-full bg-[#202020] border border-[#3e3e3e] text-white p-2.5 focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-bold mb-1.5">ملاحظات التحرك (اختياري):</label>
                <textarea
                  rows={2}
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="أي تعليمات أو ملاحظات أمنية بخصوص المأمورية..."
                  className="w-full bg-[#202020] border border-[#3e3e3e] text-white p-2.5 focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-red-950/30 border border-red-900/60 text-red-300 text-[11px] flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-400 shrink-0" />
                <span>
                  تنبيه: سيتم فتح تذكرة نشطة لكل مجند محدد، وستظهر فورياً في شاشة الإحصائيات (بمستشفى الشرطة حالياً) ولن تُغلق حتى يتم تسجيل العودة.
                </span>
              </div>

            </form>
          ) : (
            <form id="return-form" onSubmit={handleReturn} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 font-bold mb-1.5">تاريخ وساعة العودة للمركز:</label>
                  <input
                    type="datetime-local"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="w-full bg-[#202020] border border-[#3e3e3e] text-white p-2 focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-bold mb-1.5">القرار الطبي / نتيجة المأمورية:</label>
                  <select
                    value={medicalDecision}
                    onChange={(e) => setMedicalDecision(e.target.value)}
                    className="w-full bg-[#202020] border border-[#3e3e3e] text-white p-2.5 focus:border-emerald-500 focus:outline-none"
                  >
                    {COMMON_DECISIONS.map(dec => (
                      <option key={dec} value={dec}>{dec}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-bold mb-1.5">التشخيص النهائي من المستشفى (إن وجد):</label>
                <input
                  type="text"
                  value={returnDiagnosis}
                  onChange={(e) => setReturnDiagnosis(e.target.value)}
                  placeholder="مثال: كدمة خفيفة، تم عمل أشعة، سليم مع راحة..."
                  className="w-full bg-[#202020] border border-[#3e3e3e] text-white p-2.5 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-bold mb-1.5">ملاحظات تقرير العودة:</label>
                <textarea
                  rows={2}
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="أي توصيات أو تعليمات متابعة بالسرية..."
                  className="w-full bg-[#202020] border border-[#3e3e3e] text-white p-2.5 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-emerald-950/30 border border-emerald-900/60 text-emerald-300 text-[11px] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  عند الضغط على تأكيد العودة، سيتم إغلاق التذاكر المفتوحة للمجندين المحددين وعودتهم للقوة الحاضرة بالمركز وتحديث الإحصائيات فورياً.
                </span>
              </div>

            </form>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#2c2c2c] bg-[#1a1a1a] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#383838] text-gray-300 text-xs font-semibold border border-[#444]"
          >
            إلغاء
          </button>

          {mode === 'dispatch' ? (
            <button
              type="submit"
              form="dispatch-form"
              disabled={loading || selectedRecruitIds.length === 0}
              className="px-6 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري تسجيل القيام...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>تأكيد قيام الـ ({selectedRecruitIds.length}) مجند وبدء التذكرة</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="submit"
              form="return-form"
              disabled={loading || selectedRecruitIds.length === 0}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري تسجيل العودة...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد عودة الـ ({selectedRecruitIds.length}) مجند وإغلاق التذكرة</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
