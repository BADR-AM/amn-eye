import React, { useState } from 'react';
import { Lock, LogIn, Loader2, ShieldCheck } from 'lucide-react';
import centralSecurityLogo from '../assets/central_security_logo.png';

export default function LoginPage({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) { setError('كلمة المرور مطلوبة'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'خطأ في تسجيل الدخول'); setLoading(false); return; }
      onLogin(data.token);
    } catch {
      setError('تعذر الاتصال بالخادم');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--ui-bg)] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 w-1/3 bg-[var(--amn-navy-90)] border-l border-white/5 hidden lg:block" />
      <div className="w-full max-w-[980px] grid lg:grid-cols-[1.15fr_0.85fr] relative z-10 border border-[var(--ui-border)] bg-[var(--ui-layer-01)] shadow-2xl">
        <section className="hidden lg:flex p-12 flex-col justify-between bg-[linear-gradient(135deg,#0d1d3f,#08152e)]">
          <div>
            <div className="flex items-center gap-4">
              <img src={centralSecurityLogo} alt="شعار الأمن المركزي" className="w-20 h-24 object-contain" />
              <div>
                <div className="text-sm font-bold tracking-[0.24em] text-[var(--amn-gold-50)]" dir="ltr">AMN-EYE</div>
                <h1 className="text-2xl font-black text-white mt-2">منظومة الأمن والتحريات</h1>
                <p className="text-sm text-slate-400 mt-2">CENTRAL SECURITY • MID DELTA</p>
              </div>
            </div>
            <div className="mt-16 max-w-md">
              <h2 className="text-xl font-bold text-white">بيئة تشغيل مؤسسية وآمنة</h2>
              <p className="text-sm leading-7 text-slate-400 mt-4">واجهة تشغيل موحدة لتسجيل المجندين ومتابعة البيانات والتوثيق المرئي ضمن منظومة مركزية واضحة وسهلة الاستخدام.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-[var(--status-success)]" />
            <span>النظام المحلي متاح للتشغيل</span>
          </div>
        </section>

        <section className="p-8 sm:p-12 flex flex-col justify-center">
          <div className="lg:hidden text-center mb-8">
            <img src={centralSecurityLogo} alt="شعار الأمن المركزي" className="w-20 h-24 object-contain mx-auto mb-3" />
            <div className="text-xs font-bold tracking-[0.18em] text-[var(--amn-gold-50)]" dir="ltr">AMN-EYE</div>
            <h1 className="text-lg font-black text-white mt-2">منظومة الأمن والتحريات</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-black text-white">تسجيل الدخول</h2>
            <p className="text-sm text-[var(--ui-text-secondary)] mt-2">أدخل كلمة المرور للوصول إلى لوحة المتابعة.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-300 mb-2">
                <Lock className="w-4 h-4 text-[var(--amn-gold-50)]" /> كلمة المرور
              </label>
              <input type="password" value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="أدخل كلمة المرور" autoFocus
                className="w-full bg-[var(--ui-bg)] border border-[var(--ui-border)] px-4 py-3.5 text-sm text-white placeholder:text-slate-600 focus:border-[var(--ui-focus)] focus:ring-0 transition-colors" />
            </div>

            {error && <div role="alert" className="px-4 py-3 border border-red-500/30 bg-red-500/10 text-red-200 text-xs font-bold">{error}</div>}

            <button type="submit" disabled={loading}
              className="amn-button-primary w-full flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-black disabled:opacity-60">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              <span>{loading ? 'جاري التحقق...' : 'تسجيل الدخول'}</span>
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
