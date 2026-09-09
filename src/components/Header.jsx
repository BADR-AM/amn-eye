import React, { useEffect, useState } from 'react';
import { Wifi, Layers, UserPlus, Bot, LogOut, Clock } from 'lucide-react';

export default function Header({
  activeBatch, onOpenKiosk, onOpenBatches, onOpenNetwork,
  onOpenAiChat, networkInfo, onLogout
}) {
  const [timeStr, setTimeStr] = useState('');
  useEffect(() => {
    const update = () => setTimeStr(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="h-auto min-h-[72px] bg-[var(--ui-layer-01)] border-b border-[var(--ui-border)] sticky top-0 z-30 no-print">
      <div className="px-4 lg:px-6 min-h-[72px] flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base lg:text-lg font-black text-white">منظومة فحص وتسجيل المجندين</h1>
            <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-bold border border-[#3e5fbd] bg-[#172f7a]/40 text-[#c8d5ff]">AMN-EYE</span>
          </div>
          <p className="text-[11px] text-[var(--ui-text-secondary)] mt-1">الإدارة العامة للأمن المركزي • منطقة وسط الدلتا • وحدة الأمن والتحريات</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden 2xl:flex items-center gap-2 px-3 py-2 border border-[var(--ui-border)] bg-black/10 text-xs">
            <Layers className="w-4 h-4 text-[var(--amn-gold-50)]" />
            <span className="text-[var(--ui-text-secondary)]">الدفعة:</span>
            <button onClick={onOpenBatches} className="font-bold text-white hover:text-[var(--amn-gold-50)]">
              {activeBatch?.name || 'جاري التحميل...'}
            </button>
          </div>

          <button onClick={onOpenNetwork} className="hidden lg:flex p-2.5 border border-[var(--ui-border)] text-slate-300 hover:bg-white/5 hover:text-white transition-colors" title="ربط الأجهزة">
            <Wifi className="w-4 h-4 text-[var(--status-success)]" />
          </button>
          <button onClick={onOpenAiChat} className="hidden lg:flex p-2.5 border border-[var(--ui-border)] text-slate-300 hover:bg-white/5 hover:text-white transition-colors" title="مساعد النظام">
            <Bot className="w-4 h-4 text-[var(--amn-gold-50)]" />
          </button>
          <div className="hidden xl:flex items-center gap-1 text-xs text-slate-400 px-2"><Clock className="w-3.5 h-3.5" />{timeStr}</div>

          <button onClick={onOpenKiosk} className="amn-button-primary flex items-center gap-2 px-4 py-2.5 text-xs font-black transition-colors">
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">تسجيل جديد</span>
            <span className="hidden 2xl:inline opacity-70">(F2)</span>
          </button>

          <button onClick={onLogout} className="xl:hidden p-2.5 border border-[var(--ui-border)] text-slate-400 hover:text-red-300 hover:bg-red-500/5 transition-colors" title="تسجيل الخروج">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
