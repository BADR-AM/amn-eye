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
  IdCard,
  Palette,
  LayoutGrid,
  List,
  Stethoscope,
  Keyboard,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Scan,
  FileCheck,
  Brain,
  AlertOctagon
} from 'lucide-react';
import AnalyticsCharts from './AnalyticsCharts';
import AnalyticsOverview from './AnalyticsOverview';
import SideInvestigationPanel from './SideInvestigationPanel';
import ExportModal from './ExportModal';
import CompanyColorsModal from './CompanyColorsModal';
import ActivityLogModal from './ActivityLogModal';
import RecruitDocumentsModal from './RecruitDocumentsModal';
import TicketModal from './TicketModal';
import PsychologicalFollowupModal from './PsychologicalFollowupModal';
import { fetchCompanyColors, DEFAULT_COMPANY_COLORS, getCompanyStyle } from '../utils/companyColors';
import { authHeaders } from '../utils/auth';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

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
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [recruits, setRecruits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // View Mode: 'table' or 'grid' (Large Carbon Cards)
  const [viewMode, setViewMode] = useState('grid');
  const [focusedIndex, setFocusedIndex] = useState(0);

  // UI Modals & Panels
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [sidePanelRecruit, setSidePanelRecruit] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCompanyColorsModal, setShowCompanyColorsModal] = useState(false);
  const [activityRecruit, setActivityRecruit] = useState(null);
  const [documentsRecruit, setDocumentsRecruit] = useState(null);
  const [ticketRecruit, setTicketRecruit] = useState(null);
  const [psychologicalRecruit, setPsychologicalRecruit] = useState(null);
  const [companyColors, setCompanyColors] = useState(DEFAULT_COMPANY_COLORS);
  
  const userClosedPanel = useRef(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    fetchCompanyColors().then(data => {
      if (data && Array.isArray(data)) setCompanyColors(data);
    });
  }, []);

  // Keyboard navigation hook
  useKeyboardShortcuts({
    itemsCount: recruits.length,
    selectedIndex: focusedIndex,
    setSelectedIndex: (newIdx) => {
      setFocusedIndex(newIdx);
      if (typeof newIdx === 'number' && recruits[newIdx]) {
        if (!userClosedPanel.current && sidePanelRecruit) {
          setSidePanelRecruit(recruits[newIdx]);
        }
      }
    },
    onOpenDetails: (idx) => {
      if (recruits[idx]) onSelectRecruit(recruits[idx]);
    },
    onOpenActivity: (idx) => {
      if (recruits[idx]) setActivityRecruit(recruits[idx]);
    },
    onOpenCard: (idx) => {
      if (recruits[idx]) {
        setSelectedIds([recruits[idx].id]);
        setShowExportModal(true);
      }
    },
    searchInputRef,
    enabled: !showExportModal && !showCompanyColorsModal && !activityRecruit && !documentsRecruit
  });

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
        company: selectedCompanyFilter,
        attendance_date: selectedDateFilter,
        category: selectedCategoryFilter,
        page: page.toString(),
        limit: '24'
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
  }, [searchTerm, selectedBatchId, selectedQualification, selectedCompanyFilter, selectedDateFilter, selectedCategoryFilter, page]);

  return (
    <div className="max-w-[1700px] w-full mx-auto px-4 sm:px-6 py-6 space-y-5 text-gray-100 font-sans">
      
      {/* 1. Interactive IBM Carbon Infographics & Telemetry Overview */}
      <AnalyticsOverview
        selectedBatch={selectedBatchId}
        companyColors={companyColors}
        onSelectCompany={(comp) => {
          setSelectedCompanyFilter(comp === selectedCompanyFilter ? 'all' : comp);
          setPage(1);
        }}
        onSelectAttendanceDate={(dt) => {
          setSelectedDateFilter(dt === selectedDateFilter ? 'all' : dt);
          setPage(1);
        }}
        onOpenExportModal={() => setShowExportModal(true)}
        onSelectCategory={(cat) => {
          setSelectedCategoryFilter(cat === selectedCategoryFilter ? 'all' : cat);
          setPage(1);
        }}
        activeCategory={selectedCategoryFilter}
      />

      {/* 1.5 Quick Tactical Category Filters (تبويبات الحالات الخاصة والاشتباهات والمتابعة الدورية) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#333333] pb-3">
        <button
          onClick={() => { setSelectedCategoryFilter('all'); setPage(1); }}
          className={`px-3 py-1.5 text-xs font-bold transition-all border flex items-center gap-1.5 ${
            selectedCategoryFilter === 'all'
              ? 'bg-[#0f62fe] text-white border-[#0f62fe] shadow-md'
              : 'bg-[#161616] text-gray-400 hover:text-white border-[#393939]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>كافة المجندين ({totalCount})</span>
        </button>

        <button
          onClick={() => { setSelectedCategoryFilter('psychological'); setPage(1); }}
          className={`px-3 py-1.5 text-xs font-bold transition-all border flex items-center gap-1.5 ${
            selectedCategoryFilter === 'psychological'
              ? 'bg-fuchsia-600 text-white border-fuchsia-500 shadow-md ring-2 ring-fuchsia-400/50'
              : 'bg-[#1a0f1e] text-fuchsia-300 hover:bg-fuchsia-950/60 border-fuchsia-800/60'
          }`}
        >
          <Brain className="w-3.5 h-3.5 text-fuchsia-400" />
          <span>غير متزنين نفسياً (الحالات النفسية والعصبية)</span>
        </button>

        <button
          onClick={() => { setSelectedCategoryFilter('tickets'); setPage(1); }}
          className={`px-3 py-1.5 text-xs font-bold transition-all border flex items-center gap-1.5 ${
            selectedCategoryFilter === 'tickets'
              ? 'bg-rose-600 text-white border-rose-500 shadow-md ring-2 ring-rose-400/50'
              : 'bg-[#220d12] text-rose-300 hover:bg-rose-950/60 border-rose-800/60'
          }`}
        >
          <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
          <span>تيكتات وبلاغات نشطة</span>
        </button>

        <button
          onClick={() => { setSelectedCategoryFilter('criminal_suspicion'); setPage(1); }}
          className={`px-3 py-1.5 text-xs font-bold transition-all border flex items-center gap-1.5 ${
            selectedCategoryFilter === 'criminal_suspicion'
              ? 'bg-red-700 text-white border-red-600 shadow-md ring-2 ring-red-400/50'
              : 'bg-[#1f1616] text-red-300 hover:bg-red-950/60 border-red-900/60'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span>اشتباه جنائي</span>
        </button>

        <button
          onClick={() => { setSelectedCategoryFilter('political_suspicion'); setPage(1); }}
          className={`px-3 py-1.5 text-xs font-bold transition-all border flex items-center gap-1.5 ${
            selectedCategoryFilter === 'political_suspicion'
              ? 'bg-purple-700 text-white border-purple-600 shadow-md ring-2 ring-purple-400/50'
              : 'bg-[#18111f] text-purple-300 hover:bg-purple-950/60 border-purple-900/60'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-purple-400" />
          <span>اشتباه سياسي</span>
        </button>

        <button
          onClick={() => { setSelectedCategoryFilter('medical'); setPage(1); }}
          className={`px-3 py-1.5 text-xs font-bold transition-all border flex items-center gap-1.5 ${
            selectedCategoryFilter === 'medical'
              ? 'bg-amber-600 text-white border-amber-500 shadow-md ring-2 ring-amber-400/50'
              : 'bg-[#1e1911] text-amber-300 hover:bg-amber-950/60 border-amber-800/60'
          }`}
        >
          <Stethoscope className="w-3.5 h-3.5 text-amber-400" />
          <span>حالات مرضية / مستشفى الشرطة</span>
        </button>
      </div>

      {/* 2. Tactical Control & Search Bar */}
      <div className="bg-[#161616] border border-[#393939] p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
        
        {/* Search Input & Active Filter Badges */}
        <div className="flex items-center gap-2 flex-1 min-w-[300px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="بحث بالاسم، رقم الشرطة، الرقم القومي، أو العنوان... (اضغط / للبحث السريع)"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#262626] border border-[#525252] text-white text-xs pr-9 pl-4 py-2.5 focus:outline-none focus:border-[#0f62fe] placeholder-gray-500 font-sans"
            />
          </div>

          {/* Quick Filters */}
          <select
            value={selectedBatchId}
            onChange={(e) => {
              setSelectedBatchId(e.target.value);
              setPage(1);
            }}
            className="bg-[#262626] border border-[#525252] text-white text-xs px-3 py-2.5 focus:border-[#0f62fe] focus:outline-none"
          >
            <option value="all">كافة الدفوع</option>
            {batches?.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <select
            value={selectedCompanyFilter}
            onChange={(e) => {
              setSelectedCompanyFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#262626] border border-[#525252] text-white text-xs px-3 py-2.5 focus:border-[#0f62fe] focus:outline-none"
          >
            <option value="all">كافة السرايا</option>
            {companyColors.map(c => (
              <option key={c.id} value={c.match}>{c.name}</option>
            ))}
          </select>

          {(selectedCompanyFilter !== 'all' || selectedDateFilter !== 'all') && (
            <button
              onClick={() => {
                setSelectedCompanyFilter('all');
                setSelectedDateFilter('all');
              }}
              className="text-xs text-amber-400 hover:text-amber-300 px-2 py-1 bg-amber-500/10 border border-amber-500/30"
            >
              إلغاء الفلاتر
            </button>
          )}
        </div>

        {/* View Mode Switcher, Actions & Shortcuts Help */}
        <div className="flex items-center gap-2">
          
          {/* Keyboard Navigation Helper Pill */}
          <div className="hidden xl:flex items-center gap-2 text-[11px] text-gray-400 bg-[#212121] px-2.5 py-1.5 border border-[#333333]">
            <Keyboard className="w-3.5 h-3.5 text-[#0f62fe]" />
            <span>كيبورد: <kbd className="bg-[#111] px-1 py-0.5 text-white">J/K</kbd> تنقل | <kbd className="bg-[#111] px-1 py-0.5 text-white">M</kbd> مستشفى | <kbd className="bg-[#111] px-1 py-0.5 text-white">P</kbd> كارت | <kbd className="bg-[#111] px-1 py-0.5 text-white">↵</kbd> تفاصيل</span>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center border border-[#525252] bg-[#262626] p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-[#0f62fe] text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
              title="عرض الكروت الكبيرة (Carbon Large Cards)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>كروت كبيرة</span>
            </button>

            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === 'table' 
                  ? 'bg-[#0f62fe] text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
              title="عرض الجدول الميداني"
            >
              <List className="w-3.5 h-3.5" />
              <span>جدول</span>
            </button>
          </div>

          {/* Bulk Export Locker Cards */}
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-[#f59e0b] hover:bg-[#d97706] text-black transition-colors"
            title="تصدير كروت الدواليب (PDF / صور PNG / إكسيل)"
          >
            <IdCard className="w-4 h-4" />
            <span>تصدير الكروت</span>
            {selectedIds.length > 0 && (
              <span className="bg-black text-amber-300 text-[10px] px-1.5 py-0.2 rounded font-mono">
                {selectedIds.length}
              </span>
            )}
          </button>

          {/* Company Colors Modal */}
          <button
            onClick={() => setShowCompanyColorsModal(true)}
            className="flex items-center gap-1 px-2.5 py-2 text-xs bg-[#262626] hover:bg-[#333333] text-gray-300 hover:text-white border border-[#525252]"
            title="تخصيص ألوان السرايا"
          >
            <Palette className="w-4 h-4 text-orange-400" />
            <span>ألوان السرايا</span>
          </button>

          {/* Refresh */}
          <button
            onClick={() => {
              fetchRecruits();
              onRefresh();
            }}
            className="p-2 bg-[#262626] hover:bg-[#333333] text-gray-300 hover:text-white border border-[#525252]"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0f62fe]' : ''}`} />
          </button>

          {/* Register New Recruit */}
          <button
            onClick={onOpenKiosk}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-[#0f62fe] hover:bg-[#0353e9] text-white"
          >
            <PlusCircle className="w-4 h-4" />
            <span>تسجيل مجند جديد</span>
          </button>

        </div>
      </div>

      {/* 3. Master Content: Large Cards Grid vs Table View */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        
        {/* Main Panel */}
        <div className={`transition-all duration-300 ${sidePanelRecruit ? 'w-full lg:w-2/3' : 'w-full'}`}>
          
          {recruits.length === 0 ? (
            <div className="bg-[#161616] border border-[#393939] p-16 text-center">
              <Shield className="w-14 h-14 mx-auto mb-3 stroke-1 text-gray-600" />
              <p className="text-base font-bold text-gray-300">
                {loading ? 'جاري تحميل البيانات...' : 'لا يوجد مجندين مطابقين لمعايير البحث الحالية.'}
              </p>
              <p className="text-xs text-gray-500 mt-1">تأكد من الفلاتر أو اضغط على إلغاء الفلاتر بالأعلى لعرض كافة المسجلين</p>
            </div>
          ) : viewMode === 'grid' ? (
            
            /* ============================================================ */
            /* A. IBM Carbon Large Cards View (كروت كبيرة سريعة الكيبورد) */
            /* ============================================================ */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                <span>عرض {recruits.length} مجند من إجمالي {totalCount}</span>
                <button onClick={toggleSelectAll} className="hover:text-white underline">
                  {allVisibleSelected ? 'إلغاء تحديد الكل' : 'تحديد كل المعروضين للتصدير'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                {recruits.map((r, idx) => {
                  const isFocused = idx === focusedIndex;
                  const isChecked = selectedIds.includes(r.id);
                  const companyStyle = getCompanyStyle(r.company, companyColors);
                  const isHospitalized = r.active_activity === 'medical_referral';

                  return (
                    <div
                      key={r.id}
                      onClick={() => {
                        setFocusedIndex(idx);
                        userClosedPanel.current = false;
                        setSidePanelRecruit(r);
                      }}
                      className={`relative bg-[#1f1f1f] border transition-all cursor-pointer select-none overflow-hidden ${
                        isFocused 
                          ? 'border-[#0f62fe] ring-2 ring-[#0f62fe]/50 shadow-xl scale-[1.01]' 
                          : 'border-[#393939] hover:border-[#525252]'
                      } ${isChecked ? 'bg-[#262116]' : ''}`}
                    >
                      {/* Top Company Color Strip */}
                      <div 
                        className="h-2 w-full transition-colors" 
                        style={{ backgroundColor: companyStyle.color }}
                      ></div>

                      <div className="p-4">
                        
                        {/* Header Row: Checkbox, Company Badge & Status */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSelect(r.id);
                              }}
                              className="rounded-none bg-[#161616] border-[#525252] text-[#0f62fe] focus:ring-0 cursor-pointer"
                            />
                            <span 
                              className="text-[11px] font-bold px-2 py-0.5 border"
                              style={{ 
                                backgroundColor: companyStyle.bg, 
                                color: companyStyle.text, 
                                borderColor: companyStyle.border 
                              }}
                            >
                              {r.company || 'بدون سرية'}
                            </span>
                          </div>

                          {/* Medical, Psychological, Tickets or Document Flags */}
                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            {r.is_psychological_case ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-fuchsia-950/70 text-fuchsia-300 border border-fuchsia-500/50 flex items-center gap-1" title={r.psychological_notes || 'حالة متابعة دورية نفسية وعصبية'}>
                                <Brain className="w-3 h-3 text-fuchsia-400" />
                                غير متزن نفسياً
                              </span>
                            ) : null}

                            {r.open_tickets_count > 0 ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-rose-950/70 text-rose-300 border border-rose-500/50 flex items-center gap-1 animate-pulse" title={`تيكت مفتوح: ${r.active_ticket_title || ''}`}>
                                <AlertOctagon className="w-3 h-3 text-rose-400" />
                                {r.open_tickets_count} تيكت
                              </span>
                            ) : null}

                            {(r.id_doc_front_path || r.id_doc_back_path) ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/30 flex items-center gap-1" title="تم مسح وثيقة التعارف المفصلة">
                                <FileCheck className="w-3 h-3 text-blue-400" />
                                وثيقة التعارف
                              </span>
                            ) : null}

                            {isHospitalized ? (
                              <span className="text-[11px] font-bold px-2 py-0.5 bg-red-600/20 text-red-400 border border-red-500/40 animate-pulse flex items-center gap-1">
                                <Stethoscope className="w-3 h-3" />
                                بالمستشفى
                              </span>
                            ) : r.activities_count > 0 ? (
                              <span className="text-[10px] font-medium text-gray-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                {r.activities_count} متابعة
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Middle Content: Photo & Details */}
                        <div className="flex items-start gap-3.5">
                          {/* Circular or Rounded Photo */}
                          <div className="w-16 h-16 shrink-0 bg-[#161616] border border-[#393939] overflow-hidden">
                            {r.photo_path ? (
                              <img src={r.photo_path} alt={r.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-600 text-[10px] font-bold">
                                لا صورة
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Prominent Name */}
                            <h4 className="text-base font-black text-white truncate leading-tight group-hover:text-[#0f62fe]">
                              {r.name}
                            </h4>

                            <div className="mt-1.5 space-y-0.5 text-xs text-gray-300 font-mono">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-400">رقم الشرطة:</span>
                                <span className="font-bold text-white bg-[#161616] px-1.5 border border-[#333]">
                                  {r.police_number || 'غير محدد'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-400">الرقم القومي:</span>
                                <span>{r.national_id || '---'}</span>
                              </div>
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-gray-400">المؤهل:</span>
                                <span className="truncate max-w-[120px] text-gray-300 font-sans">{r.qualification}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Hospital Active Destination Indicator */}
                        {isHospitalized && r.active_destination && (
                          <div className="mt-2.5 p-1.5 bg-red-950/40 border border-red-500/30 text-[11px] text-red-300 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                            <span className="truncate">محول إلى: <strong>{r.active_destination}</strong></span>
                          </div>
                        )}

                        {/* Bottom Actions Bar */}
                        <div className="mt-3 pt-2.5 border-t border-[#333333] flex items-center justify-between gap-1.5">
                          
                          {/* Medical Tracking Button (M) */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivityRecruit(r);
                            }}
                            className={`flex items-center gap-1 px-2 py-1 text-[11px] font-bold transition-colors ${
                              isHospitalized 
                                ? 'bg-red-600 hover:bg-red-500 text-white' 
                                : 'bg-[#2d2d2d] hover:bg-[#383838] text-gray-200 hover:text-white'
                            }`}
                            title="المتابعة الطبية ومستشفى الشرطة (M)"
                          >
                            <Stethoscope className="w-3.5 h-3.5 text-red-400" />
                            <span>المتابعة الطبية</span>
                          </button>

                          <div className="flex items-center gap-1">
                            {/* Security / Suspicion Ticket Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setTicketRecruit(r);
                              }}
                              className={`p-1.5 transition-colors ${
                                r.open_tickets_count > 0
                                  ? 'bg-rose-900/60 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/50 shadow'
                                  : 'bg-[#2d2d2d] hover:bg-rose-900/40 text-rose-400 hover:text-white'
                              }`}
                              title="إضافة أو رفع تيكت / بلاغ أمني (اشتباه جنائي/سياسي/مرضي)"
                            >
                              <AlertOctagon className="w-3.5 h-3.5" />
                            </button>

                            {/* Psychological & Nervous Follow-up Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPsychologicalRecruit(r);
                              }}
                              className={`p-1.5 transition-colors ${
                                r.is_psychological_case
                                  ? 'bg-fuchsia-900/60 hover:bg-fuchsia-600 text-fuchsia-200 hover:text-white border border-fuchsia-500/50 shadow'
                                  : 'bg-[#2d2d2d] hover:bg-fuchsia-900/40 text-fuchsia-400 hover:text-white'
                              }`}
                              title="المتابعة الدورية للحالات النفسية والعصبية"
                            >
                              <Brain className="w-3.5 h-3.5" />
                            </button>

                            {/* Scanned Identification & Military Documents */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDocumentsRecruit(r);
                              }}
                              className={`p-1.5 transition-colors ${
                                (r.id_doc_front_path || r.id_doc_back_path || r.military_record_path)
                                  ? 'bg-blue-900/40 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40'
                                  : 'bg-[#2d2d2d] hover:bg-[#383838] text-gray-400 hover:text-white'
                              }`}
                              title="وثيقة التعارف والسجل العسكري الممسوح ضوئياً"
                            >
                              <Scan className="w-3.5 h-3.5 text-blue-400" />
                            </button>
                            {/* Locker Card Preview (P) */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedIds([r.id]);
                                setShowExportModal(true);
                              }}
                              className="p-1.5 bg-[#2d2d2d] hover:bg-[#f59e0b] hover:text-black text-amber-400 transition-colors"
                              title="كارت الدولاب (P)"
                            >
                              <IdCard className="w-3.5 h-3.5" />
                            </button>

                            {/* Full Dossier (Enter) */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectRecruit(r);
                              }}
                              className="p-1.5 bg-[#2d2d2d] hover:bg-[#0f62fe] text-gray-300 hover:text-white transition-colors"
                              title="عرض الاستمارة والملف الكامل (Enter)"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Print */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onPrintRecruit(r);
                              }}
                              className="p-1.5 bg-[#2d2d2d] hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
                              title="طباعة الاستمارة"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>

                        </div>

                      </div>

                      {/* Focused Indicator Banner */}
                      {isFocused && (
                        <div className="absolute top-2 left-2 bg-[#0f62fe] text-white text-[9px] font-bold px-1 py-0.5 tracking-tighter uppercase">
                          محدد للكيبورد
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          ) : (
            
            /* ============================================================ */
            /* B. Field Table View (جدول البيانات الاحترافي)                */
            /* ============================================================ */
            <div className="bg-[#161616] border border-[#393939] shadow-xl overflow-hidden">
              <div className="p-3 border-b border-[#393939] flex items-center justify-between text-xs">
                <span className="font-bold text-gray-300">سجلات فحص المجندين ({totalCount} مجند)</span>
                <span className="text-gray-400">صفحة {page} من {totalPages}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#212121] border-b border-[#393939] text-gray-300 font-bold sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-2 w-8 text-center">
                        <input 
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleSelectAll}
                          className="bg-[#161616] border-[#525252] text-[#0f62fe] cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-2 w-10 text-center">الصورة</th>
                      <th className="py-2.5 px-3">الاسم الكامل</th>
                      <th className="py-2.5 px-3 font-mono">رقم الشرطة</th>
                      <th className="py-2.5 px-3">السرية</th>
                      <th className="py-2.5 px-3 font-mono">الرقم القومي</th>
                      <th className="py-2.5 px-3">الموقف الطبي</th>
                      <th className="py-2.5 px-3 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2b2b2b] text-gray-200">
                    {recruits.map((r, idx) => {
                      const isSelected = sidePanelRecruit && sidePanelRecruit.id === r.id;
                      const isChecked = selectedIds.includes(r.id);
                      const companyStyle = getCompanyStyle(r.company, companyColors);
                      const isHospitalized = r.active_activity === 'medical_referral';

                      return (
                        <tr 
                          key={r.id} 
                          className={`transition-colors cursor-pointer ${
                            isSelected 
                              ? 'bg-[#1b2b48] border-r-4 border-r-[#0f62fe]' 
                              : isChecked
                              ? 'bg-[#2b2416]'
                              : 'hover:bg-[#242424]'
                          }`}
                          onClick={() => {
                            setFocusedIndex(idx);
                            userClosedPanel.current = false;
                            setSidePanelRecruit(r);
                          }}
                        >
                          <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelect(r.id)}
                              className="bg-[#161616] border-[#525252] text-[#0f62fe] cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="w-8 h-8 bg-[#262626] border border-[#393939] mx-auto overflow-hidden">
                              {r.photo_path ? (
                                <img src={r.photo_path} alt={r.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-500 font-bold">
                                  لا صورة
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-bold text-white">{r.name}</div>
                            <div className="text-[10px] text-gray-400 truncate max-w-xs">{r.address}</div>
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-amber-300">
                            {r.police_number || '---'}
                          </td>
                          <td className="py-2 px-3">
                            <span 
                              className="px-2 py-0.5 text-[10px] font-bold border"
                              style={{ 
                                backgroundColor: companyStyle.bg, 
                                color: companyStyle.text, 
                                borderColor: companyStyle.border 
                              }}
                            >
                              {r.company || 'غير محدد'}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-gray-300">{r.national_id || '---'}</td>
                          <td className="py-2 px-3">
                            <div className="flex flex-col gap-1">
                              {isHospitalized ? (
                                <span className="px-2 py-0.5 bg-red-600/20 text-red-400 border border-red-500/40 text-[10px] font-bold animate-pulse">
                                  🏥 بمستشفى الشرطة
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-400">
                                  {r.medical_status?.includes('لائق') ? '✅ لائق' : r.medical_status || 'سليم'}
                                </span>
                              )}
                              {r.is_psychological_case ? (
                                <span className="px-1.5 py-0.5 bg-fuchsia-950/70 text-fuchsia-300 border border-fuchsia-500/50 text-[10px] font-bold flex items-center gap-1 w-fit">
                                  <Brain className="w-3 h-3 text-fuchsia-400" /> غير متزن نفسياً
                                </span>
                              ) : null}
                              {r.open_tickets_count > 0 ? (
                                <span className="px-1.5 py-0.5 bg-rose-950/70 text-rose-300 border border-rose-500/50 text-[10px] font-bold flex items-center gap-1 w-fit animate-pulse">
                                  <AlertOctagon className="w-3 h-3 text-rose-400" /> {r.open_tickets_count} تيكت نشط
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              {/* Security Ticket Button */}
                              <button
                                onClick={() => setTicketRecruit(r)}
                                className={`p-1 border border-[#444] transition-colors ${
                                  r.open_tickets_count > 0
                                    ? 'bg-rose-900/60 hover:bg-rose-600 text-rose-200'
                                    : 'bg-[#262626] hover:bg-rose-900/40 text-rose-400 hover:text-white'
                                }`}
                                title="إضافة أو رفع تيكت / بلاغ أمني (اشتباه جنائي/سياسي/مرضي)"
                              >
                                <AlertOctagon className="w-3.5 h-3.5" />
                              </button>

                              {/* Psychological Follow-up Button */}
                              <button
                                onClick={() => setPsychologicalRecruit(r)}
                                className={`p-1 border border-[#444] transition-colors ${
                                  r.is_psychological_case
                                    ? 'bg-fuchsia-900/60 hover:bg-fuchsia-600 text-fuchsia-200'
                                    : 'bg-[#262626] hover:bg-fuchsia-900/40 text-fuchsia-400 hover:text-white'
                                }`}
                                title="المتابعة الدورية للحالات النفسية والعصبية"
                              >
                                <Brain className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setActivityRecruit(r)}
                                className="p-1 bg-[#262626] hover:bg-red-700 text-gray-300 hover:text-white border border-[#444]"
                                title="المتابعة الطبية (M)"
                              >
                                <Stethoscope className="w-3.5 h-3.5 text-red-400" />
                              </button>
                              <button
                                onClick={() => onSelectRecruit(r)}
                                className="p-1 bg-[#262626] hover:bg-[#0f62fe] text-gray-300 hover:text-white border border-[#444]"
                                title="عرض الملف الكامل (Enter)"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDocumentsRecruit(r)}
                                className={`p-1 border border-[#444] transition-colors ${
                                  (r.id_doc_front_path || r.id_doc_back_path || r.military_record_path)
                                    ? 'bg-blue-900/40 text-blue-300 hover:bg-blue-600 hover:text-white'
                                    : 'bg-[#262626] hover:bg-[#383838] text-gray-400 hover:text-white'
                                }`}
                                title="وثيقة التعارف والسجل العسكري"
                              >
                                <Scan className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedIds([r.id]);
                                  setShowExportModal(true);
                                }}
                                className="p-1 bg-[#262626] hover:bg-amber-600 text-amber-400 hover:text-black border border-[#444]"
                                title="كارت الدولاب (P)"
                              >
                                <IdCard className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onPrintRecruit(r)}
                                className="p-1 bg-[#262626] hover:bg-blue-600 text-gray-300 hover:text-white border border-[#444]"
                                title="طباعة الاستمارة الرسمية"
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
                                className="p-1 bg-[#262626] hover:bg-rose-950 text-gray-400 hover:text-rose-300 border border-[#444]"
                                title="حذف المجند"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-3 bg-[#161616] border border-[#393939] flex items-center justify-between text-xs text-gray-400 mt-3">
              <span>صفحة {page} من {totalPages}</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 bg-[#262626] hover:bg-[#333333] disabled:opacity-40 text-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 bg-[#262626] hover:bg-[#333333] disabled:opacity-40 text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Secondary Side Investigation Panel */}
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
              onOpenDocuments={(r) => setDocumentsRecruit(r)}
              onOpenTickets={(r) => setTicketRecruit(r)}
              onOpenPsychological={(r) => setPsychologicalRecruit(r)}
            />
          </div>
        )}

      </div>

      {/* Security / Suspicion Ticket Modal */}
      {/* Security / Suspicion Ticket Modal */}
      {ticketRecruit && (
        <TicketModal
          isOpen={!!ticketRecruit}
          recruit={ticketRecruit}
          onClose={() => setTicketRecruit(null)}
          onTicketChanged={() => {
            fetchRecruits();
            onRefresh();
          }}
        />
      )}

      {/* Psychological & Nervous Periodic Follow-up Modal */}
      {psychologicalRecruit && (
        <PsychologicalFollowupModal
          isOpen={!!psychologicalRecruit}
          recruit={psychologicalRecruit}
          onClose={() => setPsychologicalRecruit(null)}
          onUpdated={() => {
            fetchRecruits();
            onRefresh();
          }}
        />
      )}

      {/* Scanned Identification & Military Documents Modal */}
      {documentsRecruit && (
        <RecruitDocumentsModal
          recruit={documentsRecruit}
          onClose={() => setDocumentsRecruit(null)}
          onRefreshRecruits={() => fetchRecruits()}
        />
      )}

      {/* Medical & Movement Tracking Modal */}
      {activityRecruit && (
        <ActivityLogModal
          recruit={activityRecruit}
          onClose={() => setActivityRecruit(null)}
          onRefreshRecruits={() => fetchRecruits()}
          companyColors={companyColors}
        />
      )}

      {/* Export & Locker Cards Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        recruits={recruits}
        selectedRecruitIds={selectedIds}
        activeBatch={activeBatch}
        onUpdateRecruit={handleUpdateRecruit}
      />

      {/* Settings Modal for Military Company Colors */}
      <CompanyColorsModal
        isOpen={showCompanyColorsModal}
        onClose={() => setShowCompanyColorsModal(false)}
        companyColors={companyColors}
        onColorsUpdated={(updated) => setCompanyColors(updated)}
      />

    </div>
  );
}
