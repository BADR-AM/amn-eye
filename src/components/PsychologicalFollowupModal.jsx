import React, { useState } from 'react';
import { 
  X, 
  Brain, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  Loader2, 
  Stethoscope,
  Activity,
  ClipboardList
} from 'lucide-react';
import { authHeaders } from '../utils/auth';

export default function PsychologicalFollowupModal({ 
  isOpen, 
  onClose, 
  recruit, 
  onUpdated 
}) {
  if (!isOpen || !recruit) return null;

  const [isCase, setIsCase] = useState(recruit.is_psychological_case === 1);
  const [assessment, setAssessment] = useState('مستقر حالياً وتحت المتابعة الدورية بالكتيبة');
  const [recommendation, setRecommendation] = useState('متابعة دورية مستمرة');
  const [notes, setNotes] = useState(recruit.psychological_notes || '');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');

    try {
      const fullNotes = `[تقييم: ${assessment}] - [القرار: ${recommendation}] ${notes ? ' - ' + notes : ''}`;
      const res = await fetch(`/api/recruits/${recruit.id}/psychological-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({
          is_psychological_case: isCase,
          psychological_notes: notes.trim(),
          followup_action: fullNotes
        })
      });

      if (!res.ok) throw new Error('فشل حفظ المتابعة النفسية');

      setSuccessMsg('تم حفظ وتحديث المتابعة النفسية الدورية للمجند بنجاح');
      if (onUpdated) onUpdated();
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <div className="bg-[#12161f] border border-fuchsia-500/40 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-[#181f2c] px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-fuchsia-500/20 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400 font-bold">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                ملف المتابعة النفسية والعصبية الدورية
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 font-mono font-bold">
                  متابعة مستمرة
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                المجند: <span className="text-white font-bold">{recruit.name}</span> • السرية: <span className="text-amber-400">{recruit.company || 'غير محددة'}</span>
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          
          {/* Status Toggle Box */}
          <div className="bg-slate-900/80 border border-slate-750 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-fuchsia-400" />
              <div>
                <span className="text-xs font-bold text-white block">تصنيف المجند: حالة نفسية وعصبية</span>
                <span className="text-[11px] text-slate-400">إدراجه ضمن كارت الحالات النفسية بالداشبورد للمتابعة الدورية</span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isCase}
                onChange={(e) => setIsCase(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fuchsia-600"></div>
            </label>
          </div>

          {/* Regular Assessment Details */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                تقييم الحالة والسلوك في جلسة المتابعة:
              </label>
              <select
                value={assessment}
                onChange={(e) => setAssessment(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-fuchsia-500 focus:outline-none"
              >
                <option value="مستقر حالياً وتحت المتابعة الدورية بالكتيبة">مستقر حالياً وتحت المتابعة الدورية بالكتيبة</option>
                <option value="نوبات قلق وهلع وتوتر عصبي">نوبات قلق وهلع وتوتر عصبي</option>
                <option value="سلوك انطوائي وعزلة شديدة">سلوك انطوائي وعزلة شديدة</option>
                <option value="سلوك عدواني وعصبية مفرطة مع الزملاء">سلوك عدواني وعصبية مفرطة مع الزملاء</option>
                <option value="اشتباه صرع أو تشنجات">اشتباه صرع أو تشنجات</option>
                <option value="أفكار غير سوية أو ميول إيذاء النفس">أفكار غير سوية أو ميول إيذاء النفس (أولوية قصوى)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                القرار والتوجيه الأمني / الطبي:
              </label>
              <select
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-fuchsia-500 focus:outline-none font-semibold text-fuchsia-300"
              >
                <option value="متابعة دورية مستمرة بالسرية">متابعة دورية مستمرة بالسرية</option>
                <option value="حظر تسليحه أو وضعه في خدمات حراسة منفردة">حظر تسليحه أو وضعه في خدمات حراسة منفردة (هام)</option>
                <option value="عرض فوري على استشاري الطب النفسي بمستشفى الشرطة">عرض فوري على استشاري الطب النفسي بمستشفى الشرطة</option>
                <option value="راحة طبية وعزل مؤقت بالعيادة">راحة طبية وعزل مؤقت بالعيادة</option>
                <option value="استدعاء ولي الأمر للمناظرة">استدعاء ولي الأمر للمناظرة</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                ملاحظات المتابعة الدورية المفصلة:
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="سجل ملاحظات المشرفين، ردود أفعاله، الأدوية الموصوفة، أو تاريخ الاستدعاء القادم..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:border-fuchsia-500 focus:outline-none leading-relaxed"
              />
            </div>
          </div>

          {successMsg && (
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-fuchsia-950/40 flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>حفظ وقيد المتابعة الدورية</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
