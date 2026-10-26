import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, ShieldAlert, ShieldCheck, Stethoscope, ChevronRight, 
  Layers, Calendar, Activity, BarChart2, CheckCircle2, ArrowUpRight,
  Brain, AlertOctagon, GraduationCap, Shield
} from 'lucide-react';
import { getCompanyStyle, getCompanyColorConfig } from '../utils/companyColors';
import { authHeaders } from '../utils/auth';

function AnalyticsOverview({ 
  selectedBatch, 
  companyColors = [], 
  onSelectCompany, 
  onSelectAttendanceDate,
  onOpenExportModal,
  onSelectCategory,
  activeCategory = 'all',
  refreshTrigger
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const res = await fetch(`/api/analytics/overview?batch_id=${selectedBatch || 'all'}`, {
        headers: authHeaders()
      });
      if (res.ok) {
        const json = await res.json();
        setData(json.data || json);
      }
    } catch (err) {
      console.error('Error fetching analytics overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview(false);
  }, [selectedBatch]);

  useEffect(() => {
    if (refreshTrigger) {
      fetchOverview(true);
    }
  }, [refreshTrigger]);

  // Real-time synchronized company counts with 100% mathematical consistency to data.total
  const { countsMap, unassignedCount } = useMemo(() => {
    const map = {};
    (companyColors || []).forEach(c => { map[c.id] = 0; });
    let unassigned = 0;

    if (data && Array.isArray(data.companyDistribution)) {
      for (const item of data.companyDistribution) {
        if (!item.company || String(item.company).trim() === '') {
          unassigned += (item.count || 0);
          continue;
        }
        const config = getCompanyColorConfig(item.company, companyColors);
        if (config && config.id && map[config.id] !== undefined) {
          map[config.id] += (item.count || 0);
        } else {
          unassigned += (item.count || 0);
        }
      }
    }

    // Calculate total mapped across all discrete companies (including numbered companies, security & base force)
    const mappedSum = Object.keys(map).reduce((sum, k) => sum + (map[k] || 0), 0);
    if (data && data.total > (mappedSum + unassigned)) {
      unassigned = data.total - mappedSum;
    }

    return { countsMap: map, unassignedCount: unassigned };
  }, [data?.companyDistribution, data?.total, data?.base_force, companyColors]);

  if (loading && !data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="bg-[#161616] border border-[#262626] p-4 animate-pulse h-24"></div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4 mb-6">
      
      {/* 1. Top IBM Carbon Metric Tiles (كروت الأرقام التكتيكية الكبيرة) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        
        {/* Total Strength */}
        <div 
          onClick={() => onSelectCategory && onSelectCategory('all')}
          className={`bg-[#161616] border p-4 transition-all relative overflow-hidden group cursor-pointer ${
            activeCategory === 'all' ? 'border-[#0f62fe] ring-1 ring-[#0f62fe]' : 'border-[#393939] hover:border-[#525252]'
          }`}
          title="عرض جميع المجندين"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono tracking-wider text-gray-400 uppercase">إجمالي القوة المقيدة</span>
            <Users className="w-5 h-5 text-[#0f62fe]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">{data.total}</span>
            <span className="text-xs text-gray-400">مجند</span>
          </div>
          <div className="mt-2 text-xs text-gray-400 flex items-center justify-between border-t border-[#262626] pt-2">
            <span>نسبة الاستيعاب:</span>
            <span className="text-emerald-400 font-bold">100%</span>
          </div>
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#0f62fe]"></div>
        </div>

        {/* NEW: Psychological & Nervous Cases (غير متزنين نفسياً للمتابعة الدورية) */}
        <div 
          onClick={() => onSelectCategory && onSelectCategory('psychological')}
          className={`p-4 transition-all relative overflow-hidden border cursor-pointer group ${
            activeCategory === 'psychological'
              ? 'bg-[#29132d] border-fuchsia-500 ring-2 ring-fuchsia-500/50 shadow-xl'
              : data.psychologicalCount > 0
                ? 'bg-[#1e1022] border-fuchsia-500/40 hover:border-fuchsia-400'
                : 'bg-[#161616] border-[#393939] hover:border-[#525252]'
          }`}
          title="انقر لفلترة وعرض الحالات النفسية والعصبية للمتابعة الدورية"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono tracking-wider text-fuchsia-300 uppercase font-bold flex items-center gap-1.5">
              <span>غير متزنين نفسياً</span>
              {data.psychologicalCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-fuchsia-500 animate-pulse"></span>
              )}
            </span>
            <Brain className="w-5 h-5 text-fuchsia-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-fuchsia-300 font-mono">{data.psychologicalCount || 0}</span>
            <span className="text-xs text-fuchsia-400 font-semibold">حالة عصبية / نفسية</span>
          </div>
          <div className="mt-2 text-xs text-gray-400 flex items-center justify-between border-t border-fuchsia-900/40 pt-2">
            <span className="text-fuchsia-300/80">متابعة دورية:</span>
            <span className="text-fuchsia-400 font-bold">نشطة ومستمرة</span>
          </div>
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-fuchsia-500"></div>
        </div>

        {/* NEW: Active Tickets & Suspicion Alerts (تيكتات وبلاغات الاشتباه النشطة) */}
        <div 
          onClick={() => onSelectCategory && onSelectCategory('tickets')}
          className={`p-4 transition-all relative overflow-hidden border cursor-pointer group ${
            activeCategory === 'tickets'
              ? 'bg-[#2b1016] border-rose-500 ring-2 ring-rose-500/50 shadow-xl'
              : data.activeTicketsCount > 0
                ? 'bg-[#220d12] border-rose-500/50 hover:border-rose-400'
                : 'bg-[#161616] border-[#393939] hover:border-[#525252]'
          }`}
          title="انقر لفلترة المجندين الذين لديهم تيكتات وبلاغات اشتباه نشطة"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono tracking-wider text-rose-300 uppercase font-bold flex items-center gap-1">
              <span>تيكتات اشتباه نشطة</span>
              {data.activeTicketsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              )}
            </span>
            <AlertOctagon className="w-5 h-5 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-400 font-mono">{data.activeTicketsCount || 0}</span>
            <span className="text-xs text-rose-300">بلاغ مفتوح</span>
          </div>
          <div className="mt-2 text-[11px] text-gray-400 flex items-center justify-between border-t border-rose-900/40 pt-2">
            <span>جنائي ({data.criminalTicketsCount || 0})</span>
            <span>•</span>
            <span>سياسي ({data.politicalTicketsCount || 0})</span>
          </div>
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-rose-500"></div>
        </div>

        {/* Currently in Police Hospital */}
        <div 
          onClick={() => onSelectCategory && onSelectCategory('medical')}
          className={`p-4 transition-all relative overflow-hidden border cursor-pointer ${
            activeCategory === 'medical'
              ? 'bg-[#261010] border-red-500 ring-2 ring-red-500/50'
              : data.inHospitalNow > 0 
                ? 'bg-[#241212] border-red-500/60 shadow-lg' 
                : 'bg-[#161616] border-[#393939] hover:border-[#525252]'
          }`}
          title="انقر لفلترة الحالات المرضية ومستشفى الشرطة"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono tracking-wider text-gray-300 uppercase flex items-center gap-1.5">
              <span>بمستشفى الشرطة حالياً</span>
              {data.inHospitalNow > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              )}
            </span>
            <Stethoscope className="w-5 h-5 text-red-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-red-400 font-mono">{data.inHospitalNow}</span>
            <span className="text-xs text-gray-400">مجند بالعيادات</span>
          </div>
          <div className="mt-2 text-xs text-gray-400 flex items-center justify-between border-t border-[#333333] pt-2">
            <span>الموقف:</span>
            <span className="text-red-400 font-bold">
              {data.inHospitalNow > 0 ? 'متابعة مفتوحة' : 'الجميع بالمعسكر'}
            </span>
          </div>
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500"></div>
        </div>

        {/* Medically / Security Sound */}
        <div 
          onClick={() => onSelectCategory && onSelectCategory('all')}
          className="bg-[#161616] border border-[#393939] hover:border-[#525252] p-4 transition-all relative overflow-hidden group cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono tracking-wider text-gray-400 uppercase">موقف أمني وجنائي لائق</span>
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400 font-mono">{data.clean}</span>
            <span className="text-xs text-gray-400">مجند</span>
          </div>
          <div className="mt-2 text-xs text-gray-400 flex items-center justify-between border-t border-[#262626] pt-2">
            <span>نسبة المطابقة:</span>
            <span className="text-emerald-400 font-bold">
              {data.total > 0 ? Math.round((data.clean / data.total) * 100) : 0}%
            </span>
          </div>
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-500"></div>
        </div>

      </div>

      {/* 2. Interactive Company Distribution Infographic (إنفوجرافيك توزيع السرايا التفاعلي) */}
      <div className="bg-[#161616] border border-[#393939] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 border-b border-[#262626] pb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#0f62fe]" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              توزيع القوة على السرايا (انقر على السرية للفلترة أو تصدير كروت الدواليب)
            </h3>
          </div>
          <button
            onClick={() => onOpenExportModal?.()}
            className="text-xs text-[#0f62fe] hover:text-[#4589ff] flex items-center gap-1 font-semibold"
          >
            <span>تصدير كروت الدواليب دفعة واحدة</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Company cards with guaranteed sync to total */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {companyColors.map((c) => {
            const count = countsMap[c.id] || 0;
            const percentage = data.total > 0 ? Math.round((count / data.total) * 100) : 0;

            return (
              <button
                key={c.id}
                onClick={() => onSelectCompany?.(c.match)}
                className="text-right p-3 border transition-all hover:scale-[1.02] active:scale-[0.99] relative group bg-[#1f1f1f] hover:bg-[#262626]"
                style={{ borderTop: `4px solid ${c.color}` }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-200">{c.name}</span>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }}></span>
                </div>

                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl font-black text-white font-mono">{count}</span>
                  <span className="text-xs text-gray-400 font-mono">{percentage}%</span>
                </div>

                {/* Mini progress bar */}
                <div className="w-full bg-[#111111] h-1.5 mt-2 rounded-none overflow-hidden">
                  <div 
                    className="h-full transition-all duration-500"
                    style={{ width: `${percentage}%`, backgroundColor: c.color }}
                  ></div>
                </div>
              </button>
            );
          })}

          {unassignedCount > 0 && (
            <button
              onClick={() => onSelectCompany?.('بدون')}
              className="text-right p-3 border transition-all hover:scale-[1.02] active:scale-[0.99] relative group bg-[#1a1a1a] hover:bg-[#262626] border-slate-700"
              style={{ borderTop: `4px solid #64748b` }}
              title="مجندون بدون تسكين في سرية بعد"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-gray-300">بدون سرية</span>
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
              </div>

              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-black text-amber-400 font-mono">{unassignedCount}</span>
                <span className="text-xs text-gray-400 font-mono">
                  {data.total > 0 ? Math.round((unassignedCount / data.total) * 100) : 0}%
                </span>
              </div>

              <div className="w-full bg-[#111111] h-1.5 mt-2 overflow-hidden">
                <div 
                  className="h-full bg-slate-500 transition-all duration-500"
                  style={{ width: `${data.total > 0 ? Math.round((unassignedCount / data.total) * 100) : 0}%` }}
                ></div>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* 3. Daily Attendance, Medical Fitness & Qualifications Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        
        {/* Attendance Days Trend (2 columns) */}
        <div className="bg-[#161616] border border-[#393939] p-4 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-[#262626] pb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0f62fe]" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  معدل تسجيل وحضور المجندين (أيام الاستقبال)
                </h4>
              </div>
              <div className="flex items-center gap-2">
                {data.attendanceTrends && data.attendanceTrends.length > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-[#0f62fe]/10 text-[#0f62fe] border border-[#0f62fe]/30 font-bold">
                    إجمالي: {data.attendanceTrends.reduce((s, i) => s + (i.count || 0), 0)} مجند
                  </span>
                )}
                <span className="text-[11px] text-gray-400 hidden sm:inline">انقر للتصفية</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {data.attendanceTrends && data.attendanceTrends.length > 0 ? (
                (() => {
                  const maxDay = Math.max(...data.attendanceTrends.map(t => t.count || 0), 1);
                  return data.attendanceTrends.map((item, idx) => {
                    const pct = Math.round(((item.count || 0) / maxDay) * 100);
                    return (
                      <button
                        key={idx}
                        onClick={() => onSelectAttendanceDate?.(item.attendance_date)}
                        className="bg-[#212121] border border-[#333333] hover:border-[#0f62fe] p-2.5 text-right transition-all group"
                        title={`تصفية مجندي يوم ${item.attendance_date}`}
                      >
                        <span className="text-[11px] text-gray-400 block font-mono group-hover:text-white transition-colors">
                          {item.attendance_date}
                        </span>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-lg font-bold text-white font-mono">{item.count}</span>
                          <span className="text-[10px] text-[#0f62fe] font-bold">حضور</span>
                        </div>
                        <div className="w-full bg-[#111] h-1 mt-1.5 overflow-hidden">
                          <div 
                            className="h-full bg-[#0f62fe] transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </button>
                    );
                  });
                })()
              ) : (
                <div className="col-span-4 text-center py-6 text-xs text-gray-500">
                  لا توجد سجلات حضور مسجلة
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Medical Decisions & Fitness Breakdown (1 column) */}
        <div className="bg-[#161616] border border-[#393939] p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-[#262626] pb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-red-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  مؤشرات القرارات الطبية
                </h4>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/30 font-bold">
                حالات: {(data.medicalDecisions || []).reduce((s, m) => s + (m.count || 0), 0)}
              </span>
            </div>

            {/* Medical Fitness Summary Mini-Gauge */}
            <div className="mb-3 p-2 bg-[#1b1b1b] border border-[#2e2e2e] flex items-center justify-between text-[11px]">
              <span className="text-emerald-400 font-bold">لائق: {data.medically_fit || 0}</span>
              <span className="text-gray-500">•</span>
              <span className="text-rose-400 font-bold">غير لائق: {data.medically_unfit || 0}</span>
              <span className="text-gray-500">•</span>
              <span className="text-amber-400 font-bold">تحت الفحص: {data.medically_undetermined || 0}</span>
            </div>

            <div className="space-y-1.5 text-xs max-h-48 overflow-y-auto">
              {data.medicalDecisions && data.medicalDecisions.length > 0 ? (
                data.medicalDecisions.map((med, idx) => {
                  const isFit = med.medical_decision.includes('لائق');
                  const isPsych = med.medical_decision.includes('مستقر') || med.medical_decision.includes('نفسي');
                  const isRest = med.medical_decision.includes('راحة') || med.medical_decision.includes('كشف');
                  const dotColor = isFit ? 'bg-emerald-400' : (isPsych ? 'bg-purple-400' : (isRest ? 'bg-amber-400' : 'bg-cyan-400'));

                  return (
                    <div key={idx} className="flex items-center justify-between p-2 bg-[#212121] border border-[#2d2d2d] hover:border-gray-600 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`}></span>
                        <span className="text-gray-200 font-medium truncate" title={med.medical_decision}>
                          {med.medical_decision}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-white bg-[#161616] px-2 py-0.5 border border-[#393939] shrink-0">
                        {med.count}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-gray-500 text-xs">
                  لم يتم تسجيل قرارات طبية بعد
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Educational Qualifications Profile (1 column) */}
        <div className="bg-[#161616] border border-[#393939] p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-[#262626] pb-2">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  توزيع المؤهلات الدراسية
                </h4>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                {data.total} مجند
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {data.qualificationStats && data.qualificationStats.length > 0 ? (
                (() => {
                  // Consolidate qualifications into clean categories
                  const qualMap = {};
                  for (const q of data.qualificationStats) {
                    const raw = String(q.qualification || 'بدون').trim();
                    let key = raw;
                    if (raw.includes('متوسط') && !raw.includes('فوق')) key = 'مؤهل متوسط';
                    else if (raw.includes('فوق متوسط')) key = 'مؤهل فوق متوسط';
                    else if (raw.includes('عالي') || raw.includes('عالم') || raw.includes('بكالوريوس') || raw.includes('ليسانس')) key = 'مؤهل عالي';
                    else if (raw.includes('أمي') || raw.includes('امي') || raw.includes('محو')) key = 'محو أمية / أمي';
                    else if (raw.includes('اعدادي') || raw.includes('إعدادي')) key = 'إعدادية';
                    else if (raw.includes('ابتدائي') || raw.includes('إبتدائي')) key = 'ابتدائية';
                    else key = raw;

                    qualMap[key] = (qualMap[key] || 0) + (q.count || 0);
                  }

                  const sorted = Object.entries(qualMap).sort((a, b) => b[1] - a[1]);
                  const topQuals = sorted.slice(0, 5);

                  return topQuals.map(([name, count], idx) => {
                    const pct = data.total > 0 ? Math.round((count / data.total) * 100) : 0;
                    const colors = [
                      'bg-emerald-500',
                      'bg-blue-500',
                      'bg-purple-500',
                      'bg-amber-500',
                      'bg-cyan-500'
                    ];
                    const barColor = colors[idx % colors.length];

                    return (
                      <div key={idx} className="p-2 bg-[#212121] border border-[#2d2d2d]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-300 font-medium truncate">{name}</span>
                          <span className="font-mono font-bold text-white text-[11px] flex items-center gap-1.5">
                            <span>{count}</span>
                            <span className="text-gray-400 text-[10px]">({pct}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-[#111] h-1.5 overflow-hidden">
                          <div 
                            className={`h-full ${barColor} transition-all duration-300`}
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  });
                })()
              ) : (
                <div className="text-center py-6 text-gray-500 text-xs">
                  لا توجد إحصائيات مؤهلات
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

export default React.memo(AnalyticsOverview);
