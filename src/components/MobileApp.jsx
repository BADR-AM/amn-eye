import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, 
  UserPlus, 
  Users, 
  Bot, 
  Settings, 
  Search, 
  Filter, 
  Camera, 
  Video, 
  Shield, 
  AlertTriangle, 
  Brain, 
  Briefcase, 
  Globe, 
  Heart, 
  CheckCircle2, 
  X, 
  ChevronLeft, 
  ChevronRight,
  RotateCcw, 
  Edit3, 
  Trash2, 
  LogOut, 
  Power,
  Wifi, 
  Monitor, 
  KeyRound, 
  Calendar, 
  Clock, 
  Share2,
  Sparkles,
  Send,
  Loader2,
  BarChart3,
  Download,
  IdCard,
  FileText,
  FileCheck,
  Palette,
  Check,
  Activity,
  Layers,
  LayoutGrid,
  List,
  Stethoscope,
  Scan,
  HardDrive,
  Printer,
  Copy,
  ExternalLink,
  History
} from 'lucide-react';
import centralSecurityLogo from '../assets/central_security_logo.png';
import LiquidOrb from './LiquidOrb';
import MediaCapture from './MediaCapture';
import ExportModal from './ExportModal';
import CompanyColorsModal from './CompanyColorsModal';
import ActivityLogModal from './ActivityLogModal';
import RecruitDocumentsModal from './RecruitDocumentsModal';
import TicketModal from './TicketModal';
import PsychologicalFollowupModal from './PsychologicalFollowupModal';
import OfficialReport from './OfficialReport';
import RecruitHistoryModal from './RecruitHistoryModal';
import CameraQrScanner from './CameraQrScanner';
import { fetchCompanyColors, DEFAULT_COMPANY_COLORS, getCompanyStyle } from '../utils/companyColors';
import { authHeaders } from '../utils/auth';
import { parseEgyptianNationalId } from '../utils/nationalId';

export default function MobileApp({
  currentUser,
  activeBatch,
  batches,
  stats,
  networkInfo,
  onRefresh,
  onLogout,
  onSwitchToDesktop,
  onOpenNetwork,
  onOpenBatches,
  onOpenBackup,
  onOpenUsers,
  onOpenChangePassword,
  onOpenAuditLogs,
  showToast
}) {
  // Active Navigation Tab
  // 'home' | 'new' | 'directory' | 'analytics' | 'ai' | 'tools'
  const [activeTab, setActiveTab] = useState('home');

  // Recruits & Directory state
  const [recruits, setRecruits] = useState([]);
  const [loadingRecruits, setLoadingRecruits] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Advanced Filters
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [filterBatch, setFilterBatch] = useState('all');
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterQualification, setFilterQualification] = useState('all');
  const [filterSecurity, setFilterSecurity] = useState('all');
  const [filterMedical, setFilterMedical] = useState('all');
  const [filterVideo, setFilterVideo] = useState('all'); // 'all' | 'with_video' | 'no_video'
  const [filterPhoto, setFilterPhoto] = useState('all'); // 'all' | 'with_photo' | 'no_photo'

  // Multi-selection for bulk actions
  const [selectedIds, setSelectedIds] = useState([]);

  // Active recruit for bottom dossier sheet
  const [selectedRecruit, setSelectedRecruit] = useState(null);
  const [isEditingRecruit, setIsEditingRecruit] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  // Modals state for recruit actions
  const [ticketRecruit, setTicketRecruit] = useState(null);
  const [documentsRecruit, setDocumentsRecruit] = useState(null);
  const [psychologicalRecruit, setPsychologicalRecruit] = useState(null);
  const [printRecruit, setPrintRecruit] = useState(null);
  const [activityRecruit, setActivityRecruit] = useState(null);
  const [historyRecruit, setHistoryRecruit] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCompanyColorsModal, setShowCompanyColorsModal] = useState(false);
  const [showMobileQrScanner, setShowMobileQrScanner] = useState(false);

  // Company badge colors
  const [companyColors, setCompanyColors] = useState(DEFAULT_COMPANY_COLORS);

  useEffect(() => {
    fetchCompanyColors().then(data => {
      if (data && Array.isArray(data)) setCompanyColors(data);
    });
  }, []);

  // Media capture workflow for New Recruit
  const [isMediaCapturing, setIsMediaCapturing] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);

  // 20 Inspection Fields definition
  const inspectionFields = [
    { key: 'criminal_record', label: 'أرباب سوابق / سوابق جنائية', icon: Shield },
    { key: 'political_suspect', label: 'شبهة أو توجه سياسي', icon: AlertTriangle },
    { key: 'registered_relatives', label: 'أقارب مسجلين أو قضايا جنائية', icon: Users },
    { key: 'travel_abroad', label: 'سفر سابق خارج البلاد', icon: Globe },
    { key: 'unbalanced_behavior', label: 'سلوك غير متزن أو عدواني', icon: Brain },
    { key: 'addiction_history', label: 'شبهة إدمان أو تعاطي', icon: Heart },
    { key: 'extremist_ideology', label: 'أفكار متطرفة أو فكر ديني متشدد', icon: Shield },
    { key: 'escaped_service', label: 'هروب سابق من الخدمة أو معسكرات', icon: AlertTriangle },
    { key: 'social_media_influence', label: 'نشاط معادٍ على السوشيال ميديا', icon: Globe },
    { key: 'chronic_illness', label: 'أمراض مزمنة أو إصابات مؤثرة', icon: Heart },
    { key: 'tattoos', label: 'وشم أو علامات مميزة بالجسم', icon: Shield },
    { key: 'psychological_issues', label: 'أمراض نفسية أو عصبية سابقة', icon: Brain },
    { key: 'suicide_attempt', label: 'محاولات انتحار أو إيذاء النفس', icon: AlertTriangle },
    { key: 'illiterate', label: 'أمي / لا يجيد القراءة والكتابة', icon: Briefcase },
    { key: 'military_issues', label: 'مشاكل عسكرية سابقة', icon: Shield },
    { key: 'police_issues', label: 'قضايا بقسم الشرطة أو المركز', icon: Shield },
    { key: 'quarrels_history', label: 'تعدد المشاجرات والنزاعات بالقرية', icon: AlertTriangle },
    { key: 'family_instability', label: 'تفكك أسري أو مشاكل أسرية حادة', icon: Users },
    { key: 'suspicious_gatherings', label: 'مشاركة في تجمهرات أو أعمال شغب', icon: AlertTriangle },
    { key: 'unknown_lineage', label: 'مجهول النسب أو إهمال بالرعاية', icon: Users }
  ];

  const initialNewForm = {
    name: '',
    military_number: '',
    national_id: '',
    birth_date: '',
    governorate: 'الغربية',
    address: '',
    phone: '',
    current_job: 'بدون عمل',
    other_jobs: 'لا يوجد',
    qualification: 'متوسط',
    religion: 'مسلم',
    marital_status: 'أعزب',
    wife: 'أعزب',
    travel_abroad: 'لم يسافر خارج البلاد',
    travel_details: '',
    literacy: 'يجيد القراءة والكتابة',
    medical_status: 'لائق طبياً وسليم ظاهرياً',
    is_psychological_case: 0,
    psychological_notes: '',
    inspection: 'بنية جيدة - لا توجد علامات مميزة أو وشم - سلوك معتدل',
    family_social_status: 'الأسرة مستقرة والوالدان على قيد الحياة',
    family_security_status: 'العائلة خالية من السوابق والشبهات الجنائية والسياسية',
    father_name: '',
    father_job: 'عامل',
    mother_name: '',
    mother_job: 'ربة منزل',
    siblings_check: 'لا توجد ملاحظات أمنية على الأشقاء',
    police_number: '',
    company: 'السرية الأولى ( ١ )',
    notes: ''
  };

  // Populate inspection defaults
  inspectionFields.forEach(f => {
    initialNewForm[f.key] = 'سليم';
  });

  const [newForm, setNewForm] = useState(initialNewForm);

  // AI Chat state
  const [aiMessages, setAiMessages] = useState([
    { 
      role: 'model', 
      content: 'أهلاً بك يا فندم في **المساعد الأمني الذكي** بالهاتف المحمول.\n\nيمكنك سؤالي عن أي استفسار أو إحصائية لحظية عن المجندين مثل:\n* **بيان السرايا وقوتها التجنيدية**\n* **حالات الاشتباه الأمني والجنائي**\n* **المجندين ذوي المتابعة النفسية والعصبية**\n* **حصر المؤهلات وأصحاب الحرف والمهن**\n* **المسافرين خارج البلاد**',
      suggestions: ['تيكتات الاشتباه', 'الحالات غير المتزنة', 'حصر الحرف والمهن', 'إحصائية السرايا']
    }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const aiScrollRef = useRef(null);

  // Fetch Recruits with full filters
  const fetchMobileRecruits = async () => {
    setLoadingRecruits(true);
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        page: page.toString(),
        limit: '20'
      });

      if (filterBatch !== 'all') {
        params.append('batch_id', filterBatch);
      } else if (activeBatch?.id) {
        params.append('batch_id', activeBatch.id.toString());
      }

      if (filterCompany !== 'all') params.append('company', filterCompany);
      if (filterQualification !== 'all') params.append('qualification', filterQualification);
      if (filterSecurity !== 'all') params.append('category', filterSecurity);
      if (filterMedical !== 'all') params.append('medical_status', filterMedical);
      if (filterVideo !== 'all') params.append('video_status', filterVideo);
      if (filterPhoto !== 'all') params.append('photo_status', filterPhoto);

      const res = await fetch(`/api/recruits?${params.toString()}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setRecruits(data.recruits || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || (data.recruits || []).length);
      }
    } catch (err) {
      console.warn('Error fetching mobile recruits:', err);
    } finally {
      setLoadingRecruits(false);
    }
  };

  useEffect(() => {
    fetchMobileRecruits();
  }, [searchTerm, page, filterBatch, filterCompany, filterQualification, filterSecurity, filterMedical, filterVideo, filterPhoto, activeBatch]);

  // AI chat auto-scroll
  useEffect(() => {
    if (activeTab === 'ai' && aiScrollRef.current) {
      aiScrollRef.current.scrollTop = aiScrollRef.current.scrollHeight;
    }
  }, [aiMessages, activeTab]);

  // Handle AI question submit
  const handleSendAiMessage = async (textToSend = null) => {
    const query = textToSend || aiInput.trim();
    if (!query || isAiLoading) return;

    const userMsg = { role: 'user', content: query };
    setAiMessages(prev => [...prev, userMsg]);
    if (!textToSend) setAiInput('');
    setIsAiLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({ 
          message: query, 
          stream: false,
          batch_id: activeBatch ? activeBatch.id : null 
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'خطأ في استجابة المساعد الذكي');
      }

      const data = await res.json();
      setAiMessages(prev => [
        ...prev, 
        { 
          role: 'model', 
          content: data.reply || 'تم استلام وتحليل استفسارك بنجاح.',
          dataSummary: data.dataSummary || null,
          suggestions: data.suggestions || ['إحصائية الدفع الحالي', 'بيان الحالات غير اللائقة', 'توزيع المؤهلات']
        }
      ]);
    } catch (err) {
      setAiMessages(prev => [
        ...prev, 
        { 
          role: 'model', 
          content: '⚠️ تعذر الاتصال بالمساعد الذكي حالياً: ' + err.message 
        }
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Start Media Capture station
  const handleProceedToMedia = (e) => {
    e.preventDefault();
    if (!newForm.name || !newForm.name.trim()) {
      showToast('يرجى كتابة اسم المجند ثلاثي على الأقل', 'error');
      return;
    }
    const nid = (newForm.national_id || '').trim();
    if (nid && !/^\d{14}$/.test(nid)) {
      showToast('الرقم القومي يجب أن يتكون من 14 رقماً بالضبط', 'error');
      return;
    }
    setPendingFormData({
      ...newForm,
      batch_id: activeBatch?.id
    });
    setIsMediaCapturing(true);
  };

  // Auto-parse National ID for birth date and governorate
  const handleNationalIdChange = (idVal) => {
    const updated = { ...newForm, national_id: idVal };
    if (idVal && idVal.length === 14) {
      const parsed = parseEgyptianNationalId(idVal);
      if (parsed) {
        if (parsed.birthDate) updated.birth_date = parsed.birthDate;
        if (parsed.governorate) updated.governorate = parsed.governorate;
      }
    }
    setNewForm(updated);
  };

  // Safe quit application handler
  const handleQuitApp = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في إغلاق وإنهاء تشغيل المنظومة بالكامل؟')) {
      if (window.electronAPI?.quitApp) {
        window.electronAPI.quitApp();
      } else {
        onLogout?.();
      }
    }
  };

  // Media Capture Save Success
  const handleMediaSaved = (savedRecruit) => {
    setIsMediaCapturing(false);
    setPendingFormData(null);
    setNewForm(initialNewForm);
    setActiveTab('directory');
    fetchMobileRecruits();
    onRefresh();
    showToast('تم تسجيل وحفظ ملف المجند والصورة والفيديو بنجاح');
  };

  // Delete recruit (Strictly Admin only)
  const handleDeleteRecruit = async (recruitId) => {
    if (currentUser?.role && currentUser.role !== 'admin') {
      showToast('عفواً، حذف السجلات مقتصر على مدير المنظومة (Admin) فقط', 'error');
      return;
    }
    if (!window.confirm('هل أنت متأكد من حذف هذا المجند نهائياً وسجلاته من المنظومة؟')) {
      return;
    }
    try {
      const res = await fetch(`/api/recruits/${recruitId}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'فشل الحذف');
      }
      if (selectedRecruit?.id === recruitId) setSelectedRecruit(null);
      fetchMobileRecruits();
      onRefresh();
      showToast('تم حذف ملف المجند بنجاح');
    } catch (err) {
      showToast('خطأ أثناء الحذف: ' + err.message, 'error');
    }
  };

  // Bulk delete selected recruits (Admin only)
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (currentUser?.role && currentUser.role !== 'admin') {
      showToast('حذف المجندين مقتصر حصرياً على رتبة المشرف العام (Admin)', 'error');
      return;
    }
    if (!window.confirm(`هل أنت متأكد من حذف عدد (${selectedIds.length}) مجند محدد نهائياً من قاعدة البيانات والمنظومة؟ هذا الإجراء نهائي ولا يمكن التراجع عنه!`)) return;

    try {
      const res = await fetch('/api/recruits/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({ ids: selectedIds })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'فشل حذف المجندين');
      }

      showToast(`تم حذف (${selectedIds.length}) مجند بنجاح`);
      setSelectedIds([]);
      if (selectedRecruit && selectedIds.includes(selectedRecruit.id)) {
        setSelectedRecruit(null);
      }
      fetchMobileRecruits();
      onRefresh();
    } catch (err) {
      console.error('Mobile bulk delete error:', err);
      showToast(err.message || 'خطأ أثناء الحذف الجماعي', 'error');
    }
  };

  // Save edits to recruit dossier
  const handleSaveEdit = async () => {
    if (!selectedRecruit) return;
    try {
      const res = await fetch(`/api/recruits/${selectedRecruit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify(editFormData)
      });
      if (!res.ok) throw new Error('فشل حفظ التعديلات');
      const updated = await res.json();
      setSelectedRecruit(updated.recruit || { ...selectedRecruit, ...editFormData });
      setIsEditingRecruit(false);
      fetchMobileRecruits();
      onRefresh();
      showToast('تم حفظ تعديلات ملف المجند بنجاح');
    } catch (err) {
      showToast('خطأ في حفظ التعديلات: ' + err.message, 'error');
    }
  };

  // Count active filters
  const getActiveFilterCount = () => {
    let count = 0;
    if (filterBatch !== 'all') count++;
    if (filterCompany !== 'all') count++;
    if (filterQualification !== 'all') count++;
    if (filterSecurity !== 'all') count++;
    if (filterMedical !== 'all') count++;
    if (filterVideo !== 'all') count++;
    if (filterPhoto !== 'all') count++;
    return count;
  };

  const resetFilters = () => {
    setFilterBatch('all');
    setFilterCompany('all');
    setFilterQualification('all');
    setFilterSecurity('all');
    setFilterMedical('all');
    setFilterVideo('all');
    setFilterPhoto('all');
    setPage(1);
    setIsFilterSheetOpen(false);
  };

  // Bulk selection toggle
  const toggleSelectRecruit = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === recruits.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(recruits.map(r => r.id));
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans pb-20 select-none">
      
      {/* ── TOP MOBILE APP BAR ── */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          
          {/* Logo & Military Unit Badge */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-800/80 p-1 flex items-center justify-center border border-slate-700/60 shrink-0">
              <img 
                src={centralSecurityLogo} 
                alt="شعار الأمن المركزي" 
                className="w-full h-full object-contain drop-shadow"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono font-black uppercase px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  MOBILE OPS
                </span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 rounded border border-emerald-500/30 font-mono">
                  VER 02.0
                </span>
              </div>
              <h1 className="text-sm font-black text-white leading-tight mt-0.5">
                منظومة فحص وتسجيل المجندين
              </h1>
            </div>
          </div>

          {/* Quick Info & Desktop Switcher */}
          <div className="flex items-center gap-1.5">
            {/* Batch Pill */}
            <button
              onClick={onOpenBatches}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold"
              title="انقر لتغيير الدفع التجنيدي"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="truncate max-w-[80px]">
                {activeBatch ? activeBatch.name : 'الدفع'}
              </span>
            </button>

            {/* Desktop View Switcher */}
            <button
              onClick={onSwitchToDesktop}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="التبديل إلى شاشة الكمبيوتر (Desktop View)"
            >
              <Monitor className="w-4 h-4 text-cyan-400" />
            </button>

            {/* Quit Application Button */}
            <button
              onClick={handleQuitApp}
              className="p-2 rounded-lg bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 border border-rose-800/60 transition-colors"
              title="إغلاق وإنهاء تشغيل المنظومة"
            >
              <Power className="w-4 h-4 text-rose-400" />
            </button>
          </div>

        </div>
      </header>

      {/* ── MAIN CONTENT SWITCHER ── */}
      <main className="flex-1 p-3.5 max-w-lg mx-auto w-full">

        {/* ══════════════════════════════════════════════════
            TAB 1: HOME (الرئيسية)
           ══════════════════════════════════════════════════ */}
        {activeTab === 'home' && (
          <div className="space-y-4">
            
            {/* Officer Welcome Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">مرحباً بك،</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      currentUser?.role === 'admin' 
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
                        : currentUser?.role === 'officer'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {currentUser?.role === 'admin' ? 'مدير المنظومة (Admin)' : currentUser?.role === 'officer' ? 'ضابط التحريات' : 'مشغل كشك'}
                    </span>
                  </div>
                  <div className="text-base font-extrabold text-white">
                    {currentUser?.full_name || 'ضابط التحريات والأمن'}
                  </div>
                  <div className="text-[11px] text-amber-400/90 font-semibold mt-0.5">
                    وحدة أمن ومعسكر تدريب وسط الدلتا
                  </div>
                </div>

                {/* Interactive Siri Orb Icon */}
                <div 
                  onClick={() => setActiveTab('ai')}
                  className="cursor-pointer group flex flex-col items-center gap-1"
                  title="فتح المساعد الذكي"
                >
                  <LiquidOrb size={44} state="idle" />
                  <span className="text-[10px] font-bold text-purple-300">مساعد AI</span>
                </div>
              </div>

              {/* Decorative background glow */}
              <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
            </div>

            {/* ── SEPARATE MILITARY UNITS STATS (3 UNITS) ── */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-400 px-1 flex items-center justify-between">
                <span>توزيع القوة الميدانية والوحدات:</span>
                <span className="text-[10px] text-emerald-400 font-mono">حصر لحظي</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                {/* Regular 6 Companies */}
                <div 
                  onClick={() => {
                    setFilterCompany('all');
                    setActiveTab('directory');
                  }}
                  className="bg-slate-900 hover:bg-slate-850 p-2.5 rounded-xl border border-slate-800 text-center cursor-pointer transition-all shadow-sm active:scale-95"
                >
                  <div className="text-[10px] text-slate-400 font-bold mb-1">المستجدين (6 سرايا)</div>
                  <div className="text-xl font-black text-blue-400 font-mono">
                    {stats?.regularRecruits ?? recruits.filter(r => !r.company?.includes('أمن') && !r.company?.includes('أساسية') && !r.company?.includes('اساسية')).length}
                  </div>
                  <div className="text-[9px] text-slate-500 font-semibold mt-0.5">قوة التدريب</div>
                </div>

                {/* Security Company (سرية الأمن) */}
                <div 
                  onClick={() => {
                    setFilterCompany('سرية الأمن');
                    setActiveTab('directory');
                  }}
                  className="bg-gradient-to-b from-slate-900 to-amber-950/30 hover:border-amber-500/60 p-2.5 rounded-xl border border-amber-500/40 text-center cursor-pointer transition-all shadow-sm active:scale-95"
                >
                  <div className="text-[10px] text-amber-300 font-extrabold mb-1 flex items-center justify-center gap-1">
                    <span>سرية الأمن</span>
                    <span className="text-[8px] text-amber-400">★</span>
                  </div>
                  <div className="text-xl font-black text-amber-400 font-mono">
                    {stats?.securityCompanyRecruits ?? recruits.filter(r => r.company?.includes('أمن')).length}
                  </div>
                  <div className="text-[9px] text-amber-400/80 font-semibold mt-0.5">وحدة تأمين خاصة</div>
                </div>

                {/* Base Force (القوة الأساسية) */}
                <div 
                  onClick={() => {
                    setFilterCompany('القوة الأساسية');
                    setActiveTab('directory');
                  }}
                  className="bg-gradient-to-b from-slate-900 to-indigo-950/30 hover:border-indigo-500/60 p-2.5 rounded-xl border border-indigo-500/40 text-center cursor-pointer transition-all shadow-sm active:scale-95"
                >
                  <div className="text-[10px] text-indigo-300 font-extrabold mb-1 flex items-center justify-center gap-1">
                    <span>القوة الأساسية</span>
                    <span className="text-[8px] text-indigo-400">★</span>
                  </div>
                  <div className="text-xl font-black text-indigo-400 font-mono">
                    {stats?.baseForceRecruits ?? recruits.filter(r => r.company?.includes('أساسية') || r.company?.includes('اساسية')).length}
                  </div>
                  <div className="text-[9px] text-indigo-400/80 font-semibold mt-0.5">أفراد المركز الدائمين</div>
                </div>
              </div>
            </div>

            {/* Live KPI Cards (4 metrics) */}
            <div className="grid grid-cols-2 gap-2.5">
              
              {/* Total Recruits */}
              <div 
                onClick={() => setActiveTab('directory')}
                className="bg-slate-900 p-3 rounded-xl border border-slate-800 shadow cursor-pointer hover:border-slate-700 transition-all"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-slate-400 font-bold">إجمالي المجندين</span>
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {stats?.total_recruits || stats?.total || recruits.length || 0}
                </div>
                <div className="text-[10px] text-emerald-400 font-semibold mt-1">
                  الدفع المعتمد حالياً
                </div>
              </div>

              {/* Medically Fit */}
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 shadow">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-slate-400 font-bold">لائق طبياً</span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  {stats?.fit_recruits ?? recruits.filter(r => (r.medical_status || '').includes('لائق')).length}
                </div>
                <div className="text-[10px] text-slate-400 font-semibold mt-1">
                  جاهز للتدريب الميداني
                </div>
              </div>

              {/* Security Investigation Alerts */}
              <div 
                onClick={() => {
                  setFilterSecurity('criminal_record');
                  setActiveTab('directory');
                }}
                className="bg-slate-900 p-3 rounded-xl border border-rose-900/40 bg-rose-950/10 shadow cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-rose-300 font-bold">ملاحظات أمنية</span>
                  <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                    <Shield className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-rose-400 font-mono">
                  {stats?.positive_investigations ?? recruits.filter(r => r.inspection && r.inspection !== 'سليم').length}
                </div>
                <div className="text-[10px] text-rose-300/80 font-semibold mt-1">
                  تحريات وملاحظات أمنية
                </div>
              </div>

              {/* Videos Captured */}
              <div 
                onClick={() => {
                  setFilterVideo('with_video');
                  setActiveTab('directory');
                }}
                className="bg-slate-900 p-3 rounded-xl border border-purple-900/40 bg-purple-950/10 shadow cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-purple-300 font-bold">فيديوهات مسجلة</span>
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <Video className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-purple-400 font-mono">
                  {stats?.with_video ?? recruits.filter(r => r.video_path).length}
                </div>
                <div className="text-[10px] text-purple-300/80 font-semibold mt-1">
                  توثيق مقاطع الاستجواب
                </div>
              </div>

            </div>

            {/* Quick Action Buttons Grid */}
            <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 shadow space-y-2.5">
              <div className="text-xs font-bold text-slate-300">إجراءات سريعة ميدانية</div>
              
              <div className="grid grid-cols-4 gap-2 text-center">
                
                {/* 1. New Registration */}
                <button
                  onClick={() => setActiveTab('new')}
                  className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-300 transition-colors"
                >
                  <UserPlus className="w-5 h-5 text-emerald-400" />
                  <span className="text-[11px] font-bold">تسجيل جديد</span>
                </button>

                {/* 2. Analytics */}
                <button
                  onClick={() => setActiveTab('analytics')}
                  className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-300 transition-colors"
                >
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  <span className="text-[11px] font-bold">التحليلات</span>
                </button>

                {/* 3. Export Suite */}
                <button
                  onClick={() => setShowExportModal(true)}
                  className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl bg-amber-600/15 hover:bg-amber-600/25 border border-amber-500/30 text-amber-300 transition-colors"
                >
                  <Download className="w-5 h-5 text-amber-400" />
                  <span className="text-[11px] font-bold">تصدير إكسيل</span>
                </button>

                {/* 4. Company Colors */}
                <button
                  onClick={() => setShowCompanyColorsModal(true)}
                  className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/30 text-purple-300 transition-colors"
                >
                  <Palette className="w-5 h-5 text-purple-400" />
                  <span className="text-[11px] font-bold">ألوان السرايا</span>
                </button>

              </div>
            </div>

            {/* Recent Recruits Touch Feed */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-extrabold text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  أحدث المجندين المسجلين
                </span>
                <button
                  onClick={() => setActiveTab('directory')}
                  className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                >
                  <span>عرض الكل ({totalCount})</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              {loadingRecruits ? (
                <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                  <span>جاري تحميل أحدث السجلات...</span>
                </div>
              ) : recruits.length === 0 ? (
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 text-center text-slate-400 text-xs">
                  لا توجد سجلات مسجلة في هذا الدفع حتى الآن.
                </div>
              ) : (
                <div className="space-y-2">
                  {recruits.slice(0, 6).map((recruit) => {
                    const compStyle = getCompanyStyle(recruit.company, companyColors);
                    return (
                      <div
                        key={recruit.id}
                        onClick={() => {
                          setSelectedRecruit(recruit);
                          setEditFormData(recruit);
                          setIsEditingRecruit(false);
                        }}
                        className="bg-slate-900 hover:bg-slate-850 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between gap-3 transition-colors cursor-pointer shadow-sm active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Photo or placeholder */}
                          <div className="w-11 h-11 rounded-lg bg-slate-800 border border-slate-700/80 overflow-hidden shrink-0 flex items-center justify-center">
                            {recruit.photo_path ? (
                              <img 
                                src={`/uploads/${recruit.photo_path.replace(/\\/g, '/').split('/').pop()}`} 
                                alt={recruit.name} 
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <Camera className="w-5 h-5 text-slate-500" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">
                              {recruit.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                              <span>{recruit.military_number || 'بدون ر.ع'}</span>
                              <span>•</span>
                              <span>{recruit.qualification || 'متوسط'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {recruit.video_path && (
                            <span className="p-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30" title="تم تسجيل فيديو">
                              <Video className="w-3.5 h-3.5" />
                            </span>
                          )}

                          <span 
                            className="text-[10px] font-bold px-2 py-0.5 rounded border"
                            style={{
                              backgroundColor: compStyle.bg,
                              borderColor: compStyle.border,
                              color: compStyle.color
                            }}
                          >
                            {recruit.company ? recruit.company.replace('السرية ', '') : 'سرية'}
                          </span>

                          <ChevronLeft className="w-4 h-4 text-slate-500" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ══════════════════════════════════════════════════
            TAB 2: NEW RECRUIT REGISTRATION (تسجيل جديد)
           ══════════════════════════════════════════════════ */}
        {activeTab === 'new' && (
          <div>
            {!isMediaCapturing ? (
              <form onSubmit={handleProceedToMedia} className="space-y-4">
                
                {/* Form Header */}
                <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-emerald-400" />
                      استمارة كشك تسجيل مجند جديد
                    </h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      الدفع التجنيدي: <span className="text-emerald-400 font-bold">{activeBatch?.name || 'غير محدد'}</span>
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 text-slate-300">
                    خطوة 1 من 2
                  </span>
                </div>

                {/* Section 1: Basic Identifiers */}
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                    <FileText className="w-4 h-4" />
                    البيانات الشخصية والرسمية (كارت القيد)
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 font-semibold mb-1 block">
                      الاسم رباعي أو ثلاثي <span className="text-rose-400">*</span>
                    </label>
                    <input 
                      type="text" 
                      required 
                      placeholder="اكتب اسم المجند بالكامل..." 
                      value={newForm.name} 
                      onChange={e => setNewForm({ ...newForm, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] text-slate-300 font-semibold mb-1 block">الرقم العسكري</label>
                      <input 
                        type="text" 
                        placeholder="الرقم العسكري..." 
                        value={newForm.military_number} 
                        onChange={e => setNewForm({ ...newForm, military_number: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-300 font-semibold mb-1 block">
                        الرقم القومي (14 رقم)
                      </label>
                      <input 
                        type="text" 
                        maxLength={14}
                        placeholder="الرقم القومي..." 
                        value={newForm.national_id} 
                        onChange={e => handleNationalIdChange(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] text-slate-300 font-semibold mb-1 block">رقم الشرطة (كارت الدولاب)</label>
                      <input 
                        type="text" 
                        placeholder="رقم السلاح / القيد..." 
                        value={newForm.police_number} 
                        onChange={e => setNewForm({ ...newForm, police_number: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-300 font-semibold mb-1 block">رقم الهاتف</label>
                      <input 
                        type="tel" 
                        placeholder="01xxxxxxxxx" 
                        value={newForm.phone} 
                        onChange={e => setNewForm({ ...newForm, phone: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] text-slate-300 font-semibold mb-1 block">تاريخ الميلاد</label>
                      <input 
                        type="date" 
                        value={newForm.birth_date} 
                        onChange={e => setNewForm({ ...newForm, birth_date: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-300 font-semibold mb-1 block">المحافظة</label>
                      <input 
                        type="text" 
                        placeholder="مثال: الغربية / المنوفية" 
                        value={newForm.governorate} 
                        onChange={e => setNewForm({ ...newForm, governorate: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-300 font-semibold mb-1 block">العنوان ومحل الإقامة التفصيلي</label>
                    <input 
                      type="text" 
                      placeholder="المركز / القرية / الشارع ورقم المنزل..." 
                      value={newForm.address} 
                      onChange={e => setNewForm({ ...newForm, address: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] text-slate-300 font-semibold mb-1 block">المهنة الحالية</label>
                      <input 
                        type="text" 
                        placeholder="مثال: عامل / نجار / سائق" 
                        value={newForm.current_job} 
                        onChange={e => setNewForm({ ...newForm, current_job: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-300 font-semibold mb-1 block">مهن وحرف أخرى</label>
                      <input 
                        type="text" 
                        placeholder="مثال: كهربائي / سباك / نقاش" 
                        value={newForm.other_jobs} 
                        onChange={e => setNewForm({ ...newForm, other_jobs: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] text-slate-300 font-semibold mb-1 block">السفر خارج البلاد</label>
                      <select
                        value={newForm.travel_abroad}
                        onChange={e => setNewForm({ ...newForm, travel_abroad: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white outline-none"
                      >
                        <option value="لم يسافر خارج البلاد">لم يسافر خارج البلاد</option>
                        <option value="سافر للعمل بالخارج">سافر للعمل بالخارج</option>
                        <option value="سافر للسياحة">سافر للسياحة</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-300 font-semibold mb-1 block">القراءة والكتابة</label>
                      <select
                        value={newForm.literacy}
                        onChange={e => setNewForm({ ...newForm, literacy: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white outline-none"
                      >
                        <option value="يجيد القراءة والكتابة">يجيد القراءة والكتابة</option>
                        <option value="يقرأ ويكتب بصعوبة">يقرأ ويكتب بصعوبة</option>
                        <option value="لا يجيد (أمي)">لا يجيد (أمي)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Touch Radio Pills for Qualification, Religion, Company */}
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3.5">
                  <div className="text-xs font-bold text-blue-400 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                    <Briefcase className="w-4 h-4" />
                    المؤهل والسرية واللياقة
                  </div>

                  {/* Qualification Pills */}
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold block mb-1.5">المؤهل الدراسي</label>
                    <div className="grid grid-cols-5 gap-1">
                      {['عليا', 'فوق متوسط', 'متوسط', 'عادة', 'محو أمية'].map(q => (
                        <button
                          type="button"
                          key={q}
                          onClick={() => setNewForm({ ...newForm, qualification: q })}
                          className={`py-2 text-[11px] font-bold rounded-xl border transition-all ${
                            newForm.qualification === q 
                              ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-900/30' 
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Religion & Marital Status */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 font-bold block mb-1.5">الديانة</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {['مسلم', 'مسيحي'].map(rel => (
                          <button
                            type="button"
                            key={rel}
                            onClick={() => setNewForm({ ...newForm, religion: rel })}
                            className={`py-1.5 text-xs font-bold rounded-xl border ${
                              newForm.religion === rel 
                                ? 'bg-amber-600/30 text-amber-300 border-amber-500' 
                                : 'bg-slate-950 text-slate-400 border-slate-800'
                            }`}
                          >
                            {rel}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 font-bold block mb-1.5">الحالة الاجتماعية</label>
                      <div className="grid grid-cols-3 gap-1">
                        {['أعزب', 'متزوج', 'مطلق'].map(m => (
                          <button
                            type="button"
                            key={m}
                            onClick={() => setNewForm({ ...newForm, marital_status: m, wife: m })}
                            className={`py-1.5 text-[11px] font-bold rounded-xl border ${
                              newForm.marital_status === m 
                                ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500' 
                                : 'bg-slate-950 text-slate-400 border-slate-800'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Assigned Company & Special Units */}
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold block mb-1.5">السرية / الوحدة الملحق عليها (السرايا الـ 6 • سرية الأمن • القوة الأساسية)</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        'السرية الأولى ( ١ )',
                        'السرية الثانية ( ٢ )',
                        'السرية الثالثة ( ٣ )',
                        'السرية الرابعة ( ٤ )',
                        'السرية الخامسة ( ٥ )',
                        'السرية السادسة ( ٦ )',
                        'سرية الأمن',
                        'القوة الأساسية'
                      ].map(comp => {
                        const style = getCompanyStyle(comp, companyColors);
                        const isSelected = newForm.company === comp;
                        return (
                          <button
                            type="button"
                            key={comp}
                            onClick={() => setNewForm({ ...newForm, company: comp })}
                            className={`py-2 px-1 text-[11px] font-bold rounded-xl border transition-all text-center ${
                              isSelected 
                                ? 'border-white/90 shadow-md scale-[1.02]' 
                                : 'border-slate-800/80 opacity-70'
                            }`}
                            style={{
                              backgroundColor: style.bg,
                              borderColor: isSelected ? '#ffffff' : style.border,
                              color: style.color
                            }}
                          >
                            {comp.split('(')[0].trim()}
                          </button>
                        );
                      })}
                    </div>

                    {/* Special Military Units: سرية الأمن & القوة الأساسية */}
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80">
                      <div className="text-[10px] text-amber-400/90 font-bold mb-1.5 flex items-center gap-1">
                        <span>★</span>
                        <span>وحدات خاصة ومعسكر التدريب:</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {/* سرية الأمن */}
                        <button
                          type="button"
                          onClick={() => setNewForm({ ...newForm, company: 'سرية الأمن' })}
                          className={`py-2.5 px-2 rounded-xl border transition-all text-center flex items-center justify-center gap-1.5 ${
                            newForm.company === 'سرية الأمن'
                              ? 'bg-slate-900 border-amber-400 text-amber-300 shadow-md shadow-amber-950/40 scale-[1.02]'
                              : 'bg-slate-950/80 border-amber-600/30 text-amber-400/70 hover:border-amber-500/50'
                          }`}
                        >
                          <span className="text-amber-400 text-xs">★</span>
                          <span className="text-xs font-black">سرية الأمن</span>
                          <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">خاصة</span>
                        </button>

                        {/* القوة الأساسية */}
                        <button
                          type="button"
                          onClick={() => setNewForm({ ...newForm, company: 'القوة الأساسية' })}
                          className={`py-2.5 px-2 rounded-xl border transition-all text-center flex items-center justify-center gap-1.5 ${
                            newForm.company === 'القوة الأساسية'
                              ? 'bg-slate-900 border-indigo-400 text-indigo-300 shadow-md shadow-indigo-950/40 scale-[1.02]'
                              : 'bg-slate-950/80 border-indigo-600/30 text-indigo-400/70 hover:border-indigo-500/50'
                          }`}
                        >
                          <span className="text-indigo-400 text-xs">★</span>
                          <span className="text-xs font-black">القوة الأساسية</span>
                          <span className="text-[9px] px-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">دائم</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Medical Fitness */}
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold block mb-1.5">اللياقة الطبية</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {['لائق', 'لائق ب', 'غير لائق'].map(med => (
                        <button
                          type="button"
                          key={med}
                          onClick={() => setNewForm({ ...newForm, medical_status: med })}
                          className={`py-2 text-xs font-bold rounded-xl border ${
                            newForm.medical_status === med 
                              ? med === 'غير لائق' 
                                ? 'bg-rose-600 text-white border-rose-400' 
                                : 'bg-emerald-600 text-white border-emerald-400' 
                              : 'bg-slate-950 text-slate-400 border-slate-800'
                          }`}
                        >
                          {med}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Section 2.5: Family & Social Investigation Details */}
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                    <Users className="w-4 h-4" />
                    بيانات الأسرة والفحص الأمني للعائلة
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] text-slate-300 font-semibold mb-1 block">اسم الوالد</label>
                      <input 
                        type="text" 
                        placeholder="اسم الوالد ثلاثي..." 
                        value={newForm.father_name} 
                        onChange={e => setNewForm({ ...newForm, father_name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-300 font-semibold mb-1 block">مهنة الوالد</label>
                      <input 
                        type="text" 
                        placeholder="مثال: عامل / مزارع / متوفى" 
                        value={newForm.father_job} 
                        onChange={e => setNewForm({ ...newForm, father_job: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] text-slate-300 font-semibold mb-1 block">اسم الأم</label>
                      <input 
                        type="text" 
                        placeholder="اسم والدة المجند..." 
                        value={newForm.mother_name} 
                        onChange={e => setNewForm({ ...newForm, mother_name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-300 font-semibold mb-1 block">مهنة الأم</label>
                      <input 
                        type="text" 
                        placeholder="مثال: ربة منزل / موظفة" 
                        value={newForm.mother_job} 
                        onChange={e => setNewForm({ ...newForm, mother_job: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-300 font-semibold mb-1 block">فحص الإخوة والأشقاء</label>
                    <input 
                      type="text" 
                      placeholder="عدد الأشقاء وملاحظات الفحص عليهم..." 
                      value={newForm.siblings_check} 
                      onChange={e => setNewForm({ ...newForm, siblings_check: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] text-slate-300 font-semibold mb-1 block">الحالة الاجتماعية للأسرة</label>
                      <input 
                        type="text" 
                        placeholder="مستقرة / الوالدان على قيد الحياة..." 
                        value={newForm.family_social_status} 
                        onChange={e => setNewForm({ ...newForm, family_social_status: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-300 font-semibold mb-1 block">الموقف الجنائي والسياسي للعائلة</label>
                      <input 
                        type="text" 
                        placeholder="خالية من السوابق والشبهات..." 
                        value={newForm.family_security_status} 
                        onChange={e => setNewForm({ ...newForm, family_security_status: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: 20-Point Security Inspection Checklist */}
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <Shield className="w-4 h-4" />
                      مصفوفة الفحص الأمني (20 حقلاً)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...newForm };
                        inspectionFields.forEach(f => { updated[f.key] = 'سليم'; });
                        setNewForm(updated);
                        showToast('تم ضبط جميع الفحوصات الأمنية إلى (سليم)');
                      }}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20"
                    >
                      ضبط الكل: سليم
                    </button>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {inspectionFields.map(field => {
                      const isClear = newForm[field.key] === 'سليم';
                      return (
                        <div 
                          key={field.key} 
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                            isClear 
                              ? 'bg-slate-950/60 border-slate-800' 
                              : 'bg-rose-950/30 border-rose-600/60 shadow-sm shadow-rose-900/20'
                          }`}
                        >
                          <span className={`text-xs font-semibold ${isClear ? 'text-slate-300' : 'text-rose-300 font-bold'}`}>
                            {field.label}
                          </span>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => setNewForm({ ...newForm, [field.key]: 'سليم' })}
                              className={`px-2 py-1 text-[10px] font-bold rounded-lg border ${
                                isClear 
                                  ? 'bg-emerald-600 text-white border-emerald-500' 
                                  : 'bg-slate-900 text-slate-400 border-slate-800'
                              }`}
                            >
                              سليم
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewForm({ ...newForm, [field.key]: 'إيجابي' })}
                              className={`px-2 py-1 text-[10px] font-bold rounded-lg border ${
                                !isClear 
                                  ? 'bg-rose-600 text-white border-rose-500' 
                                  : 'bg-slate-900 text-slate-400 border-slate-800'
                              }`}
                            >
                              ملاحظة
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section 4: Remarks */}
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <label className="text-[11px] text-slate-400 font-bold block">ملاحظات التحريات والتعليمات</label>
                  <textarea 
                    rows={2}
                    placeholder="أي ملاحظات أمنية أو بدنية أو نفسية إضافية..."
                    value={newForm.notes}
                    onChange={e => setNewForm({ ...newForm, notes: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none resize-none"
                  />
                </div>

                {/* Proceed Button */}
                <button
                  type="submit"
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transform active:scale-[0.98] transition-all"
                >
                  <Camera className="w-4 h-4" />
                  <span>متابعة: التقاط الصورة وتصوير الفيديو</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>

              </form>
            ) : (
              /* Step 2: Camera & Video Capture */
              <div className="space-y-3">
                <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span>محطة التصوير الميداني: {pendingFormData?.name}</span>
                  </div>
                  <button
                    onClick={() => setIsMediaCapturing(false)}
                    className="text-xs text-slate-400 hover:text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700"
                  >
                    تعديل البيانات
                  </button>
                </div>

                <MediaCapture
                  formData={pendingFormData}
                  onSaveSuccess={handleMediaSaved}
                  onBack={() => setIsMediaCapturing(false)}
                  onCancel={() => {
                    setIsMediaCapturing(false);
                    setPendingFormData(null);
                    setActiveTab('home');
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            TAB 3: DIRECTORY (السجل الميداني)
           ══════════════════════════════════════════════════ */}
        {activeTab === 'directory' && (
          <div className="space-y-3">
            
            {/* Search Bar & View Mode Toggle & Filter Trigger */}
            <div className="bg-slate-900 p-2.5 rounded-2xl border border-slate-800 space-y-2 shadow-lg">
              
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  <input
                    type="text"
                    placeholder="ابحث بالاسم، الرقم العسكري، القومي، المحافظة..."
                    value={searchTerm}
                    onChange={e => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pr-9 pl-8 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')} 
                      className="absolute left-2.5 top-2.5 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Quick QR Camera Scanner */}
                <button
                  onClick={() => setShowMobileQrScanner(true)}
                  className="p-2.5 rounded-xl border bg-slate-850 hover:bg-slate-800 text-blue-400 hover:text-blue-300 border-slate-700 hover:border-blue-500 transition-all flex items-center justify-center shrink-0 shadow-sm active:scale-95"
                  title="مسح كود المجند بالكاميرا للبحث الفوري"
                >
                  <Scan className="w-4 h-4" />
                </button>

                {/* Filter Sheet Trigger */}
                <button
                  onClick={() => setIsFilterSheetOpen(true)}
                  className={`p-2.5 rounded-xl border flex items-center gap-1 transition-all ${
                    getActiveFilterCount() > 0 
                      ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-900/40' 
                      : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                  title="تصفية وفلاتر متقدمة"
                >
                  <Filter className="w-4 h-4" />
                  {getActiveFilterCount() > 0 && (
                    <span className="w-4 h-4 rounded-full bg-white text-blue-700 text-[10px] font-black flex items-center justify-center">
                      {getActiveFilterCount()}
                    </span>
                  )}
                </button>

                {/* Grid vs Table View Toggle */}
                <div className="flex items-center bg-slate-950 rounded-xl p-0.5 border border-slate-800">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg ${viewMode === 'grid' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
                    title="عرض البطاقات"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-lg ${viewMode === 'table' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
                    title="عرض الجدول السريع"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Active Filter Chips / Counter */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>
                  النتائج: <strong className="text-white font-mono">{totalCount}</strong> مجند
                </span>
                {getActiveFilterCount() > 0 && (
                  <button
                    onClick={resetFilters}
                    className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                  >
                    <span>إلغاء الفلاتر ({getActiveFilterCount()})</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

            </div>

            {/* Bulk Selection Bar (if any selected) */}
            {selectedIds.length > 0 && (
              <div className="bg-gradient-to-r from-blue-950/80 to-slate-900 p-2.5 rounded-xl border border-blue-500/40 flex items-center justify-between gap-2 shadow-lg animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleSelectAll}
                    className="text-xs font-bold text-blue-300 bg-blue-500/20 px-2 py-1 rounded border border-blue-500/30"
                  >
                    {selectedIds.length === recruits.length ? 'إلغاء التحديد' : 'تحديد الكل'}
                  </button>
                  <span className="text-xs font-bold text-white">
                    تم تحديد <strong className="text-blue-400 font-mono">{selectedIds.length}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تصدير ({selectedIds.length})</span>
                  </button>

                  {(!currentUser || currentUser.role === 'admin') && (
                    <button
                      onClick={handleBulkDelete}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-rose-950/50"
                      title="حذف المجندين المحددين نهائياً"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف ({selectedIds.length})</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Recruits List: Grid Cards vs Compact Table */}
            {loadingRecruits ? (
              <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                <span>جاري تحميل السجل الميداني...</span>
              </div>
            ) : recruits.length === 0 ? (
              <div className="bg-slate-900/60 p-8 rounded-2xl border border-slate-800 text-center space-y-2">
                <p className="text-sm font-bold text-slate-300">لا توجد سجلات تطابق شروط البحث والفلترة.</p>
                <button
                  onClick={resetFilters}
                  className="text-xs text-blue-400 underline font-semibold"
                >
                  إعادة ضبط جميع الفلاتر
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              /* GRID CARDS VIEW */
              <div className="space-y-2.5">
                {recruits.map((recruit) => {
                  const compStyle = getCompanyStyle(recruit.company, companyColors);
                  const isSelected = selectedIds.includes(recruit.id);
                  const hasInspectionIssues = recruit.inspection && recruit.inspection !== 'سليم';

                  return (
                    <div
                      key={recruit.id}
                      className={`bg-slate-900 rounded-2xl border p-3.5 transition-all shadow-sm relative ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-950/20' 
                          : hasInspectionIssues 
                            ? 'border-rose-900/40 hover:border-rose-700/60' 
                            : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        
                        {/* Checkbox & Avatar */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRecruit(recruit.id)}
                            className="w-4 h-4 rounded accent-blue-600 shrink-0 cursor-pointer"
                          />

                          <div 
                            onClick={() => {
                              setSelectedRecruit(recruit);
                              setEditFormData(recruit);
                              setIsEditingRecruit(false);
                            }}
                            className="w-13 h-13 rounded-xl bg-slate-850 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer"
                          >
                            {recruit.photo_path ? (
                              <img 
                                src={`/uploads/${recruit.photo_path.replace(/\\/g, '/').split('/').pop()}`} 
                                alt={recruit.name} 
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <Camera className="w-6 h-6 text-slate-500" />
                            )}
                          </div>

                          {/* Info */}
                          <div 
                            onClick={() => {
                              setSelectedRecruit(recruit);
                              setEditFormData(recruit);
                              setIsEditingRecruit(false);
                            }}
                            className="min-w-0 cursor-pointer"
                          >
                            <div className="text-xs font-black text-white truncate">
                              {recruit.name}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {recruit.military_number || recruit.national_id || 'سجل جديد'}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-1">
                              <span>{recruit.qualification || 'متوسط'}</span>
                              <span>•</span>
                              <span>{recruit.governorate || recruit.address || 'وسط الدلتا'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Badges & Inspect Button */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span 
                            className="text-[10px] font-bold px-2 py-0.5 rounded border"
                            style={{
                              backgroundColor: compStyle.bg,
                              borderColor: compStyle.border,
                              color: compStyle.color
                            }}
                          >
                            {recruit.company ? recruit.company.replace('السرية ', '') : 'السرية'}
                          </span>

                          <div className="flex items-center gap-1 mt-1">
                            {recruit.video_path && (
                              <span className="p-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30" title="فيديو استجواب">
                                <Video className="w-3 h-3" />
                              </span>
                            )}
                            {hasInspectionIssues && (
                              <span className="p-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30" title="تحريات إيجابية">
                                <Shield className="w-3 h-3" />
                              </span>
                            )}
                            <button
                              onClick={() => {
                                setSelectedRecruit(recruit);
                                setEditFormData(recruit);
                                setIsEditingRecruit(false);
                              }}
                              className="px-2 py-1 rounded bg-slate-800 text-slate-200 text-[10px] font-bold border border-slate-700 hover:bg-slate-700"
                            >
                              فحص
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* COMPACT TABLE VIEW */
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-850 text-slate-400 font-bold border-b border-slate-800 text-[11px]">
                      <tr>
                        <th className="p-2.5 w-8">
                          <input 
                            type="checkbox" 
                            checked={selectedIds.length === recruits.length && recruits.length > 0} 
                            onChange={toggleSelectAll}
                            className="accent-blue-600"
                          />
                        </th>
                        <th className="p-2.5">المجند</th>
                        <th className="p-2.5">الرقم العسكري</th>
                        <th className="p-2.5">السرية</th>
                        <th className="p-2.5">الحالة</th>
                        <th className="p-2.5 text-center">إجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {recruits.map(recruit => {
                        const compStyle = getCompanyStyle(recruit.company, companyColors);
                        const isSelected = selectedIds.includes(recruit.id);
                        return (
                          <tr key={recruit.id} className="hover:bg-slate-850/60 transition-colors">
                            <td className="p-2.5">
                              <input 
                                type="checkbox" 
                                checked={isSelected} 
                                onChange={() => toggleSelectRecruit(recruit.id)}
                                className="accent-blue-600"
                              />
                            </td>
                            <td className="p-2.5 font-bold text-white truncate max-w-[130px]">
                              {recruit.name}
                            </td>
                            <td className="p-2.5 font-mono text-[11px] text-slate-300">
                              {recruit.military_number || '-'}
                            </td>
                            <td className="p-2.5">
                              <span 
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded border"
                                style={{
                                  backgroundColor: compStyle.bg,
                                  borderColor: compStyle.border,
                                  color: compStyle.color
                                }}
                              >
                                {recruit.company ? recruit.company.replace('السرية ', '') : '-'}
                              </span>
                            </td>
                            <td className="p-2.5">
                              {recruit.inspection === 'سليم' ? (
                                <span className="text-[10px] text-emerald-400 font-bold">سليم</span>
                              ) : (
                                <span className="text-[10px] text-rose-400 font-bold">تحريات</span>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                onClick={() => {
                                  setSelectedRecruit(recruit);
                                  setEditFormData(recruit);
                                  setIsEditingRecruit(false);
                                }}
                                className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30"
                              >
                                عرض
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-xs text-slate-300">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed font-bold"
                >
                  السابق
                </button>
                <span className="font-mono">
                  صفحة <strong className="text-white">{page}</strong> من <strong className="text-white">{totalPages}</strong>
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed font-bold"
                >
                  التالي
                </button>
              </div>
            )}

          </div>
        )}

        {/* ══════════════════════════════════════════════════
            TAB 4: ANALYTICS & CHARTS (التحليلات والرسوم)
           ══════════════════════════════════════════════════ */}
        {activeTab === 'analytics' && (
          <div className="space-y-3.5">
            <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  لوحة الإحصائيات والتحليلات الميدانية
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  الدفع التجنيدي: <span className="text-blue-400 font-bold">{activeBatch?.name || 'الكل'}</span>
                </p>
              </div>
              <button
                onClick={() => setShowExportModal(true)}
                className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تصدير</span>
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 font-bold">المؤهلات العليا</div>
                <div className="text-lg font-black text-blue-400 font-mono mt-1">
                  {recruits.filter(r => r.qualification === 'عليا').length}
                </div>
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 font-bold">المؤهل المتوسط</div>
                <div className="text-lg font-black text-amber-400 font-mono mt-1">
                  {recruits.filter(r => r.qualification === 'متوسط').length}
                </div>
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 font-bold">العادة / المهني</div>
                <div className="text-lg font-black text-emerald-400 font-mono mt-1">
                  {recruits.filter(r => r.qualification === 'عادة').length}
                </div>
              </div>
            </div>

            {/* Company Distribution Progress Bars */}
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="text-xs font-extrabold text-white flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                توزيع المجندين حسب السرايا
              </div>

              {[
                'السرية الأولى ( ١ )',
                'السرية الثانية ( ٢ )',
                'السرية الثالثة ( ٣ )',
                'السرية الرابعة ( ٤ )',
                'السرية الخامسة ( ٥ )',
                'السرية السادسة ( ٦ )',
                'سرية الأمن',
                'القوة الأساسية'
              ].map(comp => {
                const count = recruits.filter(r => r.company === comp).length;
                const percent = recruits.length > 0 ? Math.round((count / recruits.length) * 100) : 0;
                const style = getCompanyStyle(comp, companyColors);

                return (
                  <div key={comp} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">{comp}</span>
                      <span className="font-mono text-slate-400">
                        <strong className="text-white">{count}</strong> مجند ({percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: style.color || '#3b82f6'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Medical & Security Breakdown Cards */}
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="text-xs font-extrabold text-white flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <Shield className="w-4 h-4 text-rose-400" />
                مؤشرات الفحص الطبي والأمني
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">لائق طبياً (أ/ب):</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {recruits.filter(r => (r.medical_status || '').includes('لائق')).length}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">غير لائق طبياً:</span>
                  <span className="font-bold text-rose-400 font-mono">
                    {recruits.filter(r => r.medical_status === 'غير لائق').length}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">سليم أمنياً:</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {recruits.filter(r => r.inspection === 'سليم').length}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">ملاحظات أمنية:</span>
                  <span className="font-bold text-rose-400 font-mono">
                    {recruits.filter(r => r.inspection && r.inspection !== 'سليم').length}
                  </span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ══════════════════════════════════════════════════
            TAB 5: AI ASSISTANT (المساعد الذكي)
           ══════════════════════════════════════════════════ */}
        {activeTab === 'ai' && (
          <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            
            {/* AI Top Header with LiquidOrb */}
            <div className="bg-gradient-to-r from-slate-900 via-purple-950/30 to-slate-900 p-3 border-b border-purple-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <LiquidOrb size={32} state={isAiLoading ? 'thinking' : 'idle'} />
                <div>
                  <div className="text-xs font-black text-white flex items-center gap-1.5">
                    <span>مساعد التحريات الذكي</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                  </div>
                  <div className="text-[10px] text-purple-300">
                    {isAiLoading ? 'جاري التحليل واستخراج البيانات...' : 'جاهز للإجابة والاستعلام اللحظي'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setAiMessages([aiMessages[0]])}
                className="text-[11px] text-slate-400 hover:text-white bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700 flex items-center gap-1"
                title="تفريغ المحادثة"
              >
                <RotateCcw className="w-3 h-3" />
                <span>جديد</span>
              </button>
            </div>

            {/* Chat Messages Feed */}
            <div ref={aiScrollRef} className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs">
              {aiMessages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div 
                    className={`max-w-[88%] p-3 rounded-2xl leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-900/30' 
                        : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-none shadow-md'
                    }`}
                  >
                    <div className="whitespace-pre-wrap font-sans text-[12px]">{msg.content}</div>

                    {/* Data Summary Pill if returned */}
                    {msg.dataSummary && (
                      <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-purple-300 font-mono">
                        {msg.dataSummary}
                      </div>
                    )}
                  </div>

                  {/* Quick Suggestions Chips */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {msg.suggestions.map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => handleSendAiMessage(sug)}
                          className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition-all active:scale-95"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isAiLoading && (
                <div className="flex items-center gap-2 p-3 bg-slate-950 rounded-2xl border border-slate-800 w-fit text-xs text-purple-300">
                  <LiquidOrb size={18} state="thinking" />
                  <span>المساعد الذكي يقوم بفحص السجلات واستخراج البيان...</span>
                </div>
              )}
            </div>

            {/* AI Input Form */}
            <div className="p-2.5 bg-slate-950 border-t border-slate-800">
              <form 
                onSubmit={e => {
                  e.preventDefault();
                  handleSendAiMessage();
                }}
                className="flex items-center gap-2"
              >
                <input 
                  type="text"
                  placeholder="اسأل المساعد عن أي مجند أو إحصائية..."
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  disabled={isAiLoading}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-purple-500 outline-none"
                />
                <button
                  type="submit"
                  disabled={!aiInput.trim() || isAiLoading}
                  className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white shadow"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

          </div>
        )}

        {/* ══════════════════════════════════════════════════
            TAB 6: TOOLS & ADMIN (الأدوات ومركز الإدارة)
           ══════════════════════════════════════════════════ */}
        {activeTab === 'tools' && (
          <div className="space-y-3.5">
            
            <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
              <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-cyan-400" />
                مركز الإدارة والعمليات الميدانية
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                كافة أدوات منظومة الفحص والتحريات والنسخ الاحتياطي
              </p>
            </div>

            {/* Tools Menu List */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 divide-y divide-slate-800/80 overflow-hidden shadow">
              
              {/* 1. Batches Management */}
              <div 
                onClick={onOpenBatches}
                className="p-3.5 flex items-center justify-between hover:bg-slate-850 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">إدارة الدفوع التجنيدية</div>
                    <div className="text-[11px] text-slate-400">
                      الدفع الحالي: <span className="text-emerald-400 font-semibold">{activeBatch?.name || 'غير محدد'}</span>
                    </div>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-500" />
              </div>

              {/* 2. Export Suite (Excel / Cards / PDF) */}
              <div 
                onClick={() => setShowExportModal(true)}
                className="p-3.5 flex items-center justify-between hover:bg-slate-850 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">تصدير التقارير وبطاقات التعارف</div>
                    <div className="text-[11px] text-slate-400">تصدير Excel، كروت التعارف، والملفات الشاملة</div>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-500" />
              </div>

              {/* 3. Company Colors */}
              <div 
                onClick={() => setShowCompanyColorsModal(true)}
                className="p-3.5 flex items-center justify-between hover:bg-slate-850 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                    <Palette className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">تخصيص ألوان ورموز السرايا</div>
                    <div className="text-[11px] text-slate-400">تنسيق ألوان وشارات كروت السرايا</div>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-500" />
              </div>

              {/* 4. External Drive Backup */}
              <div 
                onClick={onOpenBackup}
                className="p-3.5 flex items-center justify-between hover:bg-slate-850 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">النسخ الاحتياطي والهارد الخارجي</div>
                    <div className="text-[11px] text-slate-400">سحب نسخة فورية آمنة لقاعدة البيانات والوسائط</div>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-500" />
              </div>

              {/* 5. Users & Permissions (Admin only) */}
              {(!currentUser || currentUser.role === 'admin') && (
                <div 
                  onClick={onOpenUsers}
                  className="p-3.5 flex items-center justify-between hover:bg-slate-850 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">إدارة المستخدمين والصلاحيات</div>
                      <div className="text-[11px] text-slate-400">حسابات ضباط الكشك والتحريات وكلمات المرور</div>
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-slate-500" />
                </div>
              )}

              {/* 6. Activity Log (Audit Trail) */}
              <div 
                onClick={onOpenAuditLogs}
                className="p-3.5 flex items-center justify-between hover:bg-slate-850 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">سجل العمليات والرقابة (Audit Log)</div>
                    <div className="text-[11px] text-slate-400">سجل حركات النظام والدخول والتعديلات</div>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-500" />
              </div>

              {/* 7. Local Wi-Fi Sync */}
              <div 
                onClick={onOpenNetwork}
                className="p-3.5 flex items-center justify-between hover:bg-slate-850 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                    <Wifi className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">شبكة الربط الداخلي والـ QR</div>
                    <div className="text-[11px] text-slate-400">ربط هواتف وأجهزة اللجان بالشبكة المحلية</div>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-500" />
              </div>

              {/* 8. Change Password */}
              <div 
                onClick={onOpenChangePassword}
                className="p-3.5 flex items-center justify-between hover:bg-slate-850 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center border border-slate-700">
                    <KeyRound className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">تغيير كلمة المرور</div>
                    <div className="text-[11px] text-slate-400">تحديث كلمة السر الخاصة بحسابك</div>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-500" />
              </div>

            </div>

            {/* Desktop Switch & Logout Action */}
            <div className="space-y-2 pt-2">
              <button
                onClick={onSwitchToDesktop}
                className="w-full py-3 px-4 rounded-xl bg-slate-850 hover:bg-slate-800 text-cyan-300 border border-slate-700 text-xs font-bold flex items-center justify-center gap-2 shadow"
              >
                <Monitor className="w-4 h-4" />
                <span>التبديل إلى نسخة شاشة الكمبيوتر (Desktop View)</span>
              </button>

              <button
                onClick={onLogout}
                className="w-full py-3 px-4 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4 text-slate-400" />
                <span>تسجيل الخروج من الحساب</span>
              </button>

              <button
                onClick={handleQuitApp}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-950 to-red-950 hover:from-rose-900 hover:to-red-900 text-rose-200 border border-rose-800/60 text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40"
              >
                <Power className="w-4 h-4 text-rose-400" />
                <span>إغلاق المنظومة وإنهاء تشغيل البرنامج</span>
              </button>
            </div>

          </div>
        )}

      </main>

      {/* ══════════════════════════════════════════════════
          BOTTOM FILTER SHEET (درج الفلترة المتقدمة)
         ══════════════════════════════════════════════════ */}
      {isFilterSheetOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-200">
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl w-full max-w-lg p-4 space-y-4 max-h-[85vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-400" />
                تصفية وفلاتر السجل الميداني
              </h3>
              <button 
                onClick={() => setIsFilterSheetOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter: Batch */}
            <div>
              <label className="text-xs font-bold text-slate-300 mb-1.5 block">الدفع التجنيدي</label>
              <select
                value={filterBatch}
                onChange={e => setFilterBatch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none"
              >
                <option value="all">كافة الدفوع المسجلة</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Filter: Company */}
            <div>
              <label className="text-xs font-bold text-slate-300 mb-1.5 block">السرية / الوحدة</label>
              <select
                value={filterCompany}
                onChange={e => setFilterCompany(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none"
              >
                <option value="all">كافة السرايا والوحدات</option>
                <option value="السرية الأولى ( ١ )">السرية الأولى</option>
                <option value="السرية الثانية ( ٢ )">السرية الثانية</option>
                <option value="السرية الثالثة ( ٣ )">السرية الثالثة</option>
                <option value="السرية الرابعة ( ٤ )">السرية الرابعة</option>
                <option value="السرية الخامسة ( ٥ )">السرية الخامسة</option>
                <option value="السرية السادسة ( ٦ )">السرية السادسة</option>
                <option value="سرية الأمن">سرية الأمن (خاصة)</option>
                <option value="القوة الأساسية">القوة الأساسية (المركز)</option>
              </select>
            </div>

            {/* Filter: Qualification */}
            <div>
              <label className="text-xs font-bold text-slate-300 mb-1.5 block">المؤهل الدراسي</label>
              <div className="grid grid-cols-4 gap-1.5">
                {['all', 'عليا', 'فوق متوسط', 'متوسط', 'عادة'].map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setFilterQualification(q)}
                    className={`py-1.5 text-xs font-bold rounded-lg border ${
                      filterQualification === q 
                        ? 'bg-blue-600 text-white border-blue-400' 
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    {q === 'all' ? 'الكل' : q}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter: Security Investigation */}
            <div>
              <label className="text-xs font-bold text-slate-300 mb-1.5 block">الموقف الأمني والتحريات</label>
              <select
                value={filterSecurity}
                onChange={e => setFilterSecurity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none"
              >
                <option value="all">الكل (سليم وإيجابي)</option>
                <option value="criminal_record">أرباب سوابق / جنائي</option>
                <option value="political_suspect">شبهة سياسية</option>
                <option value="registered_relatives">أقارب مسجلين</option>
                <option value="travel_abroad">سفر للخارج</option>
                <option value="unbalanced_behavior">سلوك غير متزن</option>
                <option value="addiction_history">شبهة إدمان</option>
              </select>
            </div>

            {/* Filter: Medical */}
            <div>
              <label className="text-xs font-bold text-slate-300 mb-1.5 block">اللياقة الطبية</label>
              <div className="grid grid-cols-4 gap-1.5">
                {['all', 'لائق', 'لائق ب', 'غير لائق'].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setFilterMedical(m)}
                    className={`py-1.5 text-xs font-bold rounded-lg border ${
                      filterMedical === m 
                        ? 'bg-emerald-600 text-white border-emerald-400' 
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    {m === 'all' ? 'الكل' : m}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter: Media (Video & Photo) */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-300 mb-1 block">تسجيل الفيديو</label>
                <select
                  value={filterVideo}
                  onChange={e => setFilterVideo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white outline-none"
                >
                  <option value="all">الكل</option>
                  <option value="with_video">يوجد فيديو</option>
                  <option value="no_video">بدون فيديو</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 mb-1 block">التقاط الصورة</label>
                <select
                  value={filterPhoto}
                  onChange={e => setFilterPhoto(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white outline-none"
                >
                  <option value="all">الكل</option>
                  <option value="with_photo">يوجد صورة</option>
                  <option value="no_photo">بدون صورة</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  setPage(1);
                  setIsFilterSheetOpen(false);
                }}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow"
              >
                تطبيق الفلاتر
              </button>

              <button
                onClick={resetFilters}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700"
              >
                إعادة ضبط
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          RECRUIT DOSSIER SHEET (درج فحص وتعديل المجند الميداني)
         ══════════════════════════════════════════════════ */}
      {selectedRecruit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-200">
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl w-full max-w-lg p-4 space-y-3.5 max-h-[90vh] overflow-y-auto">
            
            {/* Header with Close */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 min-w-0">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-black text-white truncate">
                  ملف المجند: {selectedRecruit.name}
                </span>
              </div>
              <button 
                onClick={() => {
                  setSelectedRecruit(null);
                  setIsEditingRecruit(false);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Media Block: Photo & Video Player */}
            <div className="grid grid-cols-2 gap-2">
              {/* Photo */}
              <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 h-36 flex items-center justify-center relative">
                {selectedRecruit.photo_path ? (
                  <img 
                    src={`/uploads/${selectedRecruit.photo_path.replace(/\\/g, '/').split('/').pop()}`} 
                    alt={selectedRecruit.name} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="text-slate-500 text-xs flex flex-col items-center gap-1">
                    <Camera className="w-6 h-6" />
                    <span>لا توجد صورة</span>
                  </div>
                )}
              </div>

              {/* Video Player */}
              <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 h-36 flex items-center justify-center relative">
                {selectedRecruit.video_path ? (
                  <video 
                    controls
                    playsInline
                    src={`/uploads/${selectedRecruit.video_path.replace(/\\/g, '/').split('/').pop()}`}
                    className="w-full h-full object-contain bg-black"
                  />
                ) : (
                  <div className="text-slate-500 text-xs flex flex-col items-center gap-1 p-2 text-center">
                    <Video className="w-6 h-6" />
                    <span>لا يوجد فيديو مسجل</span>
                  </div>
                )}
              </div>
            </div>

            {/* Specialized 6-Action Bar */}
            <div className="grid grid-cols-3 gap-1.5 text-center">
              
              {/* 1. Ticket */}
              <button
                onClick={() => setTicketRecruit(selectedRecruit)}
                className="p-2 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold flex flex-col items-center gap-1"
              >
                <IdCard className="w-4 h-4 text-indigo-400" />
                <span>تذكرة الباركود</span>
              </button>

              {/* 2. Documents */}
              <button
                onClick={() => setDocumentsRecruit(selectedRecruit)}
                className="p-2 rounded-xl bg-cyan-600/15 hover:bg-cyan-600/25 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold flex flex-col items-center gap-1"
              >
                <FileCheck className="w-4 h-4 text-cyan-400" />
                <span>الوثائق والمرفقات</span>
              </button>

              {/* 3. Psychological */}
              <button
                onClick={() => setPsychologicalRecruit(selectedRecruit)}
                className="p-2 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/30 text-purple-300 text-[11px] font-bold flex flex-col items-center gap-1"
              >
                <Brain className="w-4 h-4 text-purple-400" />
                <span>متابعة نفسية</span>
              </button>

              {/* 4. Official Print */}
              <button
                onClick={() => setPrintRecruit(selectedRecruit)}
                className="p-2 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold flex flex-col items-center gap-1"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>تقرير رسمي A4</span>
              </button>

              {/* 4.5. Activity & Events Log */}
              <button
                onClick={() => setActivityRecruit(selectedRecruit)}
                className="p-2 rounded-xl bg-teal-600/15 hover:bg-teal-600/25 border border-teal-500/30 text-teal-300 text-[11px] font-bold flex flex-col items-center gap-1"
                title="سجل المتابعات والتحركات الطبية والوقائع"
              >
                <Activity className="w-4 h-4 text-teal-400" />
                <span>المتابعة والوقائع</span>
              </button>

              {/* 4.6. History / Timeline */}
              <button
                onClick={() => setHistoryRecruit(selectedRecruit)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-amber-300 text-[11px] font-bold flex flex-col items-center gap-1"
                title="سجل التعديلات والعمليات السابقة"
              >
                <History className="w-4 h-4 text-amber-400" />
                <span>سجل التعديلات</span>
              </button>

              {/* 5. Edit Dossier (Not allowed for Operator) */}
              {(!currentUser || currentUser.role !== 'operator') && (
                <button
                  onClick={() => setIsEditingRecruit(!isEditingRecruit)}
                  className="p-2 rounded-xl bg-amber-600/15 hover:bg-amber-600/25 border border-amber-500/30 text-amber-300 text-[11px] font-bold flex flex-col items-center gap-1"
                >
                  <Edit3 className="w-4 h-4 text-amber-400" />
                  <span>{isEditingRecruit ? 'إلغاء التعديل' : 'تعديل الملف'}</span>
                </button>
              )}

              {/* 6. Delete (Admin Only) */}
              {(!currentUser || currentUser.role === 'admin') && (
                <button
                  onClick={() => handleDeleteRecruit(selectedRecruit.id)}
                  className="p-2 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-rose-300 text-[11px] font-bold flex flex-col items-center gap-1"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>حذف السجل</span>
                </button>
              )}

            </div>

            {/* Dossier Body: View or Edit Mode */}
            {!isEditingRecruit ? (
              <div className="space-y-3">
                {/* Details table */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">الرقم العسكري:</span>
                    <span className="font-bold text-white font-mono">{selectedRecruit.military_number || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">الرقم القومي:</span>
                    <span className="font-bold text-white font-mono">{selectedRecruit.national_id || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">رقم الشرطة (كارت الدولاب):</span>
                    <span className="font-bold text-cyan-400 font-mono">{selectedRecruit.police_number || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">السرية / الوحدة:</span>
                    <span className="font-bold text-emerald-400">{selectedRecruit.company || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">المؤهل الدراسي:</span>
                    <span className="font-bold text-white">{selectedRecruit.qualification || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">المهنة الحالية / الحرف:</span>
                    <span className="font-bold text-white">{selectedRecruit.current_job || '-'} {selectedRecruit.other_jobs ? `(${selectedRecruit.other_jobs})` : ''}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">محل الإقامة:</span>
                    <span className="font-bold text-white">{selectedRecruit.address || selectedRecruit.governorate || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">رقم الهاتف:</span>
                    <span className="font-bold text-white font-mono">{selectedRecruit.phone || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">اللياقة الطبية:</span>
                    <span className="font-bold text-emerald-400">{selectedRecruit.medical_status || 'لائق'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">السفر للخارج:</span>
                    <span className="font-bold text-white">{selectedRecruit.travel_abroad || 'لم يسافر خارج البلاد'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">إجادة القراءة والكتابة:</span>
                    <span className="font-bold text-white">{selectedRecruit.literacy || 'يجيد القراءة والكتابة'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">الحالة الاجتماعية:</span>
                    <span className="font-bold text-white">{selectedRecruit.wife || selectedRecruit.marital_status || 'أعزب'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">الموقف الأمني العام:</span>
                    <span className={`font-bold ${selectedRecruit.inspection === 'سليم' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {selectedRecruit.inspection || 'سليم'}
                    </span>
                  </div>
                </div>

                {/* Family Details Box */}
                {(selectedRecruit.father_name || selectedRecruit.mother_name || selectedRecruit.siblings_check || selectedRecruit.family_security_status) && (
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                    <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5 border-b border-slate-800 pb-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>بيانات الأسرة والفحص العائلي</span>
                    </div>
                    {selectedRecruit.father_name && (
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-400">الوالد:</span>
                        <span className="font-bold text-white">{selectedRecruit.father_name} ({selectedRecruit.father_job || 'عامل'})</span>
                      </div>
                    )}
                    {selectedRecruit.mother_name && (
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-400">الأم:</span>
                        <span className="font-bold text-white">{selectedRecruit.mother_name} ({selectedRecruit.mother_job || 'ربة منزل'})</span>
                      </div>
                    )}
                    {selectedRecruit.siblings_check && (
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-400">فحص الأشقاء:</span>
                        <span className="font-bold text-white">{selectedRecruit.siblings_check}</span>
                      </div>
                    )}
                    {selectedRecruit.family_social_status && (
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-400">الحالة الاجتماعية للأسرة:</span>
                        <span className="font-bold text-white">{selectedRecruit.family_social_status}</span>
                      </div>
                    )}
                    {selectedRecruit.family_security_status && (
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-400">الموقف الأمني للعائلة:</span>
                        <span className="font-bold text-emerald-400">{selectedRecruit.family_security_status}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 20 Security Inspection Checkpoints display */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    <span>موقف التحريات الأمنية الـ 20 حقلاً</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    {inspectionFields.map(f => {
                      const val = selectedRecruit[f.key] || 'سليم';
                      const isClear = val === 'سليم';
                      return (
                        <div key={f.key} className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                          <span className="text-slate-400 truncate max-w-[90px]">{f.label.split('/')[0]}</span>
                          <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                            isClear ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {val}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedRecruit.notes && (
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                    <div className="text-slate-400 font-bold mb-1">الملاحظات المسجلة:</div>
                    <div className="text-white leading-relaxed">{selectedRecruit.notes}</div>
                  </div>
                )}
              </div>
            ) : (
              /* INLINE EDIT MODE */
              <div className="space-y-3">
                <div className="text-xs font-bold text-amber-400">تعديل بيانات المجند:</div>

                <div>
                  <label className="text-[11px] text-slate-400 font-bold block mb-1">الاسم بالكامل</label>
                  <input 
                    type="text"
                    value={editFormData.name || ''}
                    onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold block mb-1">الرقم العسكري</label>
                    <input 
                      type="text"
                      value={editFormData.military_number || ''}
                      onChange={e => setEditFormData({ ...editFormData, military_number: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold block mb-1">الرقم القومي</label>
                    <input 
                      type="text"
                      value={editFormData.national_id || ''}
                      onChange={e => setEditFormData({ ...editFormData, national_id: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white font-mono outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold block mb-1">رقم الشرطة (كارت الدولاب)</label>
                    <input 
                      type="text"
                      value={editFormData.police_number || ''}
                      onChange={e => setEditFormData({ ...editFormData, police_number: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold block mb-1">رقم الهاتف</label>
                    <input 
                      type="tel"
                      value={editFormData.phone || ''}
                      onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white font-mono outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold block mb-1">المؤهل</label>
                    <select
                      value={editFormData.qualification || 'متوسط'}
                      onChange={e => setEditFormData({ ...editFormData, qualification: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white outline-none"
                    >
                      <option value="عليا">عليا</option>
                      <option value="فوق متوسط">فوق متوسط</option>
                      <option value="متوسط">متوسط</option>
                      <option value="عادة">عادة</option>
                      <option value="محو أمية">محو أمية</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold block mb-1">السرية / الوحدة</label>
                    <select
                      value={editFormData.company || 'السرية الأولى ( ١ )'}
                      onChange={e => setEditFormData({ ...editFormData, company: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white outline-none"
                    >
                      <option value="السرية الأولى ( ١ )">السرية الأولى ( ١ )</option>
                      <option value="السرية الثانية ( ٢ )">السرية الثانية ( ٢ )</option>
                      <option value="السرية الثالثة ( ٣ )">السرية الثالثة ( ٣ )</option>
                      <option value="السرية الرابعة ( ٤ )">السرية الرابعة ( ٤ )</option>
                      <option value="السرية الخامسة ( ٥ )">السرية الخامسة ( ٥ )</option>
                      <option value="السرية السادسة ( ٦ )">السرية السادسة ( ٦ )</option>
                      <option value="سرية الأمن">سرية الأمن (خاصة)</option>
                      <option value="القوة الأساسية">القوة الأساسية (المركز)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold block mb-1">اللياقة الطبية</label>
                    <select
                      value={editFormData.medical_status || 'لائق'}
                      onChange={e => setEditFormData({ ...editFormData, medical_status: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white outline-none"
                    >
                      <option value="لائق">لائق</option>
                      <option value="لائق ب">لائق ب</option>
                      <option value="غير لائق">غير لائق</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold block mb-1">المهنة الحالية</label>
                    <input 
                      type="text"
                      value={editFormData.current_job || ''}
                      onChange={e => setEditFormData({ ...editFormData, current_job: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold block mb-1">اسم الوالد</label>
                    <input 
                      type="text"
                      value={editFormData.father_name || ''}
                      onChange={e => setEditFormData({ ...editFormData, father_name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold block mb-1">اسم الأم</label>
                    <input 
                      type="text"
                      value={editFormData.mother_name || ''}
                      onChange={e => setEditFormData({ ...editFormData, mother_name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 font-bold block mb-1">الملاحظات</label>
                  <textarea 
                    rows={2}
                    value={editFormData.notes || ''}
                    onChange={e => setEditFormData({ ...editFormData, notes: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white outline-none resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow"
                  >
                    حفظ التعديلات فوراً
                  </button>
                  <button
                    onClick={() => setIsEditingRecruit(false)}
                    className="px-4 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          OVERLAY MODALS (نوافذ العمليات المتخصصة)
         ══════════════════════════════════════════════════ */}

      {/* 1. Ticket Modal (تذكرة التسجيل العسكرية والباركود) */}
      {ticketRecruit && (
        <TicketModal
          isOpen={!!ticketRecruit}
          recruit={ticketRecruit}
          onClose={() => setTicketRecruit(null)}
          onTicketChanged={fetchMobileRecruits}
        />
      )}

      {/* 2. Documents & Attachments Modal (المستندات والوثائق المصورة) */}
      {documentsRecruit && (
        <RecruitDocumentsModal
          recruit={documentsRecruit}
          onClose={() => setDocumentsRecruit(null)}
          onRefreshRecruits={fetchMobileRecruits}
        />
      )}

      {/* 3. Psychological Followup Modal (المتابعة النفسية والعصبية) */}
      {psychologicalRecruit && (
        <PsychologicalFollowupModal
          isOpen={!!psychologicalRecruit}
          recruit={psychologicalRecruit}
          onClose={() => setPsychologicalRecruit(null)}
          onUpdated={() => {
            fetchMobileRecruits();
            onRefresh();
            showToast('تم حفظ سجل المتابعة النفسية بنجاح');
          }}
        />
      )}

      {/* 4. Official Printable Examination Report (A4) */}
      {printRecruit && (
        <OfficialReport
          recruit={printRecruit}
          onClose={() => setPrintRecruit(null)}
        />
      )}

      {/* 5. Export Suite Modal (تصدير إكسيل وبطاقات التعارف) */}
      {showExportModal && (
        <ExportModal
          isOpen={showExportModal}
          recruits={recruits}
          selectedRecruitIds={selectedIds.length > 0 ? selectedIds : (selectedRecruit ? [selectedRecruit.id] : [])}
          activeBatch={activeBatch}
          onClose={() => setShowExportModal(false)}
          onUpdateRecruit={() => {
            fetchMobileRecruits();
            onRefresh();
          }}
        />
      )}

      {/* 6. Company Colors Modal (تخصيص ألوان السرايا) */}
      {showCompanyColorsModal && (
        <CompanyColorsModal
          isOpen={showCompanyColorsModal}
          onClose={() => setShowCompanyColorsModal(false)}
          onColorsUpdated={(colors) => {
            setCompanyColors(colors);
            showToast('تم تحديث ألوان السرايا بنجاح');
          }}
        />
      )}

      {/* 7. Activity Log Modal (سجل المتابعات الطبية والوقائع) */}
      {activityRecruit && (
        <ActivityLogModal
          isOpen={!!activityRecruit}
          recruit={activityRecruit}
          recruitId={activityRecruit.id === 'all' ? null : activityRecruit.id}
          onClose={() => setActivityRecruit(null)}
          onRefreshRecruits={() => {
            fetchMobileRecruits();
            onRefresh();
          }}
          companyColors={companyColors}
        />
      )}

      {/* 8. Recruit History Modal (سجل الحركات والتعديلات) */}
      {historyRecruit && (
        <RecruitHistoryModal
          recruit={historyRecruit}
          onClose={() => setHistoryRecruit(null)}
          companyColors={companyColors}
        />
      )}

      {/* 9. Mobile Camera QR Code Scanner */}
      {showMobileQrScanner && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <CameraQrScanner
              title="مسح كود المجند (QR Code)"
              instruction="وجّه كارت دولاب المجند أو استمارة الفحص نحو الكاميرا"
              onClose={() => setShowMobileQrScanner(false)}
              onScan={(scannedText) => {
                setShowMobileQrScanner(false);
                let query = scannedText;
                if (query.startsWith('SEC-EYE:REC:')) {
                  query = query.replace('SEC-EYE:REC:', '');
                }
                setSearchTerm(query.trim());
                setPage(1);
                setActiveTab('directory');
                if (showToast) showToast('تم مسح كود المجند وتحديد السجل بنجاح');
              }}
            />
          </div>
        </div>
      )}

      {/* ── BOTTOM NAVIGATION BAR (شريط التنقل السفلي اللمسي) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 shadow-2xl max-w-lg mx-auto">
        <div className="grid grid-cols-6 items-center text-center">
          
          {/* Tab 1: Home */}
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center py-1 transition-all ${
              activeTab === 'home' ? 'text-blue-400 font-extrabold scale-105' : 'text-slate-400'
            }`}
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">الرئيسية</span>
          </button>

          {/* Tab 2: New Recruit */}
          <button
            onClick={() => {
              setIsMediaCapturing(false);
              setActiveTab('new');
            }}
            className={`flex flex-col items-center justify-center py-1 transition-all ${
              activeTab === 'new' ? 'text-emerald-400 font-extrabold scale-105' : 'text-slate-400'
            }`}
          >
            <UserPlus className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">تسجيل</span>
          </button>

          {/* Tab 3: Directory */}
          <button
            onClick={() => setActiveTab('directory')}
            className={`flex flex-col items-center justify-center py-1 transition-all ${
              activeTab === 'directory' ? 'text-cyan-400 font-extrabold scale-105' : 'text-slate-400'
            }`}
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">السجل</span>
          </button>

          {/* Tab 4: Analytics */}
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex flex-col items-center justify-center py-1 transition-all ${
              activeTab === 'analytics' ? 'text-indigo-400 font-extrabold scale-105' : 'text-slate-400'
            }`}
          >
            <BarChart3 className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">التحليلات</span>
          </button>

          {/* Tab 5: AI Assistant */}
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex flex-col items-center justify-center py-1 transition-all ${
              activeTab === 'ai' ? 'text-purple-400 font-extrabold scale-105' : 'text-slate-400'
            }`}
          >
            <div className="relative">
              <LiquidOrb size={22} state={activeTab === 'ai' ? 'thinking' : 'idle'} />
              {activeTab === 'ai' && (
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 absolute -top-0.5 -right-0.5 animate-ping"></span>
              )}
            </div>
            <span className="text-[10px] mt-0.5">مساعد AI</span>
          </button>

          {/* Tab 6: Tools */}
          <button
            onClick={() => setActiveTab('tools')}
            className={`flex flex-col items-center justify-center py-1 transition-all ${
              activeTab === 'tools' ? 'text-amber-400 font-extrabold scale-105' : 'text-slate-400'
            }`}
          >
            <Settings className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">الأدوات</span>
          </button>

        </div>
      </nav>

    </div>
  );
}
