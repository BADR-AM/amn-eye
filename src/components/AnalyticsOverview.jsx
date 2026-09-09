import React, { useState, useEffect } from 'react';
import { 
  Users, ShieldAlert, ShieldCheck, Stethoscope, ChevronRight, 
  Layers, Calendar, Activity, BarChart2, CheckCircle2, ArrowUpRight
} from 'lucide-react';
import { getCompanyStyle } from '../utils/companyColors';

export default function AnalyticsOverview({ 
  selectedBatch, 
  companyColors = [], 
  onSelectCompany, 
  onSelectAttendanceDate,
  onOpenExportModal 
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/analytics/overview?batch_id=${selectedBatch || 'all'}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching analytics overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [selectedBatch]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-[#161616] border border-[#262626] p-4 animate-pulse h-24"></div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4 mb-6">
      
      {/* 1. Top IBM Carbon Metric Tiles (كروت الأرقام التكتيكية الكبيرة) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Total Strength */}
        <div className="bg-[#161616] border border-[#393939] hover:border-[#525252] p-4 transition-all relative overflow-hidden group">
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

        {/* Medically / Security Sound */}
        <div className="bg-[#161616] border border-[#393939] hover:border-[#525252] p-4 transition-all relative overflow-hidden group">
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

        {/* Security / Investigation Flags */}
        <div className="bg-[#161616] border border-[#393939] hover:border-[#525252] p-4 transition-all relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono tracking-wider text-gray-400 uppercase">ملاحظات وتحفظات أمنية</span>
            <ShieldAlert className="w-5 h-5 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-400 font-mono">{data.flagged}</span>
            <span className="text-xs text-gray-400">حالة</span>
          </div>
          <div className="mt-2 text-xs text-gray-400 flex items-center justify-between border-t border-[#262626] pt-2">
            <span>تستوجب متابعة التحريات:</span>
            <span className="text-amber-400 font-bold">
              {data.total > 0 ? Math.round((data.flagged / data.total) * 100) : 0}%
            </span>
          </div>
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500"></div>
        </div>

        {/* Currently in Police Hospital */}
        <div className={`p-4 transition-all relative overflow-hidden border ${
          data.inHospitalNow > 0 
            ? 'bg-[#241212] border-red-500/60 shadow-lg' 
            : 'bg-[#161616] border-[#393939]'
        }`}>
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
            <span className="text-xs text-gray-400">مجند خارج المعسكر</span>
          </div>
          <div className="mt-2 text-xs text-gray-400 flex items-center justify-between border-t border-[#333333] pt-2">
            <span>الموقف الإجمالي:</span>
            <span className="text-red-400 font-bold">
              {data.inHospitalNow > 0 ? 'متابعة مفتوحة' : 'الجميع بالمعسكر'}
            </span>
          </div>
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500"></div>
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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {companyColors.map((c) => {
            const row = data.companyDistribution?.find(d => d.company === c.match || d.company?.includes(c.match));
            const count = row ? row.count : 0;
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
        </div>
      </div>

      {/* 3. Daily Attendance & Medical Log Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        
        {/* Attendance Days Trend */}
        <div className="bg-[#161616] border border-[#393939] p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3 border-b border-[#262626] pb-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#0f62fe]" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                معدل تسجيل وحضور المجندين (آخر أيام الاستقبال)
              </h4>
            </div>
            <span className="text-xs text-gray-400">انقر على التاريخ للتصفية المباشرة</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {data.attendanceTrends && data.attendanceTrends.length > 0 ? (
              data.attendanceTrends.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectAttendanceDate?.(item.attendance_date)}
                  className="bg-[#212121] border border-[#333333] hover:border-[#0f62fe] p-2.5 text-right transition-colors"
                >
                  <span className="text-xs text-gray-400 block font-mono">{item.attendance_date}</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-lg font-bold text-white font-mono">{item.count}</span>
                    <span className="text-[11px] text-[#0f62fe]">حضور</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="col-span-4 text-center py-4 text-xs text-gray-500">
                لا توجد سجلات حضور مسجلة
              </div>
            )}
          </div>
        </div>

        {/* Medical Decisions Breakdown */}
        <div className="bg-[#161616] border border-[#393939] p-4">
          <div className="flex items-center justify-between mb-3 border-b border-[#262626] pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-red-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                مؤشرات القرارات الطبية
              </h4>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            {data.medicalDecisions && data.medicalDecisions.length > 0 ? (
              data.medicalDecisions.map((med, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-[#212121] border border-[#2d2d2d]">
                  <span className="text-gray-300 font-medium">{med.medical_decision}</span>
                  <span className="font-mono font-bold text-white bg-[#161616] px-2 py-0.5 border border-[#393939]">
                    {med.count}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500 text-xs">
                لم يتم تسجيل قرارات طبية بعد
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
