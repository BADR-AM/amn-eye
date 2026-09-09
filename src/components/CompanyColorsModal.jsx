import React, { useState, useEffect } from 'react';
import { X, Palette, RotateCcw, Save, Check, Plus, Trash2 } from 'lucide-react';
import { DEFAULT_COMPANY_COLORS, saveCompanyColors } from '../utils/companyColors';

const PRESET_COLORS = [
  { label: 'أخضر', color: '#16a34a', text: '#ffffff' },
  { label: 'أحمر', color: '#dc2626', text: '#ffffff' },
  { label: 'أزرق', color: '#2563eb', text: '#ffffff' },
  { label: 'أبيض', color: '#ffffff', text: '#000000' },
  { label: 'برتقالي', color: '#ea580c', text: '#ffffff' },
  { label: 'لبني', color: '#38bdf8', text: '#000000' },
  { label: 'أصفر', color: '#eab308', text: '#000000' },
  { label: 'بنفسجي', color: '#9333ea', text: '#ffffff' },
  { label: 'رمادي', color: '#475569', text: '#ffffff' },
  { label: 'كحلي داكن', color: '#0f172a', text: '#ffffff' },
];

export default function CompanyColorsModal({ isOpen, onClose, companyColors, onColorsUpdated }) {
  const [colors, setColors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    if (companyColors && companyColors.length > 0) {
      setColors(JSON.parse(JSON.stringify(companyColors)));
    } else {
      setColors(JSON.parse(JSON.stringify(DEFAULT_COMPANY_COLORS)));
    }
  }, [companyColors, isOpen]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleColorChange = (index, field, value) => {
    setColors(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleApplyPreset = (index, preset) => {
    setColors(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        color: preset.color,
        textColor: preset.text,
      };
      return updated;
    });
  };

  const handleResetDefaults = () => {
    if (confirm('هل ترغب في استعادة التوزيع الافتراضي لألوان السرايا (الأولى: أخضر، الثانية: أحمر، الثالثة: أزرق، الرابعة: أبيض، الخامسة: برتقالي، السادسة: لبني)؟')) {
      setColors(JSON.parse(JSON.stringify(DEFAULT_COMPANY_COLORS)));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const ok = await saveCompanyColors(colors);
    setSaving(false);
    if (ok) {
      setSavedMsg(true);
      if (onColorsUpdated) onColorsUpdated(colors);
      setTimeout(() => {
        setSavedMsg(false);
        onClose();
      }, 700);
    } else {
      alert('حدث خطأ أثناء حفظ الإعدادات على الخادم.');
    }
  };

  const handleAddCompany = () => {
    const num = colors.length + 1;
    const newEntry = {
      id: `c${Date.now()}`,
      match: `السرية ${num}`,
      number: String(num),
      name: `السرية رقم ( ${num} )`,
      color: '#2563eb',
      textColor: '#ffffff'
    };
    setColors(prev => [...prev, newEntry]);
  };

  const handleDeleteCompany = (index) => {
    setColors(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <div className="bg-darkslate-900 border border-slate-700/80 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-darkslate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center border border-orange-500/30">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                إعدادات ألوان السرايا وكروت الدولاب
              </h2>
              <p className="text-xs text-slate-400">
                تحديد لون شريط الكارت وشارة كل سرية بدقة ومرونة تامة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          
          {/* Quick Guide Info Card */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 text-xs text-slate-300 flex items-center justify-between">
            <div>
              <span className="text-orange-400 font-bold block mb-0.5">القاعدة المعتمدة للألوان:</span>
              <span>السرية الأولى: أخضر • الثانية: أحمر • الثالثة: أزرق • الرابعة: أبيض • الخامسة: برتقالي • السادسة: لبني</span>
            </div>
            <button
              onClick={handleResetDefaults}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition-colors shrink-0"
              title="استعادة القيم الافتراضية"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة الافتراضي</span>
            </button>
          </div>

          {/* List of Companies */}
          <div className="space-y-3">
            {colors.map((c, idx) => (
              <div 
                key={c.id || idx}
                className="bg-darkslate-850 border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4 justify-between"
              >
                {/* 1. Name & Keyword */}
                <div className="flex-1 w-full space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 text-xs font-mono font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={c.name}
                      onChange={(e) => handleColorChange(idx, 'name', e.target.value)}
                      className="bg-darkslate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-white flex-1 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 pr-8">
                    <span>الكلمة الدالة للتعرف التلقائي:</span>
                    <input
                      type="text"
                      value={c.match || ''}
                      onChange={(e) => handleColorChange(idx, 'match', e.target.value)}
                      placeholder="مثال: الأولى"
                      className="bg-darkslate-900 border border-slate-700 rounded px-2 py-0.5 text-[11px] text-orange-300 w-28 focus:outline-none"
                    />
                  </div>
                </div>

                {/* 2. Color Controls & Swatches */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  
                  {/* Hex Picker Input */}
                  <div className="flex items-center gap-1.5 bg-darkslate-900 border border-slate-700 rounded-xl px-2 py-1">
                    <input
                      type="color"
                      value={c.color}
                      onChange={(e) => handleColorChange(idx, 'color', e.target.value)}
                      className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                    />
                    <span className="font-mono text-xs text-slate-300 uppercase">{c.color}</span>
                  </div>

                  {/* Text Color Toggle (Dark vs Light) */}
                  <div className="flex items-center rounded-lg bg-darkslate-900 border border-slate-700 p-0.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => handleColorChange(idx, 'textColor', '#ffffff')}
                      className={`px-2 py-1 rounded font-bold transition-colors ${
                        c.textColor === '#ffffff' ? 'bg-slate-700 text-white' : 'text-slate-400'
                      }`}
                      title="خط أبيض"
                    >
                      خط أبيض
                    </button>
                    <button
                      type="button"
                      onClick={() => handleColorChange(idx, 'textColor', '#000000')}
                      className={`px-2 py-1 rounded font-bold transition-colors ${
                        c.textColor === '#000000' ? 'bg-white text-black' : 'text-slate-400'
                      }`}
                      title="خط أسود"
                    >
                      خط أسود
                    </button>
                  </div>

                  {/* Quick Preset Swatches Menu */}
                  <div className="flex items-center gap-1">
                    {PRESET_COLORS.slice(0, 6).map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => handleApplyPreset(idx, p)}
                        style={{ backgroundColor: p.color }}
                        className={`w-5 h-5 rounded-full border border-black/40 hover:scale-110 transition-transform ${
                          c.color === p.color ? 'ring-2 ring-orange-500 ring-offset-1 ring-offset-darkslate-900' : ''
                        }`}
                        title={p.label}
                      />
                    ))}
                  </div>

                  {/* Live Mini Preview Badge */}
                  <div
                    style={{ backgroundColor: c.color, color: c.textColor, borderColor: '#000000' }}
                    className="border-2 px-3 py-1 rounded shadow-sm text-xs font-black shrink-0 min-w-[90px] text-center"
                  >
                    {c.name.split('(')[0].trim()}
                  </div>

                  {/* Delete custom company if > 6 */}
                  {colors.length > 6 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCompany(idx)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                      title="حذف السرية"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                </div>

              </div>
            ))}
          </div>

          {/* Add Company Button */}
          <button
            type="button"
            onClick={handleAddCompany}
            className="w-full py-2.5 rounded-2xl border-2 border-dashed border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة سرية أو فصيلة جديدة بألوان مخصصة</span>
          </button>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-darkslate-850">
          <div className="text-xs text-slate-400">
            {savedMsg && (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-4 h-4" />
                تم حفظ التعديلات بنجاح وربطها بكروت الدولاب!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition-colors"
            >
              إلغاء
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'جاري الحفظ...' : 'حفظ إعدادات الألوان'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
