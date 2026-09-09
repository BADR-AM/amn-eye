import React from 'react';
import {
  LayoutDashboard, UserPlus, Layers, Wifi, Bot, LogOut, ChevronLeft
} from 'lucide-react';
import centralSecurityLogo from '../assets/central_security_logo.png';

export default function Sidebar({
  activeBatch,
  onDashboard,
  onRegister,
  onOpenBatches,
  onOpenNetwork,
  onOpenAiChat,
  onLogout,
}) {
  const items = [
    { label: 'لوحة المتابعة', icon: LayoutDashboard, onClick: onDashboard, active: true },
    { label: 'تسجيل مجند جديد', icon: UserPlus, onClick: onRegister },
    { label: 'الدفعات التجنيدية', icon: Layers, onClick: onOpenBatches },
    { label: 'ربط الأجهزة', icon: Wifi, onClick: onOpenNetwork },
  ];

  return (
    <aside className="hidden xl:flex w-[248px] shrink-0 min-h-screen flex-col bg-[var(--ui-layer-01)] border-l border-[var(--ui-border)] no-print">
      <div className="px-5 py-6 border-b border-[var(--ui-border)]">
        <div className="flex items-center gap-3">
          <img src={centralSecurityLogo} alt="شعار الأمن المركزي" className="w-12 h-14 object-contain" />
          <div>
            <div className="text-[11px] tracking-[0.18em] text-[var(--amn-gold-50)] font-bold" dir="ltr">AMN-EYE</div>
            <div className="text-sm font-black text-white mt-0.5">الأمن والتحريات</div>
            <div className="text-[10px] text-[var(--ui-text-secondary)]">CENTRAL SECURITY</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        <div className="px-3 py-2 text-[10px] font-bold tracking-wider text-slate-500">التنقل الرئيسي</div>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.label} onClick={item.onClick}
              className={`w-full flex items-center gap-3 px-3 py-3 text-sm font-bold border transition-colors ${
                item.active
                  ? 'bg-[#172f7a] border-[#3e5fbd] text-white'
                  : 'bg-transparent border-transparent text-slate-300 hover:bg-white/5 hover:border-white/5'
              }`}>
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
              {item.active && <ChevronLeft className="w-4 h-4 mr-auto opacity-70" />}
            </button>
          );
        })}

        <div className="pt-6 px-3 pb-2 text-[10px] font-bold tracking-wider text-slate-500">أدوات النظام</div>
        <button onClick={onOpenAiChat}
          className="w-full flex items-center gap-3 px-3 py-3 text-sm font-bold text-slate-300 border border-transparent hover:bg-white/5 hover:border-white/5 transition-colors">
          <Bot className="w-4 h-4 text-[var(--amn-gold-50)]" />
          <span>مساعد النظام</span>
        </button>
      </nav>

      <div className="p-3 border-t border-[var(--ui-border)] space-y-3">
        <button onClick={onOpenBatches}
          className="w-full text-right px-3 py-3 bg-black/15 border border-[var(--ui-border)] hover:border-[#3e5fbd] transition-colors">
          <div className="text-[10px] text-[var(--ui-text-secondary)] mb-1">الدفعة النشطة</div>
          <div className="text-xs font-bold text-white truncate">{activeBatch?.name || 'جاري التحميل...'}</div>
        </button>
        <button onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-3 text-xs font-bold text-slate-400 hover:text-red-300 hover:bg-red-500/5 transition-colors">
          <LogOut className="w-4 h-4" />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
