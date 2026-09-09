import React, { useEffect, useRef, useState } from 'react';
import {
  Search, Users, UserPlus, RefreshCw, LayoutGrid, List, Eye, Printer,
  Stethoscope, Scan, IdCard, Trash2, ChevronLeft, ChevronRight,
  Filter, Download, X, AlertTriangle, CheckCircle2
} from 'lucide-react';
import AnalyticsOverview from './AnalyticsOverview';
import SideInvestigationPanel from './SideInvestigationPanel';
import ExportModal from './ExportModal';
import CompanyColorsModal from './CompanyColorsModal';
import ActivityLogModal from './ActivityLogModal';
import RecruitDocumentsModal from './RecruitDocumentsModal';
import { fetchCompanyColors, DEFAULT_COMPANY_COLORS, getCompanyStyle } from '../utils/companyColors';
import { authHeaders } from '../utils/auth';

function MetricCard({ label, value, hint, icon: Icon, tone = 'blue' }) {
  const tones = {
    blue: 'border-[#3e5fbd] text-[#9eb4ff]',
    gold: 'border-[#9c7a19] text-[var(--amn-gold-50)]',
    green: 'border-green-700/60 text-green-300',
    warning: 'border-yellow-700/60 text-yellow-300',
  };
  return (
    <div className={`amn-card p-4 border-r-2 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold text-[var(--ui-text-secondary)]">{label}</div>
          <div className="text-2xl font-black text-white mt-2 tabular-nums">{value ?? '—'}</div>
          {hint && <div className="text-[10px] text-[var(--ui-text-secondary)] mt-2">{hint}</div>}
        </div>
        <Icon className="w-5 h-5 opacity-80" />
      </div>
    </div>
  );
}

export default function Dashboard({
  stats, batches, activeBatch, onOpenKiosk, onSelectRecruit,
  onPrintRecruit, onDeleteRecruit, onRefresh
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('all');
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('all');
  const [recruits, setRecruits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [viewMode, setViewMode] = useState('table');
  const [sidePanelRecruit, setSidePanelRecruit] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCompanyColorsModal, setShowCompanyColorsModal] = useState(false);
  const [activityRecruit, setActivityRecruit] = useState(null);
  const [documentsRecruit, setDocumentsRecruit] = useState(null);
  const [companyColors, setCompanyColors] = useState(DEFAULT_COMPANY_COLORS);
  const searchInputRef = useRef(null);

  useEffect(() => {
    fetchCompanyColors().then(data => {
      if (Array.isArray(data)) setCompanyColors(data);
    });
  }, []);

  const fetchRecruits = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        batch_id: selectedBatchId,
        company: selectedCompanyFilter,
        page: String(page),
        limit: '24'
      });
      const res = await fetch('/api/recruits?' + params.toString(), { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch recruits');
      const data = await res.json();
      setRecruits(data.recruits || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchRecruits, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedBatchId, selectedCompanyFilter, page]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') setSidePanelRecruit(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const toggleSelect = (id) => setSelectedIds(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );
  const allVisibleSelected = recruits.length > 0 && recruits.every(r => selectedIds.includes(r.id));
  const toggleSelectAll = () => {
    if (allVisibleSelected) setSelectedIds(prev => prev.filter(id => !recruits.some(r => r.id === id)));
    else setSelectedIds(prev => [...new Set([...prev, ...recruits.map(r => r.id)])]);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedBatchId('all');
    setSelectedCompanyFilter('all');
    setPage(1);
  };

  const handleDelete = (recruit) => {
    if (window.confirm(`هل أنت متأكد من حذف ملف المجند "${recruit.name}"؟`)) {
      onDeleteRecruit(recruit.id);
      if (sidePanelRecruit?.id === recruit.id) setSidePanelRecruit(null);
    }
  };

  const openExport = (id) => {
    setSelectedIds(id ? [id] : selectedIds);
    setShowExportModal(true);
  };

  const metrics = [
    { label: 'إجمالي المجندين', value: stats?.total_recruits ?? totalCount, hint: 'جميع السجلات المسجلة', icon: Users, tone: 'blue' },
    { label: 'الدفعة النشطة', value: activeBatch?.name || '—', hint: 'حالة التشغيل الحالية', icon: CheckCircle2, tone: 'gold' },
    { label: 'المعروض حاليًا', value: totalCount, hint: 'وفقًا للفلاتر الحالية', icon: Filter, tone: 'green' },
    { label: 'تحتاج متابعة', value: stats?.pending ?? stats?.incomplete ?? '—', hint: 'راجع الحالات غير المكتملة', icon: AlertTriangle, tone: 'warning' },
  ];

  return (
    <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <section className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-[var(--amn-gold-50)]" dir="ltr">
            AMN-EYE <span className="text-slate-600">/</span><span className="text-slate-400" dir="rtl">لوحة المتابعة</span>
          </div>
          <h2 className="text-2xl font-black text-white mt-2">لوحة المتابعة</h2>
          <p className="text-sm text-[var(--ui-text-secondary)] mt-2">نظرة تشغيلية موحدة على تسجيل وفحص المجندين.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { fetchRecruits(); onRefresh?.(); }}
            className="flex items-center gap-2 px-3 py-2.5 border border-[var(--ui-border)] text-xs font-bold text-slate-300 hover:bg-white/5">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> تحديث
          </button>
          <button onClick={onOpenKiosk} className="amn-button-primary flex items-center gap-2 px-4 py-2.5 text-xs font-black">
            <UserPlus className="w-4 h-4" /> تسجيل مجند جديد <span className="opacity-60 hidden lg:inline">(F2)</span>
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {metrics.map(m => <MetricCard key={m.label} {...m} />)}
      </section>

      <AnalyticsOverview
        selectedBatch={selectedBatchId}
        companyColors={companyColors}
        onSelectCompany={(company) => { setSelectedCompanyFilter(company === selectedCompanyFilter ? 'all' : company); setPage(1); }}
        onSelectAttendanceDate={() => {}}
        onOpenExportModal={() => setShowExportModal(true)}
      />

      <section className="amn-card overflow-hidden">
        <div className="p-4 border-b border-[var(--ui-border)] flex flex-col xl:flex-row gap-3 xl:items-center xl:justify-between">
          <div className="flex flex-col md:flex-row gap-2 flex-1">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input ref={searchInputRef} value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
                placeholder="بحث بالاسم أو رقم الشرطة أو الرقم القومي... ( / )"
                className="w-full bg-[var(--ui-bg)] border border-[var(--ui-border)] pr-10 pl-4 py-3 text-xs text-white placeholder:text-slate-600" />
            </div>
            <select value={selectedBatchId} onChange={e => { setSelectedBatchId(e.target.value); setPage(1); }}
              className="bg-[var(--ui-bg)] border border-[var(--ui-border)] px-3 py-3 text-xs text-white">
              <option value="all">كافة الدفعات</option>
              {batches?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select value={selectedCompanyFilter} onChange={e => { setSelectedCompanyFilter(e.target.value); setPage(1); }}
              className="bg-[var(--ui-bg)] border border-[var(--ui-border)] px-3 py-3 text-xs text-white">
              <option value="all">كافة السرايا</option>
              {companyColors.map(c => <option key={c.id} value={c.match}>{c.name}</option>)}
            </select>
            {(searchTerm || selectedBatchId !== 'all' || selectedCompanyFilter !== 'all') &&
              <button onClick={clearFilters} className="px-3 py-2 text-xs text-[var(--amn-gold-50)] border border-[#9c7a19] hover:bg-yellow-500/5">إلغاء الفلاتر</button>}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex border border-[var(--ui-border)]">
              <button onClick={() => setViewMode('table')} className={`p-2.5 ${viewMode === 'table' ? 'bg-[var(--amn-blue-50)] text-white' : 'text-slate-400'}`} title="جدول"><List className="w-4 h-4" /></button>
              <button onClick={() => setViewMode('grid')} className={`p-2.5 ${viewMode === 'grid' ? 'bg-[var(--amn-blue-50)] text-white' : 'text-slate-400'}`} title="كروت"><LayoutGrid className="w-4 h-4" /></button>
            </div>
            <button onClick={() => setShowCompanyColorsModal(true)} className="hidden lg:flex px-3 py-2.5 border border-[var(--ui-border)] text-xs text-slate-300">ألوان السرايا</button>
            <button onClick={() => openExport()} className="flex items-center gap-2 px-3 py-2.5 border border-[#9c7a19] text-[var(--amn-gold-50)] text-xs font-bold">
              <Download className="w-4 h-4" /> تصدير {selectedIds.length > 0 && <span>({selectedIds.length})</span>}
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-[var(--ui-border)] flex items-center justify-between text-xs">
          <span className="text-[var(--ui-text-secondary)]">السجلات: <strong className="text-white">{totalCount}</strong></span>
          {recruits.length > 0 && <button onClick={toggleSelectAll} className="text-[#9eb4ff] hover:text-white">{allVisibleSelected ? 'إلغاء تحديد الكل' : 'تحديد المعروض للتصدير'}</button>}
        </div>

        {loading && recruits.length === 0 ? (
          <div className="p-16 text-center text-sm text-slate-400">جاري تحميل السجلات...</div>
        ) : recruits.length === 0 ? (
          <div className="p-16 text-center">
            <Users className="w-10 h-10 mx-auto text-slate-600 mb-3" />
            <div className="font-bold text-slate-300">لا توجد سجلات مطابقة</div>
            <button onClick={clearFilters} className="mt-3 text-xs text-[#9eb4ff]">إلغاء الفلاتر</button>
          </div>
        ) : viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-right text-xs">
              <thead className="bg-black/15 text-[var(--ui-text-secondary)] border-b border-[var(--ui-border)]">
                <tr>
                  <th className="p-3 w-10 text-center"><input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} /></th>
                  <th className="p-3">المجند</th><th className="p-3">رقم الشرطة</th><th className="p-3">السرية</th>
                  <th className="p-3">الرقم القومي</th><th className="p-3">الحالة</th><th className="p-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ui-border)]">
                {recruits.map(r => {
                  const style = getCompanyStyle(r.company, companyColors);
                  const hospitalized = r.active_activity === 'medical_referral';
                  return <tr key={r.id} onClick={() => setSidePanelRecruit(r)} className={`cursor-pointer hover:bg-white/[0.025] ${sidePanelRecruit?.id === r.id ? 'bg-[#172f7a]/20' : ''}`}>
                    <td className="p-3 text-center" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedIds.includes(r.id)} onChange={() => toggleSelect(r.id)} /></td>
                    <td className="p-3"><div className="flex items-center gap-3"><div className="w-9 h-9 bg-[var(--ui-layer-02)] border border-[var(--ui-border)] overflow-hidden shrink-0">{r.photo_path ? <img src={r.photo_path} alt="" className="w-full h-full object-cover" /> : <Users className="w-4 h-4 m-auto mt-2 text-slate-600" />}</div><div><div className="font-bold text-white">{r.name}</div><div className="text-[10px] text-slate-500 mt-1">{r.address || '—'}</div></div></div></td>
                    <td className="p-3 font-mono text-[var(--amn-gold-50)]">{r.police_number || '—'}</td>
                    <td className="p-3"><span className="px-2 py-1 border text-[10px]" style={{backgroundColor: style.bg,color:style.text,borderColor:style.border}}>{r.company || 'غير محدد'}</span></td>
                    <td className="p-3 font-mono text-slate-300">{r.national_id || '—'}</td>
                    <td className="p-3">{hospitalized ? <span className="text-red-300">بالمستشفى</span> : <span className="text-green-300">نشط</span>}</td>
                    <td className="p-3" onClick={e => e.stopPropagation()}><div className="flex justify-center gap-1">
                      <button onClick={() => onSelectRecruit(r)} className="p-2 border border-[var(--ui-border)] hover:bg-[var(--amn-blue-50)]" title="الملف"><Eye className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setActivityRecruit(r)} className="p-2 border border-[var(--ui-border)] hover:bg-red-500/20" title="المتابعة"><Stethoscope className="w-3.5 h-3.5 text-red-300" /></button>
                      <button onClick={() => setDocumentsRecruit(r)} className="p-2 border border-[var(--ui-border)]" title="الوثائق"><Scan className="w-3.5 h-3.5 text-blue-300" /></button>
                      <button onClick={() => onPrintRecruit(r)} className="p-2 border border-[var(--ui-border)]" title="طباعة"><Printer className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(r)} className="p-2 border border-[var(--ui-border)] hover:bg-red-500/20" title="حذف"><Trash2 className="w-3.5 h-3.5 text-red-300" /></button>
                    </div></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
            {recruits.map(r => {
              const style = getCompanyStyle(r.company, companyColors);
              const hospitalized = r.active_activity === 'medical_referral';
              return <article key={r.id} onClick={() => setSidePanelRecruit(r)} className="bg-[var(--ui-layer-02)] border border-[var(--ui-border)] hover:border-[#3e5fbd] cursor-pointer transition-colors">
                <div className="h-1" style={{backgroundColor:style.color}} />
                <div className="p-4">
                  <div className="flex justify-between gap-3">
                    <div className="flex gap-3 min-w-0"><div className="w-12 h-12 bg-[var(--ui-bg)] border border-[var(--ui-border)] overflow-hidden shrink-0">{r.photo_path ? <img src={r.photo_path} alt="" className="w-full h-full object-cover" /> : <Users className="w-5 h-5 m-auto mt-3 text-slate-600" />}</div><div className="min-w-0"><h3 className="font-black text-white truncate">{r.name}</h3><div className="text-[10px] text-slate-500 mt-1">{r.police_number || 'بدون رقم شرطة'}</div></div></div>
                    <span className="px-2 py-1 text-[10px] h-fit border" style={{backgroundColor:style.bg,color:style.text,borderColor:style.border}}>{r.company || 'غير محدد'}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-[11px]"><div><div className="text-slate-500">الرقم القومي</div><div className="text-slate-300 font-mono mt-1">{r.national_id || '—'}</div></div><div><div className="text-slate-500">الحالة</div><div className={`mt-1 ${hospitalized ? 'text-red-300' : 'text-green-300'}`}>{hospitalized ? 'بالمستشفى' : 'نشط'}</div></div></div>
                  <div className="mt-4 pt-3 border-t border-[var(--ui-border)] flex justify-between"><button onClick={e => {e.stopPropagation(); onSelectRecruit(r)}} className="text-xs text-[#9eb4ff]">عرض الملف</button><div className="flex gap-1"><button onClick={e=>{e.stopPropagation();setDocumentsRecruit(r)}} className="p-1.5"><Scan className="w-4 h-4 text-slate-400"/></button><button onClick={e=>{e.stopPropagation();openExport(r.id)}} className="p-1.5"><IdCard className="w-4 h-4 text-[var(--amn-gold-50)]"/></button><button onClick={e=>{e.stopPropagation();setActivityRecruit(r)}} className="p-1.5"><Stethoscope className="w-4 h-4 text-red-300"/></button></div></div>
                </div>
              </article>;
            })}
          </div>
        )}

        {totalPages > 1 && <div className="p-4 border-t border-[var(--ui-border)] flex items-center justify-between text-xs text-slate-400">
          <span>صفحة {page} من {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="p-2 border border-[var(--ui-border)] disabled:opacity-40"><ChevronRight className="w-4 h-4"/></button>
            <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} className="p-2 border border-[var(--ui-border)] disabled:opacity-40"><ChevronLeft className="w-4 h-4"/></button>
          </div>
        </div>}
      </section>

      {sidePanelRecruit && <section className="fixed inset-y-0 left-0 z-50 w-full max-w-xl bg-[var(--ui-layer-01)] border-r border-[var(--ui-border)] shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[var(--ui-layer-01)] border-b border-[var(--ui-border)] p-3 flex justify-between items-center">
          <button onClick={() => setSidePanelRecruit(null)} className="p-2 text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
          <span className="text-xs text-slate-400">تفاصيل سريعة</span>
        </div>
        <SideInvestigationPanel recruit={sidePanelRecruit} onClose={() => setSidePanelRecruit(null)}
          onOpenFullDossier={onSelectRecruit} onPrint={onPrintRecruit}
          onOpenLockerCard={(r) => openExport(r.id)} onOpenDocuments={setDocumentsRecruit} />
      </section>}

      {documentsRecruit && <RecruitDocumentsModal recruit={documentsRecruit} onClose={() => setDocumentsRecruit(null)} onRefreshRecruits={fetchRecruits} />}
      {activityRecruit && <ActivityLogModal recruit={activityRecruit} onClose={() => setActivityRecruit(null)} onRefreshRecruits={fetchRecruits} companyColors={companyColors} />}
      <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} recruits={recruits} selectedRecruitIds={selectedIds} activeBatch={activeBatch}
        onUpdateRecruit={async (id, fields) => {
          const res = await fetch('/api/recruits/' + id, { method:'PUT', headers:{'Content-Type':'application/json', ...authHeaders()}, body:JSON.stringify(fields) });
          if (res.ok) fetchRecruits();
        }} />
      <CompanyColorsModal isOpen={showCompanyColorsModal} onClose={() => setShowCompanyColorsModal(false)} companyColors={companyColors} onColorsUpdated={setCompanyColors} />
    </div>
  );
}