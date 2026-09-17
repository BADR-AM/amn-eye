import React, { useState } from 'react';
import { Lock, User, LogIn, Loader2, Shield, Eye, QrCode, KeyRound, Camera, AlertCircle, RefreshCw } from 'lucide-react';
import centralSecurityLogo from '../assets/central_security_logo.png';
import splashBanner from '../assets/splash_banner.jpg';
import CameraQrScanner from './CameraQrScanner';

export default function LoginPage({ onLogin }) {
  const [loginMode, setLoginMode] = useState('password'); // 'password' | 'qr'
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [qrError, setQrError] = useState('');
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
        body: JSON.stringify({ 
          username: username.trim() || 'admin', 
          password: password.trim() 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'اسم المستخدم أو كلمة المرور غير صحيحة');
        setLoading(false);
        return;
      }

      onLogin(data.token, data.user);
    } catch (err) {
      setError('تعذر الاتصال بالخادم');
      setLoading(false);
    }
  };

  const handleQrScan = async (token) => {
    if (!token || loading) return;
    setLoading(true);
    setError('');
    setQrError('');

    try {
      const res = await fetch('/api/auth/qr-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_token: token }),
      });

      const data = await res.json();

      if (!res.ok) {
        setQrError(data.error || 'رمز بطاقة الهوية غير صالح أو تم إلغاؤه');
        setLoading(false);
        return;
      }

      onLogin(data.token, data.user);
    } catch (err) {
      setQrError('تعذر الاتصال بالخادم للتحقق من بطاقة الهوية');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-between p-6 select-none font-sans relative overflow-hidden" dir="rtl">
      
      {/* Background Graphic with Cinematic Vignette */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img 
          src={splashBanner} 
          alt="الأمن المركزي" 
          className="w-full h-full object-cover opacity-25 filter blur-[2px] scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] via-[#0d1117]/85 to-[#0d1117]/95"></div>
      </div>

      {/* Spacer */}
      <div></div>

      {/* Main Login Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#161b22]/90 border border-[#30363d] rounded-2xl shadow-2xl p-8 backdrop-blur-xl">
          
          {/* Logo & Department Brand Header */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto mb-3 flex items-center justify-center p-1 bg-[#21262d] border border-[#30363d] rounded-2xl shadow-inner">
              <img 
                src={centralSecurityLogo} 
                alt="شعار الأمن المركزي" 
                className="w-16 h-16 object-contain drop-shadow-lg"
              />
            </div>

            {/* System Name Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/40 text-blue-300 text-xs font-mono font-bold tracking-widest uppercase mb-2">
              <Eye className="w-3.5 h-3.5" />
              <span>SECURITY EYE</span>
              <span className="px-1.5 py-0.2 text-[10px] rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                VER 02.1
              </span>
            </div>

            <h1 className="text-xl font-black text-white tracking-wide">
              منظومة فحص وتسجيل المجندين
            </h1>
            <p className="text-xs text-gray-400 mt-1 font-medium">
              وزارة الداخلية • قطاع الأمن المركزي • منطقة وسط الدلتا
            </p>

            {/* Prominent Authority Badges */}
            <div className="flex items-center justify-center gap-2 mt-2.5">
              <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold">
                مركز تدريب المجندين
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30 text-xs font-bold">
                وحدة الأمن والتحريات
              </span>
            </div>
          </div>

          {/* Login Method Mode Switcher (Password vs Smart ID QR Code) */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#0d1117] border border-[#30363d] rounded-xl mb-5">
            <button
              type="button"
              onClick={() => {
                setLoginMode('password');
                setError('');
                setQrError('');
              }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                loginMode === 'password'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-950/50'
                  : 'text-gray-400 hover:text-white hover:bg-[#21262d]'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>كلمة المرور</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLoginMode('qr');
                setError('');
                setQrError('');
              }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                loginMode === 'qr'
                  ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-md shadow-emerald-950/50'
                  : 'text-gray-400 hover:text-white hover:bg-[#21262d]'
              }`}
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>بطاقة الهوية (QR)</span>
            </button>
          </div>

          {loginMode === 'qr' ? (
            <div className="space-y-4">
              <CameraQrScanner
                onScan={handleQrScan}
                title="الدخول ببطاقة الهوية الذكية"
                instruction="وجّه كود الـ QR الخاص ببطاقتك نحو الكاميرا لتسجيل الدخول تلقائياً"
              />

              {qrError && (
                <div className="px-3 py-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-bold text-center flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{qrError}</span>
                </div>
              )}

              {loading && (
                <div className="px-3 py-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-300 text-xs font-bold text-center flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري التحقق من الصلاحيات الأمنية للبطاقة...</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => setLoginMode('password')}
                className="w-full py-2.5 rounded-xl border border-[#30363d] text-gray-400 hover:text-white hover:bg-[#21262d] text-xs font-semibold transition-colors"
              >
                التبديل إلى الدخول بكلمة المرور اليدوية
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5 text-right">
                  <User className="w-3.5 h-3.5 inline ml-1 text-emerald-400" />
                  اسم المستخدم / الحساب
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(''); }}
                  placeholder="اسم المستخدم (مثل admin)..."
                  className="w-full bg-[#0d1117] border border-[#30363d] focus:border-[#58a6ff] rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-sans"
                />
              </div>

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
          )}

          <div className="mt-6 pt-4 border-t border-[#21262d] text-center">
            <span className="text-[11px] text-gray-400 font-mono">
              قطاع الأمن المركزي • مركز تدريب المجندين • وحدة الأمن والتحريات
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
          <span className="text-gray-400">VER 01.0</span>
        </p>
      </footer>

    </div>
  );
}
