import React, { useState } from 'react';
import { Lock, LogIn, Loader2, Shield, Eye } from 'lucide-react';
import centralSecurityLogo from '../assets/central_security_logo.png';

export default function LoginPage({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('كلمة المرور مطلوبة');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'كلمة المرور غير صحيحة');
        setLoading(false);
        return;
      }

      onLogin(data.token);
    } catch (err) {
      setError('تعذر الاتصال بالخادم');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-between p-6 select-none font-sans relative overflow-hidden">
      
      {/* Background Subtle Ambience */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Spacer */}
      <div></div>

      {/* Main Login Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl p-8 backdrop-blur-xl">
          
          {/* Logo & Department Brand Header */}
          <div className="text-center mb-6">
            <div className="w-24 h-24 mx-auto mb-3 flex items-center justify-center p-1 bg-[#21262d] border border-[#30363d] rounded-2xl shadow-inner">
              <img 
                src={centralSecurityLogo} 
                alt="شعار الأمن المركزي" 
                className="w-20 h-20 object-contain drop-shadow-lg"
              />
            </div>

            {/* System Name Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono font-bold tracking-widest uppercase mb-2">
              <Eye className="w-3.5 h-3.5" />
              <span>SECURITY EYE</span>
            </div>

            <h1 className="text-xl font-black text-white tracking-wide">
              منظومة فحص وتسجيل المجندين
            </h1>
            <p className="text-xs text-gray-400 mt-1 font-medium">
              وزارة الداخلية • قطاع الأمن المركزي • وحدة الأمن والتحريات
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5 text-right">
                <Lock className="w-3.5 h-3.5 inline ml-1 text-blue-400" />
                كلمة المرور المشفرة
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="أدخل كلمة المرور لتسجيل الدخول..."
                autoFocus
                className="w-full bg-[#0d1117] border border-[#30363d] focus:border-[#58a6ff] rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-sans"
              />
            </div>

            {error && (
              <div className="px-3 py-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-bold text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-blue-950/40 transition-all disabled:opacity-60 transform active:scale-[0.99]"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              <span>{loading ? 'جاري التحقق...' : 'دخول المنظومة'}</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#21262d] text-center">
            <span className="text-[11px] text-gray-500 font-mono">
              منطقة وسط الدلتا — مركز تدريب المجندين
            </span>
          </div>

        </div>
      </div>

      {/* Footer Branding Credit */}
      <footer className="w-full text-center py-4 relative z-10">
        <p className="text-[11px] tracking-wider text-gray-400 font-medium flex items-center justify-center gap-1.5">
          <span>Security Eye System</span>
          <span>•</span>
          <span className="text-gray-300 font-semibold">Created by SHERIF A.ELRAHMAN</span>
          <span>•</span>
          <span className="text-gray-400">إصدار 2026</span>
        </p>
      </footer>

    </div>
  );
}
