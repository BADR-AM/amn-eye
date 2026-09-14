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
  RotateCcw, 
  Edit3, 
  Trash2, 
  LogOut, 
  Wifi, 
  Monitor, 
  KeyRound, 
  Calendar, 
  Clock, 
  Share2,
  Sparkles,
  Send,
  Loader2
} from 'lucide-react';
import centralSecurityLogo from '../assets/central_security_logo.png';
import LiquidOrb from './LiquidOrb';
import MediaCapture from './MediaCapture';
import { authHeaders } from '../utils/auth';

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
  onOpenChangePassword,
  showToast
}) {
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'new' | 'directory' | 'ai' | 'tools'
  const [recruits, setRecruits] = useState([]);
  const [loadingRecruits, setLoadingRecruits] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRecruit, setSelectedRecruit] = useState(null);
  const [isEditingRecruit, setIsEditingRecruit] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  // Media capture workflow state in mobile
  const [isMediaCapturing, setIsMediaCapturing] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);

  // New recruit mobile form state
  const initialNewForm = {
    name: '',
    national_id: '',
    birth_date: '',
    address: '',
    current_job: '',
    other_jobs: '',
    qualification: 'متوسط',
    religion: 'مسلم',
    wife: 'أعزب',
    travel_abroad: 'لا',
    literacy: 'يجيد القراءة والكتابة',
    medical_status: 'لائق',
    inspection: 'سليم',
    family_social_status: 'مستقرة',
    family_security_status: 'سليم أمنياً',
    father_name: '',
    father_job: '',
    mother_name: '',
    mother_job: '',
    siblings_check: 'سليم',
    police_number: '',
    company: 'السرية الأولى',
    notes: ''
  };
  const [newForm, setNewForm] = useState(initialNewForm);

  // AI Chat state for mobile
  const [aiMessages, setAiMessages] = useState([
    { 
      role: 'model', 
      content: 'أهلاً بك يا فندم في **المساعد الأمني الذكي** على الهاتف المحمول.\n\nيمكنك سؤالي عن أي إحصائية أو استعلام فوري عن المجندين مثل:\n* **حالات الاشتباه الأمني والجنائي**\n* **الحالات غير المتزنة نفسياً**\n* **بيان أصحاب المهن والحرف**\n* **المسافرين خارج مصر**',
      suggestions: ['تيكتات الاشتباه', 'الحالات غير المتزنة', 'حصر الحرف والمهن', 'المسافرين للخارج']
    }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const aiScrollRef = useRef(null);

  // Fetch recruits for mobile list
  const fetchMobileRecruits = async () => {
    setLoadingRecruits(true);
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        batch_id: activeBatch?.id ? activeBatch.id.toString() : '',
        category: selectedCategory !== 'all' ? selectedCategory : '',
        limit: '50'
      });
      const res = await fetch(`/api/recruits?${params.toString()}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setRecruits(data.recruits || []);
      }
    } catch (err) {
      console.error('Error fetching mobile recruits:', err);
    } finally {
      setLoadingRecruits(false);
    }
  };

  useEffect(() => {
    fetchMobileRecruits();
  }, [searchTerm, selectedCategory, activeBatch]);

  useEffect(() => {
    if (activeTab === 'ai') {
      aiScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages, isAiLoading, activeTab]);

  // AI Send Handler
  const handleAiSend = async (overrideText = null) => {
    const text = overrideText || aiInput;
    if (!text.trim() || isAiLoading) return;
    if (!overrideText) setAiInput('');
    setIsAiLoading(true);

    const newMsgs = [...aiMessages, { role: 'user', content: text.trim() }];
    const nextIdx = newMsgs.length;
    setAiMessages([...newMsgs, { role: 'model', content: '', suggestions: [] }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ message: text.trim(), history: newMsgs.slice(0, -1) })
      });

      if (!response.body) throw new Error('لا يوجد تدفق للردود');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let contentAcc = '';
      let suggestionsList = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const raw = line.slice(6).trim();
            if (raw === '[DONE]') continue;
            try {
              const parsed = JSON.parse(raw);
              if (parsed.type === 'FINAL_RESPONSE') {
                contentAcc += parsed.content;
              } else if (parsed.type === 'SUGGESTION') {
                suggestionsList.push(parsed.content);
              }
              setAiMessages(prev => {
                const updated = [...prev];
                updated[nextIdx] = {
                  role: 'model',
                  content: contentAcc,
                  suggestions: suggestionsList
                };
                return updated;
              });
            } catch (e) {
              // ignore
            }
          }
        }
      }
    } catch (err) {
      setAiMessages(prev => {
        const updated = [...prev];
        updated[nextIdx] = {
          role: 'model',
          content: 'عذراً، حدث خطأ أثناء الاتصال بالمساعد: ' + err.message,
          suggestions: ['إعادة المحاولة']
        };
        return updated;
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  // Start media capture step for new recruit
  const handleProceedToMedia = (e) => {
    e.preventDefault();
    if (!newForm.name.trim()) {
      showToast?.('يرجى إدخال اسم المجند الرباعي', 'error');
      return;
    }
    const finalForm = {
      ...newForm,
      batch_id: activeBatch?.id || 1,
      attendance_date: new Date().toISOString().split('T')[0]
    };
    setPendingFormData(finalForm);
    setIsMediaCapturing(true);
  };

  // Save changes to recruit
  const handleSaveEdit = async () => {
    if (!selectedRecruit) return;
    try {
      const res = await fetch(`/api/recruits/${selectedRecruit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(editFormData)
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedRecruit(updated);
        setIsEditingRecruit(false);
        fetchMobileRecruits();
        showToast?.('تم حفظ التعديلات بنجاح', 'success');
      } else {
        showToast?.('فشل حفظ التعديلات', 'error');
      }
    } catch (err) {
      showToast?.('خطأ: ' + err.message, 'error');
    }
  };

  // Delete recruit
  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف ملف هذا المجند نهائياً؟')) return;
    try {
      const res = await fetch(`/api/recruits/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (res.ok) {
        setSelectedRecruit(null);
        fetchMobileRecruits();
        showToast?.('تم حذف الملف بنجاح', 'success');
      }
    } catch (err) {
      showToast?.('فشل الحذف: ' + err.message, 'error');
    }
  };

  // If in media capture mode, render full mobile-adapted media screen
  if (isMediaCapturing && pendingFormData) {
    return (
      <div className="min-h-screen bg-darkslate-950 text-white flex flex-col">
        <div className="px-4 py-3 bg-darkslate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">التقاط صورة وفيديو المجند</h2>
              <p className="text-[11px] text-slate-400">{pendingFormData.name}</p>
            </div>
          </div>
          <button
            onClick={() => setIsMediaCapturing(false)}
            className="p-2 rounded-xl bg-slate-800 text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 p-2">
          <MediaCapture
            formData={pendingFormData}
            onSaveSuccess={(saved) => {
              setIsMediaCapturing(false);
              setPendingFormData(null);
              setNewForm(initialNewForm);
              setActiveTab('directory');
              fetchMobileRecruits();
              showToast?.('تم تسجيل وحفظ بيانات وصورة وفيديو المجند بنجاح!', 'success');
            }}
            onBack={() => setIsMediaCapturing(false)}
            onCancel={() => {
              setIsMediaCapturing(false);
              setPendingFormData(null);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-darkslate-950 text-slate-100 flex flex-col font-sans pb-20 select-none">
      
      {/* ------------------------------------------------------------- */}
      {/* TOP MOBILE APP BAR */}
      {/* ------------------------------------------------------------- */}
      <header className="sticky top-0 z-30 bg-darkslate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2.5">
          <img 
            src={centralSecurityLogo} 
            alt="شعار الأمن المركزي" 
            className="w-9 h-9 object-contain drop-shadow-md"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black text-white tracking-wide">عين الأمن</h1>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                موبايل
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <span className="text-emerald-400 font-bold">{activeBatch?.name || 'دفعة عامة'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick AI Trigger */}
          <button
            onClick={() => setActiveTab('ai')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-950/40 border border-purple-500/40 text-purple-300 text-xs font-bold active:scale-95 transition-transform"
            title="المساعد الذكي"
          >
            <LiquidOrb size={20} state={isAiLoading ? 'thinking' : 'idle'} />
            <span className="hidden xs:inline">AI</span>
          </button>

          {/* Switch to Desktop view */}
          <button
            onClick={onSwitchToDesktop}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all"
            title="التحويل إلى وضع شاشة الكمبيوتر (Desktop View)"
          >
            <Monitor className="w-4 h-4 text-blue-400" />
            <span className="text-[11px] hidden sm:inline">الكمبيوتر</span>
          </button>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* TAB CONTENT */}
      {/* ------------------------------------------------------------- */}
      <main className="flex-1 p-3.5 max-w-lg mx-auto w-full">

        {/* ========================================================= */}
        {/* TAB 1: HOME DASHBOARD */}
        {/* ========================================================= */}
        {activeTab === 'home' && (
          <div className="space-y-4">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-gradient-to-br from-slate-900 to-darkslate-850 border border-slate-800 rounded-2xl p-3 shadow-md">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-slate-400">إجمالي القوة</span>
                  <Users className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {stats?.totalRecruits ?? recruits.length}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">مجند مسجل بالدفعة</div>
              </div>

              <div className="bg-gradient-to-br from-rose-950/40 to-slate-900 border border-rose-500/30 rounded-2xl p-3 shadow-md">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-rose-300">تيكتات الاشتباه</span>
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-2xl font-black text-rose-300 font-mono">
                  {stats?.suspiciousCount ?? recruits.filter(r => r.inspection && r.inspection !== 'سليم').length}
                </div>
                <div className="text-[10px] text-rose-400/80 mt-0.5">حالات تتطلب تحريات</div>
              </div>

              <div className="bg-gradient-to-br from-purple-950/40 to-slate-900 border border-purple-500/30 rounded-2xl p-3 shadow-md">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-purple-300">غير متزن نفسياً</span>
                  <Brain className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-black text-purple-300 font-mono">
                  {recruits.filter(r => r.medical_status === 'غير لائق طبياً' || (r.notes && r.notes.includes('نفسي'))).length}
                </div>
                <div className="text-[10px] text-purple-400/80 mt-0.5">متابعة نفسية وعصبية</div>
              </div>

              <div className="bg-gradient-to-br from-amber-950/40 to-slate-900 border border-amber-500/30 rounded-2xl p-3 shadow-md">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-amber-300">أصحاب الحرف</span>
                  <Briefcase className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-amber-300 font-mono">
                  {recruits.filter(r => r.current_job && !['طالب', 'بدون عمل', 'لا يعمل', 'عامل'].includes(r.current_job)).length}
                </div>
                <div className="text-[10px] text-amber-400/80 mt-0.5">مهن وورش ومعدات</div>
              </div>
            </div>

            {/* Quick Action Button */}
            <button
              onClick={() => setActiveTab('new')}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 active:scale-[0.98] transition-transform"
            >
              <UserPlus className="w-5 h-5" />
              <span>تسجيل مجند جديد بالكاميرا (التقاط فوري)</span>
            </button>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث بالاسم أو الرقم القومي..."
                className="w-full bg-darkslate-900 border border-slate-800 rounded-2xl pr-10 pl-4 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 shadow-inner"
              />
            </div>

            {/* Recent Recruits List */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <h2 className="text-xs font-extrabold text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>آخر المجندين المسجلين</span>
                </h2>
                <button
                  onClick={() => setActiveTab('directory')}
                  className="text-[11px] font-bold text-emerald-400 hover:underline"
                >
                  عرض الكل ({recruits.length})
                </button>
              </div>

              {loadingRecruits ? (
                <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                  <span>جاري تحميل البيانات...</span>
                </div>
              ) : recruits.length === 0 ? (
                <div className="bg-darkslate-900/80 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-xs">
                  لا يوجد مجندين مسجلين مطابقين للبحث
                </div>
              ) : (
                <div className="space-y-2">
                  {recruits.slice(0, 10).map((r) => (
                    <div
                      key={r.id}
                      onClick={() => {
                        setSelectedRecruit(r);
                        setEditFormData(r);
                        setIsEditingRecruit(false);
                      }}
                      className="bg-darkslate-900 border border-slate-800/90 hover:border-emerald-500/50 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-md active:scale-[0.99] transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar / Photo */}
                        <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                          {r.photo_path ? (
                            <img src={r.photo_path} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Users className="w-5 h-5 text-slate-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-white truncate">{r.name}</h3>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">{r.national_id || 'بدون رقم قومي'}</div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                              {r.qualification || 'متوسط'}
                            </span>
                            {r.inspection && r.inspection !== 'سليم' && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-950 text-rose-300 border border-rose-500/40">
                                {r.inspection}
                              </span>
                            )}
                            {r.video_path && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-950 text-blue-300 border border-blue-500/40 flex items-center gap-0.5">
                                <Video className="w-2.5 h-2.5" /> فيديو
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-slate-500 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: NEW RECRUIT REGISTRATION (MOBILE FRIENDLY) */}
        {/* ========================================================= */}
        {activeTab === 'new' && (
          <form onSubmit={handleProceedToMedia} className="space-y-4">
            <div className="bg-darkslate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3.5">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h2 className="text-xs font-bold text-white">البيانات الشخصية للمجند</h2>
                  <p className="text-[10px] text-slate-400">أدخل البيانات الأساسية ثم انتقل للكاميرا</p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  الاسم الرباعي <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newForm.name}
                  onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                  placeholder="مثال: أحمد محمد علي حسن"
                  className="w-full bg-darkslate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">الرقم القومي (14 رقم)</label>
                  <input
                    type="text"
                    maxLength={14}
                    value={newForm.national_id}
                    onChange={(e) => setNewForm({ ...newForm, national_id: e.target.value })}
                    placeholder="298..."
                    className="w-full bg-darkslate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">رقم الشرطة</label>
                  <input
                    type="text"
                    value={newForm.police_number}
                    onChange={(e) => setNewForm({ ...newForm, police_number: e.target.value })}
                    placeholder="مثال: 104"
                    className="w-full bg-darkslate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">الديانة</label>
                  <div className="grid grid-cols-2 gap-1 bg-darkslate-950 p-1 rounded-xl border border-slate-800">
                    {['مسلم', 'مسيحي'].map(rel => (
                      <button
                        type="button"
                        key={rel}
                        onClick={() => setNewForm({ ...newForm, religion: rel })}
                        className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                          newForm.religion === rel ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {rel}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">الحالة الاجتماعية</label>
                  <div className="grid grid-cols-2 gap-1 bg-darkslate-950 p-1 rounded-xl border border-slate-800">
                    {['أعزب', 'متزوج'].map(status => (
                      <button
                        type="button"
                        key={status}
                        onClick={() => setNewForm({ ...newForm, wife: status })}
                        className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                          newForm.wife === status ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">المؤهل الدراسي</label>
                <div className="grid grid-cols-4 gap-1 bg-darkslate-950 p-1 rounded-xl border border-slate-800">
                  {['عليا', 'فوق متوسط', 'متوسط', 'عادة'].map(q => (
                    <button
                      type="button"
                      key={q}
                      onClick={() => setNewForm({ ...newForm, qualification: q })}
                      className={`py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                        newForm.qualification === q ? 'bg-emerald-600 text-white shadow' : 'text-slate-400'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">المهنة أو الحرفة قبل التجنيد</label>
                <input
                  type="text"
                  value={newForm.current_job}
                  onChange={(e) => setNewForm({ ...newForm, current_job: e.target.value })}
                  placeholder="مثال: نجار، كهربائي، حداد، سائق..."
                  className="w-full bg-darkslate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">محل الإقامة والعنوان بالتفصيل</label>
                <input
                  type="text"
                  value={newForm.address}
                  onChange={(e) => setNewForm({ ...newForm, address: e.target.value })}
                  placeholder="المحافظة، المركز، القرية/الشارع"
                  className="w-full bg-darkslate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Security & Medical Info Card */}
            <div className="bg-darkslate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3.5">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h2 className="text-xs font-bold text-white">الفحص الطبي والاشتباه الأمني</h2>
                  <p className="text-[10px] text-slate-400">تحديد التيكتات والتقرير الطبي</p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">الموقف من الاشتباه الأمني</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {['سليم', 'اشتباه جنائي', 'اشتباه سياسي'].map(insp => (
                    <button
                      type="button"
                      key={insp}
                      onClick={() => setNewForm({ ...newForm, inspection: insp })}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                        newForm.inspection === insp 
                          ? insp === 'سليم' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-rose-600 text-white border-rose-500'
                          : 'bg-darkslate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {insp}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">الكشف الطبي</label>
                  <div className="grid grid-cols-2 gap-1 bg-darkslate-950 p-1 rounded-xl border border-slate-800">
                    {['لائق', 'غير لائق'].map(med => (
                      <button
                        type="button"
                        key={med}
                        onClick={() => setNewForm({ ...newForm, medical_status: med === 'لائق' ? 'لائق' : 'غير لائق طبياً' })}
                        className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                          newForm.medical_status.includes(med) ? 'bg-emerald-600 text-white shadow' : 'text-slate-400'
                        }`}
                      >
                        {med}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">سبق السفر للخارج</label>
                  <div className="grid grid-cols-2 gap-1 bg-darkslate-950 p-1 rounded-xl border border-slate-800">
                    {['لا', 'نعم'].map(tr => (
                      <button
                        type="button"
                        key={tr}
                        onClick={() => setNewForm({ ...newForm, travel_abroad: tr })}
                        className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                          newForm.travel_abroad === tr ? 'bg-blue-600 text-white shadow' : 'text-slate-400'
                        }`}
                      >
                        {tr}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">السرية / التوزيع</label>
                <select
                  value={newForm.company}
                  onChange={(e) => setNewForm({ ...newForm, company: e.target.value })}
                  className="w-full bg-darkslate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {['السرية الأولى', 'السرية الثانية', 'السرية الثالثة', 'السرية الرابعة', 'سرية القيادة', 'التشغيل والصيانة'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">ملاحظات التحريات السرية</label>
                <textarea
                  rows={2}
                  value={newForm.notes}
                  onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })}
                  placeholder="أي ملاحظات إضافية خاصة بالمجند..."
                  className="w-full bg-darkslate-950 border border-slate-700/80 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/60 active:scale-[0.98] transition-all"
            >
              <Camera className="w-5 h-5" />
              <span>متابعة للالتقاط (صورة + فيديو 30ث)</span>
            </button>
          </form>
        )}

        {/* ========================================================= */}
        {/* TAB 3: RECRUITS DIRECTORY */}
        {/* ========================================================= */}
        {activeTab === 'directory' && (
          <div className="space-y-3">
            {/* Search & Category Filter Pills */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="بحث في السجل..."
                  className="w-full bg-darkslate-900 border border-slate-800 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Filter Pills Horizontal Scroll */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-semibold">
                {[
                  { id: 'all', label: 'الكل' },
                  { id: 'suspicious', label: 'المشتبه بهم' },
                  { id: 'psychological', label: 'غير متزن' },
                  { id: 'trades', label: 'الحرفيين' },
                  { id: 'travel', label: 'مسافرين' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-full shrink-0 transition-all ${
                      selectedCategory === cat.id 
                        ? 'bg-emerald-600 text-white font-bold shadow' 
                        : 'bg-darkslate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            {loadingRecruits ? (
              <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                <span>جاري تحميل السجل...</span>
              </div>
            ) : recruits.length === 0 ? (
              <div className="p-8 text-center bg-darkslate-900 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                لم يتم العثور على أي مجندين
              </div>
            ) : (
              <div className="space-y-2.5">
                {recruits.map(r => (
                  <div
                    key={r.id}
                    onClick={() => {
                      setSelectedRecruit(r);
                      setEditFormData(r);
                      setIsEditingRecruit(false);
                    }}
                    className="bg-darkslate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                        {r.photo_path ? (
                          <img src={r.photo_path} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-5 h-5 text-slate-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-white truncate">{r.name}</h3>
                          {r.police_number && (
                            <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950 px-1.5 py-0.2 rounded border border-cyan-500/30">
                              #{r.police_number}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {r.current_job || 'بدون عمل'} • {r.address ? r.address.split(',')[0] : 'العنوان غير مسجل'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            {r.qualification || 'متوسط'}
                          </span>
                          {r.inspection && r.inspection !== 'سليم' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-950 text-rose-300 border border-rose-500/40">
                              {r.inspection}
                            </span>
                          )}
                          {r.video_path && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-950 text-blue-300 border border-blue-500/40 flex items-center gap-0.5">
                              <Video className="w-2.5 h-2.5" /> فيديو
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-slate-500 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: AI AGENT (MOBILE FULL SCREEN) */}
        {/* ========================================================= */}
        {activeTab === 'ai' && (
          <div className="flex flex-col h-[calc(100vh-140px)]">
            {/* AI Top Header Capsule */}
            <div className="p-3 bg-darkslate-900 border border-slate-800 rounded-2xl mb-3 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2.5">
                <LiquidOrb size={36} state={isAiLoading ? 'thinking' : 'idle'} />
                <div>
                  <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                    وكيل التحريات الذكي (AI)
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                      isAiLoading ? 'bg-purple-950 text-purple-300 border-purple-500/40 animate-pulse' : 'bg-emerald-950 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {isAiLoading ? 'جاري التفكير...' : 'جاهز'}
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400">تحليل وفحص قاعدة بيانات المجندين لحظياً</p>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 px-1 text-xs">
              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className="text-[10px] font-bold text-slate-400 mb-1 px-1">
                    {msg.role === 'user' ? 'أنت' : 'وكيل الذكاء الاصطناعي'}
                  </div>
                  <div className={`max-w-[92%] rounded-2xl p-3 leading-relaxed shadow ${
                    msg.role === 'user' ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-darkslate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                  }`}>
                    {msg.content ? (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    ) : (
                      <div className="py-1">
                        <LiquidOrb size={26} state="thinking" showPill={true} pillText="جاري استخراج البيانات..." />
                      </div>
                    )}
                  </div>

                  {msg.suggestions && msg.suggestions.length > 0 && !isAiLoading && (
                    <div className="flex flex-wrap gap-1 mt-2 max-w-[92%]">
                      {msg.suggestions.map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => handleAiSend(sug)}
                          className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-900 hover:bg-emerald-600/30 text-emerald-300 border border-slate-800"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div ref={aiScrollRef} />
            </div>

            {/* Input Box */}
            <div className="pt-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAiSend();
                }}
                className="flex items-center gap-2 bg-darkslate-900 border border-slate-800 rounded-2xl p-1.5 shadow-lg"
              >
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  disabled={isAiLoading}
                  placeholder="اسأل عن أي مجند أو إحصائية أمنية..."
                  className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!aiInput.trim() || isAiLoading}
                  className="w-9 h-9 rounded-xl bg-emerald-600 disabled:opacity-40 text-white flex items-center justify-center shrink-0 shadow active:scale-95 transition-all"
                >
                  {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 -scale-x-100" />}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: SETTINGS & TOOLS */}
        {/* ========================================================= */}
        {activeTab === 'tools' && (
          <div className="space-y-3.5">
            <div className="bg-darkslate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-300 font-black text-base border border-slate-700">
                {currentUser?.username?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-white">{currentUser?.full_name || currentUser?.username || 'مدير المنظومة'}</h3>
                <p className="text-[11px] text-slate-400">رتبة / دور: {currentUser?.role === 'admin' ? 'مدير نظام كامل الصلاحيات' : 'مشغل تسجيل'}</p>
              </div>
            </div>

            <div className="bg-darkslate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md divide-y divide-slate-800">
              <button
                onClick={onOpenBatches}
                className="w-full px-4 py-3.5 flex items-center justify-between text-right text-xs font-bold text-slate-200 hover:bg-slate-850 active:bg-slate-800 transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span>إدارة الدفوع التجنيدية ({activeBatch?.name || 'اختر دفعة'})</span>
                </span>
                <ChevronLeft className="w-4 h-4 text-slate-500" />
              </button>

              <button
                onClick={onOpenNetwork}
                className="w-full px-4 py-3.5 flex items-center justify-between text-right text-xs font-bold text-slate-200 hover:bg-slate-850 active:bg-slate-800 transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <Wifi className="w-4 h-4 text-emerald-400" />
                  <span>ربط الأجهزة ومشاركة رمز الـ QR</span>
                </span>
                <ChevronLeft className="w-4 h-4 text-slate-500" />
              </button>

              <button
                onClick={onOpenChangePassword}
                className="w-full px-4 py-3.5 flex items-center justify-between text-right text-xs font-bold text-slate-200 hover:bg-slate-850 active:bg-slate-800 transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>تغيير كلمة المرور الخاصة بك</span>
                </span>
                <ChevronLeft className="w-4 h-4 text-slate-500" />
              </button>

              <button
                onClick={onSwitchToDesktop}
                className="w-full px-4 py-3.5 flex items-center justify-between text-right text-xs font-bold text-slate-200 hover:bg-slate-850 active:bg-slate-800 transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <Monitor className="w-4 h-4 text-cyan-400" />
                  <span>التحويل لشاشة الكمبيوتر الأصلية (Desktop)</span>
                </span>
                <ChevronLeft className="w-4 h-4 text-slate-500" />
              </button>

              <button
                onClick={onLogout}
                className="w-full px-4 py-3.5 flex items-center justify-between text-right text-xs font-bold text-rose-400 hover:bg-rose-950/30 active:bg-rose-900/40 transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <LogOut className="w-4 h-4 text-rose-400" />
                  <span>تسجيل الخروج من الحساب</span>
                </span>
                <ChevronLeft className="w-4 h-4 text-rose-400/50" />
              </button>
            </div>
          </div>
        )}

      </main>

      {/* ------------------------------------------------------------- */}
      {/* MOBILE RECRUIT DOSSIER MODAL / BOTTOM SHEET */}
      {/* ------------------------------------------------------------- */}
      {selectedRecruit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end sm:justify-center">
          <div className="bg-darkslate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden mx-auto">
            
            {/* Sheet Header */}
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-darkslate-850">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xs font-bold text-white truncate">{selectedRecruit.name}</h2>
                  <div className="text-[10px] text-slate-400 font-mono">{selectedRecruit.national_id || 'بدون رقم قومي'}</div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsEditingRecruit(!isEditingRecruit)}
                  className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 ${
                    isEditingRecruit ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditingRecruit ? 'إلغاء' : 'تعديل'}</span>
                </button>
                <button
                  onClick={() => setSelectedRecruit(null)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sheet Body */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {/* Media Section: Photo & Video */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="aspect-[4/3] rounded-2xl bg-black overflow-hidden border border-slate-800 flex items-center justify-center">
                  {selectedRecruit.photo_path ? (
                    <img src={selectedRecruit.photo_path} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-slate-600 text-[11px]">لا توجد صورة</span>
                  )}
                </div>

                <div className="aspect-[4/3] rounded-2xl bg-black overflow-hidden border border-slate-800 flex items-center justify-center">
                  {selectedRecruit.video_path ? (
                    <video src={selectedRecruit.video_path} controls playsInline className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-slate-600 text-[11px]">لا يوجد فيديو</span>
                  )}
                </div>
              </div>

              {/* View / Edit Mode */}
              {isEditingRecruit ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">الاسم الرباعي</label>
                    <input
                      type="text"
                      value={editFormData.name || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full bg-darkslate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">المهنة</label>
                      <input
                        type="text"
                        value={editFormData.current_job || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, current_job: e.target.value })}
                        className="w-full bg-darkslate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">السرية</label>
                      <input
                        type="text"
                        value={editFormData.company || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, company: e.target.value })}
                        className="w-full bg-darkslate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">الموقف من الاشتباه</label>
                    <select
                      value={editFormData.inspection || 'سليم'}
                      onChange={(e) => setEditFormData({ ...editFormData, inspection: e.target.value })}
                      className="w-full bg-darkslate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="سليم">سليم</option>
                      <option value="اشتباه جنائي">اشتباه جنائي</option>
                      <option value="اشتباه سياسي">اشتباه سياسي</option>
                      <option value="غير متزن نفسياً">غير متزن نفسياً</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">ملاحظات التحريات</label>
                    <textarea
                      rows={3}
                      value={editFormData.notes || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                      className="w-full bg-darkslate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow"
                    >
                      حفظ التعديلات
                    </button>
                    <button
                      onClick={() => setIsEditingRecruit(false)}
                      className="px-4 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="bg-darkslate-950 border border-slate-800 rounded-2xl p-3 space-y-2">
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">المؤهل:</span>
                      <span className="text-white font-bold">{selectedRecruit.qualification || 'متوسط'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">الديانة والحالة:</span>
                      <span className="text-white font-bold">{selectedRecruit.religion} • {selectedRecruit.wife}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">المهنة والحرفة:</span>
                      <span className="text-white font-bold">{selectedRecruit.current_job || 'بدون'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">السرية والتوزيع:</span>
                      <span className="text-white font-bold">{selectedRecruit.company || 'غير محدد'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">الاشتباه الأمني:</span>
                      <span className={`font-bold ${selectedRecruit.inspection === 'سليم' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {selectedRecruit.inspection || 'سليم'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">العنوان:</span>
                      <span className="text-white font-bold text-left truncate max-w-[200px]">{selectedRecruit.address || 'غير محدد'}</span>
                    </div>
                    <div className="py-1">
                      <span className="text-slate-400 block mb-1">الملاحظات:</span>
                      <p className="text-slate-200 bg-slate-900 p-2 rounded-xl text-[11px] leading-relaxed">
                        {selectedRecruit.notes || 'لا توجد ملاحظات مسجلة'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => setIsEditingRecruit(true)}
                      className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700"
                    >
                      <Edit3 className="w-4 h-4 text-emerald-400" />
                      <span>تعديل البيانات</span>
                    </button>
                    <button
                      onClick={() => handleDelete(selectedRecruit.id)}
                      className="p-3 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-300"
                      title="حذف الملف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* BOTTOM NAVIGATION BAR (FIXED) */}
      {/* ------------------------------------------------------------- */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-darkslate-900/98 backdrop-blur-xl border-t border-slate-800/90 py-2 px-3 shadow-2xl no-print">
        <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
          {[
            { id: 'home', label: 'الرئيسية', icon: Home },
            { id: 'new', label: 'تسجيل', icon: UserPlus },
            { id: 'directory', label: 'السجل', icon: Users },
            { id: 'ai', label: 'المساعد AI', icon: Bot, isOrb: true },
            { id: 'tools', label: 'الأدوات', icon: Settings }
          ].map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all duration-200 ${
                  isActive ? 'text-emerald-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.isOrb ? (
                  <div className="relative mb-0.5">
                    <LiquidOrb size={22} state={isAiLoading ? 'thinking' : 'idle'} />
                    {isActive && (
                      <span className="absolute -bottom-1 inset-x-0 h-0.5 bg-emerald-400 rounded-full"></span>
                    )}
                  </div>
                ) : (
                  <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-emerald-400 stroke-[2.5]' : ''}`} />
                )}
                <span className="text-[10px] tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

    </div>
  );
}
