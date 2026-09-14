import React, { useState } from 'react';
import { KeyRound, Lock, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { authHeaders } from '../utils/auth';

export default function ChangePasswordModal({ isOpen, onClose, onSuccess }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!oldPassword.trim()) {
      setError('يرجى إدخال كلمة المرور الحالية');
      return;
    }
    if (!newPassword.trim()) {
      setError('يرجى إدخال كلمة المرور الجديدة');
      return;
    }
    if (newPassword.trim().length < 4) {
      setError('كلمة المرور الجديدة يجب ألا تقل عن 4 رموز');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('كلمة المرور الجديدة غير متطابقة مع تأكيد كلمة المرور');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          oldPassword: oldPassword.trim(),
          newPassword: newPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'فشل تحديث كلمة المرور');
        setLoading(false);
        return;
      }

      setLoading(false);
      if (onSuccess) {
        onSuccess('تم تحديث كلمة المرور بنجاح');
      }
      onClose();
    } catch (err) {
      setError('خطأ في الاتصال بالخادم: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" dir="rtl">
      <div className="bg-darkslate-900 dark:bg-zinc-900 border border-slate-700/60 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 dark:border-zinc-800 bg-darkslate-850/60 dark:bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">تغيير كلمة المرور</h2>
              <p className="text-xs text-slate-400">تحديث كلمة السر الخاصة بحسابك الحالي في المنظومة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              كلمة المرور الحالية
            </label>
            <div className="relative">
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => { setOldPassword(e.target.value); setError(''); }}
                placeholder="أدخل كلمة المرور الحالية..."
                autoFocus
                className="w-full bg-darkslate-950 dark:bg-zinc-950 border border-slate-700 dark:border-zinc-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all font-sans"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              كلمة المرور الجديدة
            </label>
            <div className="relative">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                placeholder="أدخل كلمة المرور الجديدة (4 أحرف أو أرقام على الأقل)..."
                className="w-full bg-darkslate-950 dark:bg-zinc-950 border border-slate-700 dark:border-zinc-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all font-sans"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              تأكيد كلمة المرور الجديدة
            </label>
            <div className="relative">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                placeholder="أعد إدخال كلمة المرور الجديدة للتأكيد..."
                className="w-full bg-darkslate-950 dark:bg-zinc-950 border border-slate-700 dark:border-zinc-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all font-sans"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs shadow-lg shadow-amber-950/40 transition-all disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>{loading ? 'جاري الحفظ...' : 'تحديث كلمة المرور'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
