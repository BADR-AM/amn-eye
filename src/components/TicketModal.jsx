import React, { useState, useEffect } from 'react';
import { 
  X, 
  AlertTriangle, 
  ShieldAlert, 
  Stethoscope, 
  Brain, 
  CheckCircle2, 
  Clock, 
  PlusCircle, 
  Check, 
  FileText, 
  User, 
  Calendar,
  AlertOctagon,
  ArrowUpRight,
  Loader2,
  Trash2
} from 'lucide-react';
import { authHeaders } from '../utils/auth';

export default function TicketModal({ 
  isOpen, 
  onClose, 
  recruit, 
  onTicketChanged 
}) {
  if (!isOpen || !recruit) return null;

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'new'

  // New ticket form state
  const [ticketType, setTicketType] = useState('criminal_suspicion');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('high'); // 'low' | 'medium' | 'high' | 'critical'
  const [officerName, setOfficerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Resolving ticket state
  const [resolvingTicketId, setResolvingTicketId] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolvingLoading, setResolvingLoading] = useState(false);

  // Fetch tickets for this recruit
  const fetchTickets = async () => {
    if (!recruit?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/recruits/${recruit.id}/tickets`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
        if (data.tickets && data.tickets.length === 0) {
          setActiveTab('new');
        } else {
          setActiveTab('list');
        }
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && recruit?.id) {
      fetchTickets();
      setTitle('');
      setDescription('');
      setFormError('');
      setResolvingTicketId(null);
    }
  }, [isOpen, recruit?.id]);

  if (!isOpen || !recruit) return null;

  // Handle creating new ticket
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('يرجى كتابة عنوان التيكت أو ملخص البلاغ');
      return;
    }
    if (!description.trim()) {
      setFormError('يرجى تدوين تفاصيل الاشتباه أو الحالة');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const res = await fetch(`/api/recruits/${recruit.id}/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({
          ticket_type: ticketType,
          title: title.trim(),
          description: description.trim(),
          severity,
          officer_name: officerName.trim() || 'وحدة الأمن والتحريات'
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'فشل فتح التيكت');
      }

      await fetchTickets();
      setActiveTab('list');
      setTitle('');
      setDescription('');
      if (onTicketChanged) onTicketChanged();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle resolving (رفع) ticket
  const handleResolveTicket = async (ticketId) => {
    if (!resolutionNotes.trim()) {
      alert('يرجى كتابة سبب وملاحظات رفع التيكت');
      return;
    }

    setResolvingLoading(true);
    try {
      const res = await fetch(`/api/recruits/${recruit.id}/tickets/${ticketId}/resolve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({
          resolution_notes: resolutionNotes.trim(),
          resolved_by: officerName.trim() || 'وحدة الأمن والتحريات'
        })
      });

      if (!res.ok) throw new Error('فشل رفع التيكت');

      setResolvingTicketId(null);
      setResolutionNotes('');
      await fetchTickets();
      if (onTicketChanged) onTicketChanged();
    } catch (err) {
      alert(err.message);
    } finally {
      setResolvingLoading(false);
    }
  };

  // Ticket type configuration
  const getTypeInfo = (type) => {
    switch (type) {
      case 'criminal_suspicion':
        return {
          label: 'اشتباه جنائي',
          color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
          icon: AlertOctagon,
          badgeColor: 'bg-rose-600'
        };
      case 'political_suspicion':
        return {
          label: 'اشتباه سياسي',
          color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
          icon: ShieldAlert,
          badgeColor: 'bg-purple-600'
        };
      case 'medical_condition':
        return {
          label: 'حالة مرضية / مستشفى',
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
          icon: Stethoscope,
          badgeColor: 'bg-amber-600'
        };
      case 'psychological_condition':
        return {
          label: 'حالة نفسية وعصبية (غير متزن)',
          color: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/30',
          icon: Brain,
          badgeColor: 'bg-fuchsia-600'
        };
      default:
        return {
          label: 'تنبيه أمني عام',
          color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
          icon: AlertTriangle,
          badgeColor: 'bg-blue-600'
        };
    }
  };

  const getSeverityInfo = (sev) => {
    switch (sev) {
      case 'critical':
        return { label: 'حرج / أولوية قصوى', color: 'text-rose-400 bg-rose-500/20 border-rose-500/40' };
      case 'high':
        return { label: 'عاجل وهام', color: 'text-orange-400 bg-orange-500/20 border-orange-500/40' };
      case 'medium':
        return { label: 'متوسط', color: 'text-amber-400 bg-amber-500/20 border-amber-500/40' };
      default:
        return { label: 'عادي / للمتابعة', color: 'text-blue-400 bg-blue-500/20 border-blue-500/40' };
    }
  };

  const openTickets = tickets.filter(t => t.status === 'open');
  const resolvedTickets = tickets.filter(t => t.status !== 'open');

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <div className="bg-[#12161f] border border-slate-750 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-[#181f2c] px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  سجل التيكتات والبلاغات الأمنية والمرضية
                </h2>
                {openTickets.length > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                    {openTickets.length} تيكت نشط
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                المجند: <span className="text-white font-bold">{recruit.name}</span> • السرية: <span className="text-amber-400">{recruit.company || 'غير محددة'}</span> • رقم الشرطة: <span className="font-mono text-white">{recruit.police_number || '---'}</span>
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-[#141a24]">
          <button
            onClick={() => setActiveTab('list')}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'list'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>قائمة التيكتات المسجلة ({tickets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('new')}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'new'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>فتح تيكت جديد الآن</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          
          {/* TAB 1: NEW TICKET FORM */}
          {activeTab === 'new' && (
            <form onSubmit={handleCreateTicket} className="space-y-4">
              
              {/* Ticket Type Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">نوع التيكت / البلاغ:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  
                  <button
                    type="button"
                    onClick={() => setTicketType('criminal_suspicion')}
                    className={`p-3 rounded-xl border text-right transition-all flex items-start gap-2.5 ${
                      ticketType === 'criminal_suspicion'
                        ? 'bg-rose-500/15 border-rose-500 text-white shadow-sm'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:bg-slate-850'
                    }`}
                  >
                    <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-rose-300">اشتباه جنائي</div>
                      <div className="text-[11px] text-slate-400">سوابق، مشاجرات، قضايا جنائية، أقارب من ذوي السوابق</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTicketType('political_suspicion')}
                    className={`p-3 rounded-xl border text-right transition-all flex items-start gap-2.5 ${
                      ticketType === 'political_suspicion'
                        ? 'bg-purple-500/15 border-purple-500 text-white shadow-sm'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:bg-slate-850'
                    }`}
                  >
                    <ShieldAlert className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-purple-300">اشتباه سياسي</div>
                      <div className="text-[11px] text-slate-400">انتماءات أو صلات سياسية محظورة، تحريات أمن وطني</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTicketType('psychological_condition')}
                    className={`p-3 rounded-xl border text-right transition-all flex items-start gap-2.5 ${
                      ticketType === 'psychological_condition'
                        ? 'bg-fuchsia-500/15 border-fuchsia-500 text-white shadow-sm'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:bg-slate-850'
                    }`}
                  >
                    <Brain className="w-5 h-5 text-fuchsia-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-fuchsia-300">حالة نفسية وعصبية (غير متزن)</div>
                      <div className="text-[11px] text-slate-400">سلوك عدواني، صرع، هلع، ميول انتحارية، متابعة دورية</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTicketType('medical_condition')}
                    className={`p-3 rounded-xl border text-right transition-all flex items-start gap-2.5 ${
                      ticketType === 'medical_condition'
                        ? 'bg-amber-500/15 border-amber-500 text-white shadow-sm'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:bg-slate-850'
                    }`}
                  >
                    <Stethoscope className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-amber-300">حالة مرضية / إحالة مستشفى</div>
                      <div className="text-[11px] text-slate-400">أمراض مزمنة، كسور، تحويل لمستشفى الشرطة، عزل</div>
                    </div>
                  </button>

                </div>
              </div>

              {/* Title & Severity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    موضوع التيكت / ملخص الاشتباه:
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: اشتباه في سابقة قضائية قديمة للوالد..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    مستوى الخطورة:
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
                  >
                    <option value="low">عادي / للمتابعة</option>
                    <option value="medium">متوسط الأهمية</option>
                    <option value="high">عاجل وهام</option>
                    <option value="critical">حرج / أولوية قصوى</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  تفاصيل الاشتباه والوقائع والتحريات:
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="سجل وقائع التحريات، الأسباب، الشهود، أو ملخص التقرير الطبي بالتفصيل..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:border-rose-500 focus:outline-none leading-relaxed"
                  required
                />
              </div>

              {/* Officer Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  القائم بالقيد والتحري (الضابط / المحقق):
                </label>
                <input
                  type="text"
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  placeholder="اسم أو رتبة محرر البلاغ (افتراضي: وحدة الأمن والتحريات)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
                />
              </div>

              {formError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-bold">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-extrabold shadow-lg shadow-rose-950/40 flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                  <span>تثبيت وفتح التيكت الآن</span>
                </button>
              </div>

            </form>
          )}

          {/* TAB 2: TICKETS LIST & RESOLUTION */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              
              {tickets.length === 0 ? (
                <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-emerald-500/60" />
                  <p className="text-sm font-bold text-slate-300">لا توجد أي تيكتات أو بلاغات مسجلة على هذا المجند</p>
                  <p className="text-xs text-slate-500 mt-1">الملف خالي من الاشتباهات الجنائية والسياسية والحالات الخاصة</p>
                  <button
                    onClick={() => setActiveTab('new')}
                    className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs font-bold inline-flex items-center gap-1.5 border border-slate-700 transition-colors"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>إضافة تيكت أو بلاغ الآن</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map((t) => {
                    const typeInfo = getTypeInfo(t.ticket_type);
                    const sevInfo = getSeverityInfo(t.severity);
                    const TypeIcon = typeInfo.icon;
                    const isOpen = t.status === 'open';

                    return (
                      <div 
                        key={t.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isOpen 
                            ? 'bg-slate-900 border-slate-700 shadow-md' 
                            : 'bg-slate-950/70 border-slate-850 opacity-80'
                        }`}
                      >
                        {/* Ticket Card Header */}
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 ${typeInfo.color}`}>
                              <TypeIcon className="w-3.5 h-3.5" />
                              <span>{typeInfo.label}</span>
                            </span>

                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${sevInfo.color}`}>
                              {sevInfo.label}
                            </span>

                            {isOpen ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                                ● نشط ومفتوح
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                تم رفعه رسمياً
                              </span>
                            )}
                          </div>

                          <span className="text-[11px] text-slate-500 font-mono">
                            {t.created_at ? t.created_at.split(' ')[0] : ''}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <h4 className="text-sm font-bold text-white mb-1.5">
                          {t.title}
                        </h4>
                        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 mb-3 whitespace-pre-wrap font-sans">
                          {t.description}
                        </p>

                        {/* Footer details & Action */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                          <div className="flex items-center gap-3">
                            <span>القائم بالقيد: <strong className="text-slate-300">{t.officer_name || 'وحدة الأمن والتحريات'}</strong></span>
                            {t.resolved_at && (
                              <span className="text-emerald-400">تاريخ الرفع: {t.resolved_at.split(' ')[0]}</span>
                            )}
                          </div>

                          {/* Action button: رفع التيكت */}
                          {isOpen && resolvingTicketId !== t.id && (
                            <button
                              onClick={() => {
                                setResolvingTicketId(t.id);
                                setResolutionNotes('');
                              }}
                              className="px-3 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>رفع التيكت (تسوية البلاغ)</span>
                            </button>
                          )}
                        </div>

                        {/* Inline Resolution Box */}
                        {resolvingTicketId === t.id && (
                          <div className="mt-3 p-3.5 bg-emerald-950/30 border border-emerald-500/40 rounded-xl space-y-2.5 animate-in fade-in duration-150">
                            <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span>إجراء رفع التيكت وإنهاء الاشتباه:</span>
                            </div>

                            <textarea
                              rows={2}
                              value={resolutionNotes}
                              onChange={(e) => setResolutionNotes(e.target.value)}
                              placeholder="أدخل سبب رفع التيكت (مثال: تم استيفاء الفحص الأمني وتبين براءة الموقف تماماً بموجب إشارة رسمية...)"
                              className="w-full bg-slate-900 border border-emerald-500/40 rounded-lg p-2.5 text-xs text-white focus:outline-none"
                              autoFocus
                            />

                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setResolvingTicketId(null)}
                                className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                              >
                                تراجع
                              </button>
                              <button
                                type="button"
                                onClick={() => handleResolveTicket(t.id)}
                                disabled={resolvingLoading}
                                className="px-4 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow flex items-center gap-1"
                              >
                                {resolvingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                <span>تأكيد رفع التيكت</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Show resolution notes if already resolved */}
                        {!isOpen && t.resolution_notes && (
                          <div className="mt-2.5 p-2.5 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-300">
                            <span className="font-bold">ملاحظات وقرار الرفع:</span> {t.resolution_notes}
                            {t.resolved_by && <span className="text-slate-400 mr-2 font-mono">({t.resolved_by})</span>}
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
