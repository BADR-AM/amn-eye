import React, { useState, useEffect } from 'react';
import { Shield, Eye, Lock, Server, CheckCircle2, ChevronLeft } from 'lucide-react';
import splashBanner from '../assets/splash_banner.jpg';
import centralSecurityLogo from '../assets/central_security_logo.png';

export default function SplashScreen({ onFinish }) {
  const [progress, setProgress] = useState(15);
  const [statusText, setStatusText] = useState('جاري تشغيل محرك الأمان وتأمين الاتصال...');

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setProgress(45);
      setStatusText('جاري فحص وتأمين قاعدة بيانات المجندين...');
    }, 450);

    const timer2 = setTimeout(() => {
      setProgress(80);
      setStatusText('تنشيط وحدة الأمن والتحريات ومركز تدريب المجندين...');
    }, 950);

    const timer3 = setTimeout(() => {
      setProgress(100);
      setStatusText('جاهز للعمل — جاري الدخول للمنظومة...');
    }, 1500);

    const finishTimer = setTimeout(() => {
      if (onFinish) onFinish();
    }, 2100);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#080b10] flex flex-col items-center justify-between p-4 sm:p-8 select-none font-sans overflow-hidden text-white"
      dir="rtl"
    >
      {/* Background Graphic with Vignette */}
      <div className="absolute inset-0 z-0">
        <img 
          src={splashBanner} 
          alt="مركز تدريب المجندين - الأمن المركزي" 
          className="w-full h-full object-cover object-center opacity-30 filter blur-[1px] transform scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080b10] via-[#080b10]/70 to-[#080b10]/90"></div>
      </div>

      {/* Top Header Bar */}
      <div className="relative z-10 w-full max-w-5xl flex items-center justify-between py-2 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img 
            src={centralSecurityLogo} 
            alt="شعار الأمن المركزي" 
            className="w-10 h-12 object-contain drop-shadow-lg"
          />
          <div>
            <div className="text-xs text-gray-400 font-semibold tracking-wider">وزارة الداخلية • قطاع الأمن المركزي</div>
            <div className="text-sm font-bold text-white">منطقة وسط الدلتا</div>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-mono font-bold tracking-widest uppercase">
          <Eye className="w-3.5 h-3.5" />
          <span>SECURITY EYE • VER 01.0</span>
        </div>
      </div>

      {/* Main Center Stage: Featured Banner Showcase */}
      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center text-center my-auto">
        
        {/* Floating High-Res Banner Card */}
        <div className="relative rounded-2xl overflow-hidden border-2 border-amber-500/40 shadow-2xl shadow-blue-950/80 mb-6 group transform hover:scale-[1.01] transition-transform duration-300">
          <img 
            src={splashBanner} 
            alt="مركز التدريب - وسط الدلتا للأمن المركزي" 
            className="w-full max-h-[290px] object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
          
          <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3">
            <span className="px-3 py-1 rounded-lg bg-amber-500/90 text-black font-black text-xs sm:text-sm shadow-md">
              مركز تدريب المجندين
            </span>
            <span className="px-3 py-1 rounded-lg bg-blue-600/90 text-white font-black text-xs sm:text-sm shadow-md">
              وحدة الأمن والتحريات
            </span>
          </div>
        </div>

        {/* System Title */}
        <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white mb-2 drop-shadow-md">
          منظومة فحص وتسجيل المجندين المستجدين
        </h1>

        {/* Authority Names Highlight */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm font-bold text-gray-300 mb-6">
          <span className="text-amber-400 font-extrabold">مركز تدريب المجندين</span>
          <span>•</span>
          <span className="text-blue-400 font-extrabold">وحدة الأمن والتحريات</span>
          <span>•</span>
          <span className="text-slate-300">قطاع الأمن المركزي (وسط الدلتا)</span>
        </div>

        {/* Loading Progress Bar */}
        <div className="w-full max-w-md bg-black/60 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2 font-medium">
            <span className="text-blue-300 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 animate-pulse text-blue-400" />
              {statusText}
            </span>
            <span className="font-mono font-bold text-white">{progress}%</span>
          </div>

          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700">
            <div 
              className="bg-gradient-to-r from-blue-500 via-indigo-500 to-amber-400 h-full rounded-full transition-all duration-500 ease-out shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400">
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3 h-3" />
              نظام محمي ومشفر بالكامل
            </span>
            <button 
              onClick={onFinish}
              className="text-gray-400 hover:text-white flex items-center gap-0.5 text-[11px] underline underline-offset-2 transition-colors cursor-pointer"
            >
              <span>تخطي والبدء فوراً</span>
              <ChevronLeft className="w-3 h-3" />
            </button>
          </div>
        </div>

      </div>

      {/* Bottom Footer Credit */}
      <div className="relative z-10 w-full text-center py-2 text-[11px] text-gray-400 font-mono">
        <span>Security Eye System</span>
        <span className="mx-2">•</span>
        <span className="text-gray-300 font-semibold">Created by SHERIF A.ELRAHMAN</span>
        <span className="mx-2">•</span>
        <span>VER 01.0</span>
      </div>

    </div>
  );
}
