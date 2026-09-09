import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  PieChart, 
  MapPin, 
  Activity, 
  Briefcase, 
  GraduationCap, 
  Layers, 
  RefreshCw,
  TrendingUp,
  Award
} from 'lucide-react';
import { authHeaders } from '../utils/auth';

export default function AnalyticsCharts({ activeBatch }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading && !analytics) {
    return (
      <div className="bg-darkslate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
        <span className="text-xs font-bold">جاري تحميل لوحة التحليلات والإحصائيات التفاعلية...</span>
      </div>
    );
  }

  const qualTotal = analytics?.qualifications?.reduce((acc, i) => acc + i.count, 0) || 1;
  const batchTotal = analytics?.batches?.reduce((acc, i) => acc + i.count, 0) || 1;

  // 10 Standard Tailwind colors matching data app skill
  const palette = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

  return (
    <div className="space-y-6">
      
      {/* Header with Title & Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">التحليلات البيانية والإحصائية التفاعلية</h2>
            <p className="text-[11px] text-slate-400">حصر فوري لبيانات المؤهلات، التوزيع الجغرافي، والدفوع التجنيدية</p>
          </div>
        </div>

        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          <span>تحديث التحليلات</span>
        </button>
      </div>

      {/* 4 Analytics Visual Panels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* 1. Qualifications Breakdown */}
        <div className="bg-darkslate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <GraduationCap className="w-4 h-4 text-emerald-400" />
              <span>توزيع المؤهلات الدراسية</span>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {qualTotal} مسجل
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            {analytics?.qualifications?.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">لا توجد بيانات مؤهلات مسجلة</p>
            ) : (
              analytics?.qualifications?.map((q, idx) => {
                const pct = Math.round((q.count / qualTotal) * 100);
                const color = palette[idx % palette.length];
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-300">{q.qualification}</span>
                      <span className="font-mono text-slate-400">{q.count} مجند ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 2. Recruitment Batches Comparison */}
        <div className="bg-darkslate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <Layers className="w-4 h-4 text-blue-400" />
              <span>مقارنة الدفوع التجنيدية الأربعة</span>
            </div>
            <span className="text-[11px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
              4 دفوع سنوية
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {analytics?.batches?.map((b, idx) => {
              const isActive = activeBatch && activeBatch.id === b.id;
              const pct = Math.round((b.count / batchTotal) * 100);
              return (
                <div 
                  key={idx} 
                  className={`p-3 rounded-xl border flex flex-col justify-between ${
                    isActive 
                      ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm' 
                      : 'bg-darkslate-850 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate">{b.name}</span>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                    )}
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-xl font-black text-white font-mono">{b.count}</span>
                    <span className="text-[11px] text-slate-400">{pct}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${isActive ? 'bg-emerald-400' : 'bg-blue-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Geographic Distribution (Governorates) */}
        <div className="bg-darkslate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <MapPin className="w-4 h-4 text-amber-400" />
              <span>الانتشار الجغرافي (المحافظات)</span>
            </div>
            <span className="text-[11px] text-slate-400">منطقة وسط الدلتا</span>
          </div>

          <div className="space-y-2 pt-1">
            {analytics?.governorates?.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">لا توجد عناوين مسجلة</p>
            ) : (
              analytics?.governorates?.map((gov, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-darkslate-850 px-3 py-2 rounded-xl border border-slate-800">
                  <span className="font-bold text-slate-300">{gov.name}</span>
                  <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                    {gov.count} مجند
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 4. Medical Fitness & Inspection Overview */}
        <div className="bg-darkslate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <Activity className="w-4 h-4 text-purple-400" />
              <span>مؤشرات المناظرة واللياقة الطبية</span>
            </div>
            <span className="text-[11px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
              فحص أمني وطبي
            </span>
          </div>

          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-darkslate-850 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">لائق طبياً وسليم</span>
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  {analytics?.medical?.healthy || 0}
                </span>
              </div>
              <div className="p-3 bg-darkslate-850 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">ملاحظات / عمليات</span>
                <span className="text-2xl font-black text-rose-400 font-mono">
                  {analytics?.medical?.withNotes || 0}
                </span>
              </div>
            </div>

            {/* Top Technical Trades / Occupations */}
            {analytics?.jobs && analytics.jobs.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] font-bold text-slate-400 block mb-2">
                  أبرز الحرف والمهن المسجلة للاستفادة منها بالمركز:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {analytics.jobs.map((j, jIdx) => (
                    <span key={jIdx} className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-semibold border border-slate-700 flex items-center gap-1.5">
                      <Briefcase className="w-3 h-3 text-slate-400" />
                      <span>{j.current_job} ({j.count})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
