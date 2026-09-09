import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  CheckCircle2, 
  Plus, 
  Layers, 
  Users, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { authHeaders } from '../utils/auth';

export default function BatchesModal({ 
  batches, 
  activeBatch, 
  onSetActiveBatch, 
  onClose,
  onRefresh 
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBatchYear, setNewBatchYear] = useState(2026);
  const [newBatchMonth, setNewBatchMonth] = useState(1);
  const [newBatchNotes, setNewBatchNotes] = useState('');
  const [error, setError] = useState('');

  const monthsMap = {
    1: 'يناير',
    4: 'أبريل',
    7: 'يوليو',
    10: 'أكتوبر'
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    const monthName = monthsMap[newBatchMonth] || `شهر ${newBatchMonth}`;
    const name = `دفع شهر ${newBatchMonth} (${monthName} ${newBatchYear})`;

    try {
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          name,
          year: parseInt(newBatchYear),
          month: parseInt(newBatchMonth),
          active: false,
          notes: newBatchNotes
        })
      });

      if (!res.ok) throw new Error('فشل إضافة الدفع');
      setShowAddForm(false);
      setNewBatchNotes('');
      setError('');
      onRefresh();
    } catch (err) {
      setError('خطأ أثناء إضافة الدفع: ' + err.message);
    }
  };

  const handleActivate = async (batchId) => {
    try {
      const res = await fetch(`/api/batches/${batchId}/set-active`, {
        method: 'PUT',
        headers: authHeaders()
      });
      if (!res.ok) throw new Error('فشل تفعيل الدفع');
      const updated = await res.json();
      onSetActiveBatch(updated);
      setError('');
      onRefresh();
    } catch (err) {
      setError('خطأ: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-darkslate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-darkslate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">إدارة الدفوع التجنيدية السنوية</h2>
              <p className="text-xs text-slate-400">تقسيم الدفوع الأربعة (شهر 1، شهر 4، شهر 7، شهر 10)</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="px-3 py-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-bold text-center">
              {error}
            </div>
          )}
          {/* Active Batch Summary Banner */}
          {activeBatch && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-teal-950/60 border border-emerald-500/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-[11px] font-bold text-emerald-400 block">الدفع التجنيدي النشط حالياً</span>
                  <h3 className="text-sm font-extrabold text-white">{activeBatch.name}</h3>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                تسجيل تلقائي
              </span>
            </div>
          )}

          {/* Batches Grid */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
              <span>الدفوع التجنيدية المعتمدة</span>
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة دفع تجنيدي جديد</span>
              </button>
            </div>

            {batches.map((batch) => {
              const isActive = activeBatch && activeBatch.id === batch.id;
              return (
                <div
                  key={batch.id}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                    isActive
                      ? 'bg-emerald-950/20 border-emerald-500/50 shadow-lg shadow-emerald-950/30'
                      : 'bg-darkslate-850 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                      isActive 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {batch.month}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{batch.name}</h4>
                        {isActive && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                            النشط
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>{batch.recruits_count || 0} مجند مسجل</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {isActive ? (
                      <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        معتمد حالياً
                      </span>
                    ) : (
                      <button
                        onClick={() => handleActivate(batch.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 hover:border-emerald-500 transition-all"
                      >
                        تعيين كدفع نشط
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add New Batch Form Collapsible */}
          {showAddForm && (
            <form onSubmit={handleCreateBatch} className="p-4 rounded-2xl bg-darkslate-850 border border-slate-700 space-y-3">
              <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                إضافة دفع تجنيدي لسنة جديدة
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">السنة</label>
                  <input
                    type="number"
                    value={newBatchYear}
                    onChange={(e) => setNewBatchYear(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">الدفع التجنيدي</label>
                  <select
                    value={newBatchMonth}
                    onChange={(e) => setNewBatchMonth(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold"
                  >
                    <option value={1}>شهر 1 (يناير)</option>
                    <option value={4}>شهر 4 (أبريل)</option>
                    <option value={7}>شهر 7 (يوليو)</option>
                    <option value={10}>شهر 10 (أكتوبر)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">ملاحظات إضافية</label>
                <input
                  type="text"
                  value={newBatchNotes}
                  onChange={(e) => setNewBatchNotes(e.target.value)}
                  placeholder="ملاحظات اختيارية..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                >
                  حفظ الدفع
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
}
