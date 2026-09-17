import React, { useState, useEffect } from 'react';
import {
  X, History, Clock, User, Shield, FileText, AlertTriangle,
  Stethoscope, CheckCircle2, Printer, RefreshCw, ChevronDown, ChevronUp,
  ArrowRight, Edit3, UserPlus, Trash2, Calendar
} from 'lucide-react';
import centralSecurityLogo from '../assets/central_security_logo.png';
import { getCompanyStyle } from '../utils/companyColors';
import { authHeaders } from '../utils/auth';

export default function RecruitHistoryModal({ recruit, onClose, companyColors = [] }) {
  if (!recruit) return null;

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState({});

  const companyStyle = getCompanyStyle(recruit?.company, companyColors);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/recruits/${recruit.id}/history`, {
        headers: authHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error('Error fetching recruit history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (recruit?.id) {
      fetchHistory();
    }
  }, [recruit?.id]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getActionDetails = (actionType) => {
    switch (actionType) {
      case 'CREATE_RECRUIT':
        return {
          title: 'تسجيل وقيد أولي للمجند بالمنظومة',
          icon: UserPlus,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
        };
      case 'UPDATE_RECRUIT':
        return {
          title: 'تعديل وتحديث بيانات المجند',
          icon: Edit3,
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/30'
        };
      case 'UPLOAD_DOCUMENT':
        return {
          title: 'إرفاق ومسح مستند ضوئي للمجند',
          icon: FileText,
          color: 'text-blue-400 bg-blue-500/10 border-blue-500/30'
        };
      case 'DELETE_DOCUMENT':
        return {
          title: 'حذف مستند ضوئي',
          icon: Trash2,
          color: 'text-rose-400 bg-rose-500/10 border-rose-500/30'
        };
      case 'CREATE_TICKET':
        return {
          title: 'فتح تيكت / بلاغ اشتباه أمني أو طبي',
          icon: AlertTriangle,
          color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
        };
      case 'RESOLVE_TICKET':
        return {
          title: 'رفع واستيفاء بلاغ الاشتباه رسمياً',
          icon: CheckCircle2,
          color: 'text-teal-400 bg-teal-500/10 border-teal-500/30'
        };
      case 'ADD_ACTIVITY':
      case 'UPDATE_ACTIVITY':
        return {
          title: 'متابعة ميدانية / تحرك لمستشفى الشرطة',
          icon: Stethoscope,
          color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30'
        };
      case 'UPDATE_PSYCHOLOGICAL':
        return {
          title: 'تحديث المتابعة النفسية والعصبية',
          icon: Shield,
          color: 'text-purple-400 bg-purple-500/10 border-purple-500/30'
        };
      default:
        return {
          title: 'إجراء مسجل بالنظام',
          icon: History,
          color: 'text-slate-400 bg-slate-500/10 border-slate-500/30'
        };
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return 'ـ';
    try {
      const d = new Date(ts);
      return d.toLocaleString('ar-EG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (e) {
      return ts;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-right print:border-none print:shadow-none print:max-h-none print:w-full print:bg-white print:text-black" dir="rtl">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between print:border-b-2 print:border-black">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center print:border-black">
              <History className="w-6 h-6 text-amber-400 print:text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white print:text-black">
                  سجل التعديلات والحركات الميدانية (History)
                </h2>
                <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold ${companyStyle.badgeClass}`}>
                  {recruit.company || 'غير محدد'}
                </span>
              </div>
              <p className="text-xs text-slate-400 print:text-slate-600 mt-0.5">
                المجند: <strong className="text-white print:text-black">{recruit.name}</strong> — الرقم العسكري: <span className="font-mono text-amber-300 print:text-black">{recruit.military_number || 'ـ'}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="p-2 bg-slate-700/60 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-600 transition-colors flex items-center gap-1 text-xs"
              title="طباعة السجل"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">طباعة</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-colors"
              title="إغلاق (Esc)"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Printable Official Header (Shown Only on Print) */}
        <div className="hidden print:flex items-center justify-between border-b-2 border-black pb-4 mb-4 p-4 text-black text-right" dir="rtl">
          <div>
            <div className="font-bold text-sm">وزارة الداخلية المصرية</div>
            <div className="font-bold text-sm">قطاع الأمن المركزي</div>
            <div className="text-xs">إدارة أمن التحريات وتدريب المجندين</div>
            <div className="text-xs mt-1">تقرير التاريخ وسجل العمليات الكامل</div>
          </div>
          <img src={centralSecurityLogo} alt="الشعار" className="w-16 h-16 object-contain" />
          <div className="text-left text-xs">
            <div>التاريخ: {new Date().toLocaleDateString('ar-EG')}</div>
            <div>اسم المجند: {recruit.name}</div>
            <div>الرقم العسكري: {recruit.military_number || 'ـ'}</div>
            <div>السرية: {recruit.company || 'ـ'}</div>
          </div>
        </div>

        {/* Timeline Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-sm">جاري تحميل سجل حركات المجند...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-2">
              <History className="w-12 h-12 text-slate-600" />
              <p className="text-base font-semibold">لا توجد حركات مسجلة للمجند حتى الآن</p>
              <p className="text-xs">سيتم تدوين أي تعديل أو إجراء لاحق على الملف هنا تلقائياً</p>
            </div>
          ) : (
            <div className="relative border-r-2 border-slate-700 print:border-slate-400 pr-6 mr-3 space-y-6">
              {history.map((item, idx) => {
                const actionInfo = getActionDetails(item.action_type);
                const IconComponent = actionInfo.icon;
                const hasDiff = item.diff_data && Object.keys(item.diff_data).length > 0;
                const isExpanded = expandedItems[item.id] ?? true;

                return (
                  <div key={item.id || idx} className="relative group">
                    {/* Timeline Node Icon */}
                    <div className={`absolute -right-[35px] top-1.5 w-8 h-8 rounded-full border flex items-center justify-center ${actionInfo.color} print:bg-white print:border-black print:text-black`}>
                      <IconComponent className="w-4 h-4" />
                    </div>

                    {/* Timeline Item Card */}
                    <div className="bg-slate-800/60 print:bg-slate-50 border border-slate-700/80 print:border-slate-300 rounded-xl p-4 shadow-md hover:border-slate-600 transition-all">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/50 print:border-slate-300 pb-2.5 mb-2.5">
                        <div>
                          <h4 className="text-sm font-bold text-white print:text-black flex items-center gap-2">
                            <span>{actionInfo.title}</span>
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-slate-400 print:text-slate-600 mt-1">
                            <span className="flex items-center gap-1 font-mono text-[11px]">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              {formatTimestamp(item.created_at)}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-amber-400 print:text-black" />
                              <strong className="text-slate-200 print:text-black">{item.user_fullname || item.username}</strong>
                              <span className="text-[10px] bg-slate-700 print:bg-slate-200 px-1.5 py-0.5 rounded text-slate-300 print:text-black">
                                {item.user_role === 'admin' ? 'مدير المنظومة' : item.user_role === 'officer' ? 'ضابط أمن' : 'تسجيل واستعلام'}
                              </span>
                            </span>
                          </div>
                        </div>

                        {hasDiff && (
                          <button
                            onClick={() => toggleExpand(item.id)}
                            className="text-xs text-amber-400 print:hidden hover:text-amber-300 flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20"
                          >
                            <span>{isExpanded ? 'إخفاء الفروقات' : 'عرض الفروقات'}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>

                      {/* Item Details Text */}
                      <p className="text-xs text-slate-300 print:text-slate-800 leading-relaxed font-medium">
                        {item.details}
                      </p>

                      {/* Field Differences Chips */}
                      {hasDiff && isExpanded && (
                        <div className="mt-3 pt-3 border-t border-slate-700/60 print:border-slate-300 space-y-2">
                          <span className="text-[11px] font-bold text-amber-400/90 print:text-black block">
                            تفاصيل الحقول المعدلة بدقة:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {Object.entries(item.diff_data).map(([fieldKey, diffItem]) => (
                              <div key={fieldKey} className="p-2.5 rounded-lg bg-slate-900/80 print:bg-white border border-slate-700/60 print:border-slate-300 text-xs">
                                <span className="font-bold text-slate-300 print:text-black block mb-1">
                                  {diffItem.label || fieldKey}
                                </span>
                                <div className="flex items-center gap-2 text-[11px]">
                                  <span className="text-red-400 print:text-red-700 line-through bg-red-950/40 print:bg-red-50 px-2 py-0.5 rounded border border-red-900/30">
                                    {diffItem.old || 'فارغ'}
                                  </span>
                                  <ArrowRight className="w-3 h-3 text-slate-500" />
                                  <span className="text-emerald-400 print:text-emerald-700 font-bold bg-emerald-950/40 print:bg-emerald-50 px-2 py-0.5 rounded border border-emerald-900/30">
                                    {diffItem.new || 'فارغ'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-800/80 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400 print:hidden">
          <span>إجمالي الحركات المسجلة: <strong className="text-white">{history.length}</strong> حركة</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-colors"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
}
