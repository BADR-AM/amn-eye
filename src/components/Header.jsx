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
  LogOut,
  HardDrive,
  Users,
  KeyRound,
  Smartphone,
  Power
} from 'lucide-react';
import centralSecurityLogo from '../assets/central_security_logo.png';
import LiquidOrb from './LiquidOrb';

function LiveClock() {
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
    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
      <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
      <div className="text-xs">
        <span className="font-bold text-slate-900 dark:text-white">{timeStr}</span>
        <span className="text-[10px] text-slate-500 dark:text-slate-400 mr-2">{dateStr}</span>
      </div>
    </div>
  );
}

export default function Header({ 
  activeBatch, 
  currentUser,
  onOpenUsers,
  onOpenChangePassword,
  onOpenKiosk, 
  onOpenBatches, 
  onOpenNetwork, 
  onOpenBackup,
  onOpenAiChat,
  onOpenAuditLogs,
  onSwitchToMobile,
  onToggleTheme,
  theme,
  onLogout
}) {
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  return (
    <header className="bg-white dark:bg-darkslate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 sticky top-0 z-30 shadow-md no-print">
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
              <span className="text-[10px] font-mono font-black tracking-widest uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                SECURITY EYE
              </span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                منظومة فحص وتسجيل المجندين
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-mono">
                  VER 02.1
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1.5 flex-wrap">
              <span>قطاع الأمن المركزي</span>
              <span>•</span>
              <span>منطقة وسط الدلتا</span>
              <span>•</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">مركز تدريب المجندين</span>
              <span>•</span>
              <span className="text-blue-600 dark:text-blue-400 font-bold">وحدة الأمن والتحريات</span>
            </p>
          </div>
        </div>

        {/* Live Active Batch & Current Date */}
        <div className="hidden lg:flex items-center gap-4 bg-slate-100 dark:bg-zinc-900 px-4 py-2 rounded-xl border border-slate-300 dark:border-zinc-800">
          <button 
            onClick={onOpenBatches}
            className="flex items-center gap-2.5 text-right hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors group"
            title="انقر لتغيير أو إدارة الدفوع التجنيدية"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-zinc-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-1">
                الدفع التجنيدي المعتمد
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-300">
                {activeBatch ? activeBatch.name : 'جاري التحميل...'}
              </div>
            </div>
          </button>

          <div className="h-6 w-[1px] bg-slate-300 dark:bg-zinc-700 mx-1"></div>

          <LiveClock />
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          
          {/* AI Assistant Chat Trigger */}
          <button
            onClick={onOpenAiChat}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 hover:from-slate-850 hover:to-purple-900/60 text-white shadow-lg shadow-purple-950/40 border border-purple-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="فتح مساعد التحريات الذكي (وكيل الذكاء الاصطناعي)"
          >
            <LiquidOrb size={22} state="idle" />
            <span className="hidden sm:inline bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent font-black">
              المساعد الذكي (AI)
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse shadow-sm shadow-purple-400"></span>
          </button>

          {/* Backup & External Drive Management */}
          <button
            onClick={onOpenBackup}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all shadow-sm"
            title="النسخ الاحتياطي الدوري وسحب نسخة للهارد الخارجي"
          >
            <HardDrive className="w-4 h-4 text-amber-400" />
            <span className="hidden md:inline">النسخ والهارد الخارجي</span>
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

          {/* Mobile View Toggle */}
          {onSwitchToMobile && (
            <button
              onClick={onSwitchToMobile}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all shadow-sm"
              title="التبديل لواجهة الهاتف المحمول (Mobile Friendly)"
            >
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <span className="hidden lg:inline">نسخة الموبايل</span>
            </button>
          )}

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

          {/* Users & Permissions Management (Admin only) */}
          {(!currentUser || currentUser.role === 'admin') && (
            <button
              onClick={onOpenUsers}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 transition-all shadow-sm"
              title="إدارة حسابات المستخدمين والصلاحيات"
            >
              <Users className="w-4 h-4 text-blue-400" />
              <span className="hidden xl:inline">المستخدمين</span>
            </button>
          )}

          {/* Audit Logs Trigger (Admin & Officer) */}
          {(!currentUser || currentUser.role === 'admin' || currentUser.role === 'officer') && (
            <button
              onClick={onOpenAuditLogs}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all shadow-sm"
              title="سجل العمليات والرقابة وتتبع التعديلات وهوية الحسابات"
            >
              <Shield className="w-4 h-4 text-amber-400" />
              <span className="hidden xl:inline">سجل الرقابة</span>
            </button>
          )}

          {/* User Profile Badge & Quick Password Change */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-800">
            <div className="text-right">
              <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
                <span>{currentUser?.full_name || 'مدير المنظومة'}</span>
                {currentUser?.role === 'admin' || !currentUser ? (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-600 dark:text-rose-300 font-bold border border-rose-500/30">مدير</span>
                ) : currentUser?.role === 'operator' ? (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-bold border border-emerald-500/30">كشك</span>
                ) : (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-600 dark:text-blue-300 font-bold border border-blue-500/30">ضابط</span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">@{currentUser?.username || 'admin'}</div>
            </div>

            <button
              onClick={onOpenChangePassword}
              className="p-1 rounded-lg text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
              title="تغيير كلمة المرور الخاصة بحسابك"
            >
              <KeyRound className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Light / Dark Mode Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-300 dark:border-zinc-800 transition-colors"
            title="تبديل المظهر (ليلي / نهاري)"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
          </button>

          {/* Logout */}
          <button
            onClick={() => {
              if (typeof onLogout === 'function') onLogout();
            }}
            className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-900 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-white border border-slate-300 dark:border-zinc-800 transition-colors"
            title="تسجيل الخروج من الجلسة"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* Quit / Exit App Entirely */}
          <button
            onClick={() => setShowQuitConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 border border-rose-500/30 transition-all shadow-sm"
            title="إغلاق المنظومة والخروج من البرنامج"
          >
            <Power className="w-4 h-4 text-rose-500" />
            <span className="hidden xl:inline text-xs font-bold">إغلاق البرنامج</span>
          </button>

        </div>

      </div>

      {/* Confirmation Modal for Quitting Application */}
      {showQuitConfirm && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
              <Power className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">إغلاق منظومة عين الأمن</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                هل أنت متأكد من رغبتك في إغلاق المنظومة والخروج التام من التطبيق؟
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowQuitConfirm(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
              >
                إلغاء الأمر
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    if (window.electronAPI && typeof window.electronAPI.quitApp === 'function') {
                      await window.electronAPI.quitApp();
                      return;
                    }
                  } catch (e) {
                    console.warn('quitApp failed:', e);
                  }
                  if (typeof onLogout === 'function') {
                    onLogout();
                  }
                  setShowQuitConfirm(false);
                  try {
                    window.close();
                  } catch (e) {}
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-900/40 flex items-center gap-2 cursor-pointer"
              >
                <Power className="w-4 h-4" />
                <span>نعم، إغلاق المنظومة</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
