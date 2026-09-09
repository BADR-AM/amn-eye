import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Filter, 
  Users, 
  Layers, 
  Calendar, 
  Camera, 
  Video, 
  Printer, 
  Eye, 
  Trash2, 
  PlusCircle, 
  RefreshCw,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Shield,
  BarChart3,
  TrendingUp,
  Sparkles,
  Download,
  IdCard
} from 'lucide-react';
import AnalyticsCharts from './AnalyticsCharts';
import SideInvestigationPanel from './SideInvestigationPanel';
import ExportModal from './ExportModal';
import { authHeaders } from '../utils/auth';

export default function Dashboard({ 
  stats, 
  batches, 
  activeBatch, 
  onOpenKiosk, 
  onSelectRecruit, 
  onPrintRecruit, 
  onDeleteRecruit,
  onOpenAiChat,
  onRefresh
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('all');
  const [selectedQualification, setSelectedQualification] = useState('all');
  const [recruits, setRecruits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // UI Modes
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [sidePanelRecruit, setSidePanelRecruit] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const userClosedPanel = useRef(false);

  const handleClosePanel = () => {
    userClosedPanel.current = true;
    setSidePanelRecruit(null);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const allVisibleSelected = recruits.length > 0 && recruits.every(r => selectedIds.includes(r.id));
  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(prev => prev.filter(id => !recruits.some(r => r.id === id)));
    } else {
      const visibleIds = recruits.map(r => r.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleUpdateRecruit = async (id, fields) => {
    try {
      const res = await fetch(`/api/recruits/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify(fields),
      });
      if (res.ok) {
        const updated = await res.json();
        setRecruits(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r));
        if (sidePanelRecruit?.id === id) {
          setSidePanelRecruit(prev => ({ ...prev, ...updated }));
        }
      }
    } catch (e) {
      console.error('Failed to update recruit:', e);
    }
  };

  // Fetch recruits with active filters
  const fetchRecruits = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        batch_id: selectedBatchId,
        qualification: selectedQualification,
        page: page.toString(),
        limit: '25'
      });

      const res = await fetch(`/api/recruits?${params.toString()}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('فشل جلب البيانات');
      const data = await res.json();
      setRecruits(data.recruits || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);

      // Auto select first recruit for side panel if none selected yet on desktop
      if (!sidePanelRecruit && !userClosedPanel.current && data.recruits && data.recruits.length > 0) {
        setSidePanelRecruit(data.recruits[0]);
      }
    } catch (err) {
      console.error('Error fetching recruits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecruits();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedBatchId, selectedQualification, page]);

  // Video completion rate calculation
  const totalRecruits = stats?.totalRecruits || 0;
  const videoRate = totalRecruits > 0 ? Math.round(((stats?.withVideo || 0) / totalRecruits) * 100) : 0;
  const photoRate = totalRecruits > 0 ? Math.round(((stats?.withPhoto || 0) / totalRecruits) * 100) : 0;

  return (
    <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* 1. Enhanced KPI Cards Row with Trend Indicators and Sparkline Bars */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Recruits */}
        <div className="bg-darkslate-900 border border-slate-800 p-4 rounded-2xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">إجمالي المجندين المقيدين</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {stats?.totalRecruits || 0}
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              قاعدة البيانات
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-blue-500 h-full w-full rounded-full"></div>
          </div>
        </div>

        {/* Card 2: Active Batch */}
        <div className="bg-darkslate-900 border border-emerald-500/30 p-4 rounded-2xl shadow-lg relative overflow-hidden group hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 truncate">
              {activeBatch ? activeBatch.name : 'الدفع الحالي'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono">
              {stats?.activeBatchRecruits || 0}
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              الدفع النشط
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-500 h-full w-full rounded-full"></div>
          </div>
        </div>

        {/* Card 3: Registered Today */}
        <div className="bg-darkslate-900 border border-slate-800 p-4 rounded-2xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">حضور وفحص اليوم</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {stats?.todayRecruits || 0}
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              حضور اليوم
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-amber-500 h-full w-full rounded-full"></div>
          </div>
        </div>

        {/* Card 4: Video Media Completion */}
        <div className="bg-darkslate-900 border border-slate-800 p-4 rounded-2xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">اكتمال مقاطع الفيديو (30ث)</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Video className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {stats?.withVideo || 0}
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              {videoRate}% مكتمل
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-purple-500 h-full rounded-full transition-all"
              style={{ width: `${videoRate}%` }}
            />
          </div>
        </div>

      </div>

      {/* 2. Toolbar (Search, Filters, Analytics Toggle, AI Assistant Trigger) */}
      <div className="bg-darkslate-900 border border-slate-800 p-4 rounded-2xl shadow-lg space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3 sm:justify-between">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="بحث فوري بالاسم الرباعي، الرقم القومي، السكن، أو المهنة..."
            className="w-full bg-darkslate-850 border border-slate-700/80 focus:border-emerald-500 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        {/* Filter & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Batches Filter */}
          <div className="flex items-center gap-1.5 bg-darkslate-850 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedBatchId}
              onChange={(e) => {
                setSelectedBatchId(e.target.value);
                userClosedPanel.current = false;
                setPage(1);
              }}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-darkslate-900">كافة الدفوع</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id} className="bg-darkslate-900">
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Qualification Filter */}
          <div className="flex items-center gap-1.5 bg-darkslate-850 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedQualification}
              onChange={(e) => {
                setSelectedQualification(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-darkslate-900">كافة المؤهلات</option>
              <option value="عالي" className="bg-darkslate-900">عالي</option>
              <option value="فوق متوسط" className="bg-darkslate-900">فوق متوسط</option>
              <option value="متوسط" className="bg-darkslate-900">متوسط</option>
              <option value="عادة" className="bg-darkslate-900">عادة</option>
              <option value="محو أمية" className="bg-darkslate-900">محو أمية</option>
            </select>
          </div>

          {/* Analytics Toggle Button */}
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
              showAnalytics
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                : 'bg-darkslate-850 hover:bg-slate-800 text-slate-300 border-slate-700/80'
            }`}
            title="عرض / إخفاء التحليلات البيانية"
          >
            <BarChart3 className="w-4 h-4" />
            <span>التحليلات البيانية</span>
          </button>

          {/* AI Assistant Button */}
          <button
            onClick={onOpenAiChat}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950/40 transition-all transform hover:scale-[1.02]"
            title="فتح مساعد التحريات الذكي"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>المساعد الذكي (AI)</span>
          </button>

          {/* Export & Locker Cards Button */}
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/40 transition-all shadow-sm"
            title="تصدير كروت الدولاب واستخراج البيانات"
          >
            <IdCard className="w-4 h-4 text-orange-400" />
            <span>كروت الدولاب والتصدير</span>
            {selectedIds.length > 0 && (
              <span className="mr-1 px-1.5 py-0.5 bg-orange-500 text-black font-black rounded-full text-[10px]">
                {selectedIds.length}
              </span>
            )}
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => {
              fetchRecruits();
              onRefresh();
            }}
            className="p-2.5 rounded-xl bg-darkslate-850 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/80 transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>

      </div>

      {/* 3. Collapsible Analytics Section (ECharts / Visual Insights) */}
      {showAnalytics && (
        <div className="bg-darkslate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl transition-all duration-300">
          <AnalyticsCharts activeBatch={activeBatch} />
        </div>
      )}

      {/* 4. Master-Detail Split Content Layout */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        
        {/* Primary Data Table (Takes w-full or w-2/3 when Side Panel is open) */}
        <div className={`transition-all duration-300 ${sidePanelRecruit ? 'w-full lg:w-2/3' : 'w-full'}`}>
          <div className="bg-darkslate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">سجلات فحص المجندين</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {totalCount} مجند
                </span>
              </div>

              <button
                onClick={onOpenKiosk}
                className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>تسجيل استمارة جديدة</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-darkslate-850 border-b border-slate-800 text-slate-400 font-bold sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-2 w-9 text-center">
                      <input 
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAll}
                        className="rounded bg-slate-800 border-slate-700 text-orange-500 focus:ring-orange-500 cursor-pointer"
                        title="تحديد كل المجندين المعروضين"
                      />
                    </th>
                    <th className="py-3 px-3 w-12 text-center">الصورة</th>
                    <th className="py-3 px-3">اسم المجند</th>
                    <th className="py-3 px-3 font-mono">الرقم القومي</th>
                    <th className="py-3 px-3">المؤهل</th>
                    {!sidePanelRecruit && (
                      <>
                        <th className="py-3 px-3">الدفع التجنيدي</th>
                        <th className="py-3 px-3">المهنة الحالية</th>
                        <th className="py-3 px-3 text-center">الوسائط</th>
                      </>
                    )}
                    <th className="py-3 px-3 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-200">
                  {recruits.length === 0 ? (
                    <tr>
                      <td colSpan={sidePanelRecruit ? 6 : 9} className="py-12 text-center text-slate-500">
                        <Shield className="w-12 h-12 mx-auto mb-2 stroke-1 text-slate-600" />
                        {loading ? 'جاري تحميل البيانات...' : 'لا يوجد مجندين مطابقين لمعايير البحث الحالية.'}
                      </td>
                    </tr>
                  ) : (
                    recruits.map((r) => {
                      const isSelected = sidePanelRecruit && sidePanelRecruit.id === r.id;
                      const isChecked = selectedIds.includes(r.id);
                      return (
                        <tr 
                          key={r.id} 
                          className={`transition-colors cursor-pointer group ${
                            isSelected 
                              ? 'bg-emerald-950/30 border-r-4 border-r-emerald-500' 
                              : isChecked
                              ? 'bg-orange-950/20'
                              : 'hover:bg-slate-800/50'
                          }`}
                          onClick={() => {
                            userClosedPanel.current = false;
                            setSidePanelRecruit(r);
                          }}
                        >
                          {/* Checkbox */}
                          <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelect(r.id)}
                              className="rounded bg-slate-800 border-slate-700 text-orange-500 focus:ring-orange-500 cursor-pointer"
                            />
                          </td>
                          {/* Photo Thumbnail */}
                          <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 mx-auto shrink-0">
                              {r.photo_path ? (
                                <img src={r.photo_path} alt={r.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-500 text-[9px] font-bold">
                                  لا صورة
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Name */}
                          <td className="py-2 px-3">
                            <div className={`font-extrabold text-sm transition-colors ${isSelected ? 'text-emerald-300' : 'text-white group-hover:text-emerald-300'}`}>
                              {r.name}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-xs">
                              {r.address}
                            </div>
                          </td>

                          {/* National ID */}
                          <td className="py-2 px-3 font-mono font-bold text-slate-300">
                            {r.national_id}
                          </td>

                          {/* Qualification */}
                          <td className="py-2 px-3">
                            <span className="font-semibold text-slate-200">{r.qualification}</span>
                          </td>

                          {/* Extra Columns when side panel is closed */}
                          {!sidePanelRecruit && (
                            <>
                              <td className="py-2 px-3">
                                <span className="inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold bg-darkslate-850 border border-slate-700/80 text-emerald-300">
                                  {r.batch_name}
                                </span>
                              </td>

                              <td className="py-2 px-3 text-slate-400">
                                {r.current_job || 'بدون عمل'}
                              </td>

                              <td className="py-2 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {r.photo_path && (
                                    <span className="p-1 rounded bg-emerald-500/10 text-emerald-400" title="الصورة ملتقطة">
                                      <Camera className="w-3.5 h-3.5" />
                                    </span>
                                  )}
                                  {r.video_path && (
                                    <span className="p-1 rounded bg-rose-500/10 text-rose-400" title="فيديو 30ث مسجل">
                                      <Video className="w-3.5 h-3.5" />
                                    </span>
                                  )}
                                </div>
                              </td>
                            </>
                          )}

                          {/* Actions */}
                          <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => onSelectRecruit(r)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white transition-colors"
                                title="عرض الملف الكامل (Dossier)"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedIds([r.id]);
                                  setShowExportModal(true);
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-orange-600 text-slate-300 hover:text-white transition-colors"
                                title="كارت الدولاب الرسمي"
                              >
                                <IdCard className="w-3.5 h-3.5 text-orange-400" />
                              </button>

                              <button
                                onClick={() => onPrintRecruit(r)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition-colors"
                                title="طباعة الاستمارة الرسمية A4"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => {
                                  if (confirm(`هل أنت متأكد من حذف ملف المجند "${r.name}"؟`)) {
                                    onDeleteRecruit(r.id);
                                    if (sidePanelRecruit && sidePanelRecruit.id === r.id) {
                                      setSidePanelRecruit(null);
                                    }
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition-colors"
                                title="حذف المجند"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>صفحة {page} من {totalPages}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Secondary Side Investigation Panel (Takes w-full or w-1/3) */}
        {sidePanelRecruit && (
          <div className="w-full lg:w-1/3 shrink-0">
            <SideInvestigationPanel
              recruit={sidePanelRecruit}
              onClose={handleClosePanel}
              onOpenFullDossier={onSelectRecruit}
              onPrint={onPrintRecruit}
              onOpenLockerCard={(r) => {
                setSelectedIds([r.id]);
                setShowExportModal(true);
              }}
            />
          </div>
        )}

      </div>

      {/* Export & Locker Cards Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        recruits={recruits}
        selectedRecruitIds={selectedIds}
        activeBatch={activeBatch}
        onUpdateRecruit={handleUpdateRecruit}
      />

    </div>
  );
}
