import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Wifi, 
  Calendar, 
  PlusCircle, 
  Layers, 
  Clock, 
  Sparkles,
  Sun,
  Moon,
  Bot,
  LogOut
} from 'lucide-react';
import centralSecurityLogo from '../assets/central_security_logo.png';

export default function Header({ 
  activeBatch, 
  onOpenKiosk, 
  onOpenBatches, 
  onOpenNetwork, 
  onOpenAiChat,
  theme,
  onToggleTheme,
  networkInfo,
  onRefresh,
  onLogout
}) {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDateStr(now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-darkslate-900 dark:bg-zinc-950 border-b border-slate-800 dark:border-zinc-800 px-6 py-3 sticky top-0 z-30 shadow-xl no-print">
      <div className="flex flex-wrap items-center justify-between gap-4 max-w-[1600px] mx-auto">
        
        {/* Brand & Military Department Info */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 flex items-center justify-center shrink-0">
            <img 
              src={centralSecurityLogo} 
              alt="شعار الأمن المركزي" 
              className="w-11 h-12 object-contain drop-shadow-md"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                منظومة فحص وتسجيل المجندين
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  إصدار 2026
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              الإدارة العامة للأمن المركزي • منطقة وسط الدلتا • وحدة الأمن والتحريات
            </p>
          </div>
        </div>

        {/* Live Active Batch & Current Date */}
        <div className="hidden lg:flex items-center gap-4 bg-darkslate-850 dark:bg-zinc-900 px-4 py-2 rounded-xl border border-slate-800 dark:border-zinc-800">
          <button 
            onClick={onOpenBatches}
            className="flex items-center gap-2.5 text-right hover:text-emerald-400 transition-colors group"
            title="انقر لتغيير أو إدارة الدفوع التجنيدية"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-800 dark:bg-zinc-800 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                الدفع التجنيدي المعتمد
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <div className="text-xs font-bold text-white group-hover:text-emerald-300">
                {activeBatch ? activeBatch.name : 'جاري التحميل...'}
              </div>
            </div>
          </button>

          <div className="h-6 w-[1px] bg-slate-700 dark:bg-zinc-700 mx-1"></div>

          <div className="flex items-center gap-2 text-slate-300">
            <Clock className="w-4 h-4 text-slate-400" />
            <div className="text-xs">
              <span className="font-bold text-white">{timeStr}</span>
              <span className="text-[10px] text-slate-400 mr-2">{dateStr}</span>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          
          {/* AI Assistant Chat Trigger */}
          <button
            onClick={onOpenAiChat}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-600/90 to-teal-700/90 hover:from-emerald-500 hover:to-teal-600 text-white shadow-md shadow-emerald-950/40 border border-emerald-500/30 transition-all"
            title="فتح مساعد التحريات الذكي (AI Chat)"
          >
            <Bot className="w-4 h-4" />
            <span className="hidden sm:inline">المساعد الذكي</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </button>

          {/* Wi-Fi Sync Network Status */}
          <button
            onClick={onOpenNetwork}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-darkslate-850 dark:bg-zinc-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 dark:border-zinc-800 transition-all shadow-sm"
            title="ربط جهاز آخر عبر الواي فاي الداخلي"
          >
            <Wifi className="w-4 h-4 text-emerald-400" />
            <span className="hidden md:inline">ربط الأجهزة</span>
          </button>

          {/* Batches Management */}
          <button
            onClick={onOpenBatches}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-darkslate-850 dark:bg-zinc-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 dark:border-zinc-800 transition-all shadow-sm"
            title="الدفوع التجنيدية الأربعة"
          >
            <Calendar className="w-4 h-4 text-blue-400" />
            <span className="hidden md:inline">الدفوع التجنيدية</span>
          </button>

          {/* Fast Kiosk Mode Registration */}
          <button
            onClick={onOpenKiosk}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-900/30 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>تسجيل جديد (F2)</span>
          </button>

          {/* Light / Dark Mode Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl bg-darkslate-850 dark:bg-zinc-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 dark:border-zinc-800 transition-colors"
            title="تبديل المظهر (ليلي / نهاري)"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-400" />}
          </button>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="p-2 rounded-xl bg-darkslate-850 dark:bg-zinc-900 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700/60 dark:border-zinc-800 transition-colors"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </button>

        </div>

      </div>
    </header>
  );
}
