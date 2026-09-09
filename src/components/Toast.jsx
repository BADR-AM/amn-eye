import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose, duration = 4000 }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = type === 'error' ? 'bg-rose-500/10 border-rose-500/30' : 'bg-emerald-500/10 border-emerald-500/30';
  const textColor = type === 'error' ? 'text-rose-300' : 'text-emerald-300';
  const Icon = type === 'error' ? XCircle : CheckCircle;

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-xl border ${bgColor} backdrop-blur-md shadow-2xl flex items-center gap-3 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}
    >
      <Icon className={`w-5 h-5 shrink-0 ${textColor}`} />
      <span className={`text-sm font-bold ${textColor}`}>{message}</span>
      <button
        onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
        className="ml-2 p-1 rounded-lg hover:bg-white/5 text-slate-400"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
