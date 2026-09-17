import React, { useState, useEffect } from 'react';
import {
  X, Search, Filter, RefreshCw, Download, Calendar, User, Shield,
  FileText, Clock, AlertTriangle, Eye, ArrowRight, CheckCircle2,
  ChevronLeft, ChevronRight, Activity, Database, KeyRound, UserCheck, Trash2
} from 'lucide-react';
import centralSecurityLogo from '../assets/central_security_logo.png';
import { authHeaders } from '../utils/auth';

export default function SystemAuditLogModal({ onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [exporting, setExporting] = useState(false);

  // Detailed Diff Viewer Modal
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async (targetPage = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: targetPage,
        limit: 25,
      });

      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (actionFilter) params.append('action_type', actionFilter);
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);

      const res = await fetch(`/api/audit-logs?${params.toString()}`, {
        headers: authHeaders()
      });

      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotalLogs(data.total || 0);
        setPage(data.page || 1);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [actionFilter, fromDate, toDate]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedLog) setSelectedLog(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, selectedLog]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (actionFilter) params.append('action_type', actionFilter);
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);

      const res = await fetch(`/api/audit-logs/export?${params.toString()}`, {
        headers: authHeaders()
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `سجل_الرقابة_والعمليات_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        alert('فشل تصدير ملف الإكسل');
      }
    } catch (err) {
      console.error('Error exporting audit logs:', err);
      alert('حدث خطأ أثناء تحميل ملف التصدير');
    } finally {
      setExporting(false);
    }
  };

  const getActionBadge = (type) => {
    switch (type) {
      case 'CREATE_RECRUIT':
        return { label: 'تسجيل مجند', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'UPDATE_RECRUIT':
        return { label: 'تعديل بيانات', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 'DELETE_RECRUIT':
      case 'BULK_DELETE_RECRUITS':
        return { label: 'حذف مجند', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
      case 'LOGIN_SUCCESS':
        return { label: 'تسجيل دخول', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' };
      case 'LOGIN_FAILED':
        return { label: 'دخول فاشل', color: 'bg-red-500/15 text-red-300 border-red-500/30' };
      case 'UPLOAD_DOCUMENT':
        return { label: 'رفع مستند', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
      case 'DELETE_DOCUMENT':
        return { label: 'حذف مستند', color: 'bg-rose-500/10 text-rose-300 border-rose-500/20' };
      case 'CREATE_TICKET':
        return { label: 'فتح تيكت', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' };
      case 'RESOLVE_TICKET':
        return { label: 'رفع تيكت', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' };
      case 'ADD_ACTIVITY':
      case 'UPDATE_ACTIVITY':
        return { label: 'متابعة طبية', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' };
      case 'UPDATE_PSYCHOLOGICAL':
        return { label: 'متابعة نفسية', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
      case 'CREATE_USER':
      case 'UPDATE_USER':
      case 'DELETE_USER':
        return { label: 'إدارة الحسابات', color: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20' };
      case 'CREATE_BATCH':
      case 'ACTIVATE_BATCH':
        return { label: 'دفعة تجنيد', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' };
      case 'BACKUP_CREATE':
        return { label: 'نسخ احتياطي', color: 'bg-slate-500/10 text-slate-300 border-slate-500/20' };
      default:
        return { label: type, color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'مدير المنظومة';
      case 'officer': return 'ضابط أمن / عمليات';
      case 'operator': return 'تسجيل واستعلام (كشك)';
      default: return role || 'نظام';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-6xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-right" dir="rtl">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Shield className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-wide">سجل العمليات والرقابة الأمنية الشاملة</h2>
                <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                  {totalLogs} حركة مسجلة
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تتبع وتوثيق دقيق لكافة عمليات الإدخال والتعديل والحذف وهوية المستخدمين والأجهزة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-colors"
            title="إغلاق (Esc)"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filter and Control Bar */}
        <div className="p-4 bg-slate-800/40 border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-3 text-sm">
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px] relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث باسم المجند، المستخدم، أو تفاصيل الحركة..."
              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2 pr-10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs sm:text-sm"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          </form>

          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="">جميع أنواع الحركات</option>
            <option value="CREATE_RECRUIT">تسجيل مجند جديد</option>
            <option value="UPDATE_RECRUIT">تعديل بيانات مجند</option>
            <option value="DELETE_RECRUIT">حذف مجند</option>
            <option value="BULK_DELETE_RECRUITS">حذف جماعي</option>
            <option value="UPLOAD_DOCUMENT">رفع مستندات ضوئية</option>
            <option value="DELETE_DOCUMENT">حذف مستندات</option>
            <option value="CREATE_TICKET">فتح بلاغات وتيكتات</option>
            <option value="RESOLVE_TICKET">رفع وتصفية بلاغات</option>
            <option value="ADD_ACTIVITY">حركات ومستشفيات</option>
            <option value="UPDATE_PSYCHOLOGICAL">متابعات نفسية</option>
            <option value="LOGIN_SUCCESS">تسجيل دخول ناجح</option>
            <option value="LOGIN_FAILED">محاولات دخول فاشلة</option>
            <option value="CREATE_USER">إدارة المستخدمين</option>
            <option value="BACKUP_CREATE">نسخ احتياطي</option>
          </select>

          {/* Date Range */}
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <span>من:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-slate-900/90 border border-slate-700 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-amber-500 text-xs"
            />
            <span>إلى:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-slate-900/90 border border-slate-700 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-amber-500 text-xs"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLogs(page)}
              className="p-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-600 transition-colors"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleExportExcel}
              disabled={exporting}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{exporting ? 'جاري التصدير...' : 'تصدير إكسل (Excel)'}</span>
            </button>
          </div>
        </div>

        {/* Audit Table / Log List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-sm">جاري استرجاع سجلات الرقابة الأمنية...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-2">
              <Shield className="w-12 h-12 text-slate-600" />
              <p className="text-base font-semibold">لا توجد حركات مطابقة لمعايير البحث الحالية</p>
              <p className="text-xs">جرّب تغيير كلمات البحث أو مسح فلاتر التصفية</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700/80">
              <table className="w-full text-right border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-800 text-slate-400 border-b border-slate-700 font-semibold text-xs">
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3 w-40">التوقيت والتاريخ</th>
                    <th className="p-3 w-32">نوع الإجراء</th>
                    <th className="p-3 w-44">المستخدم والمسؤول</th>
                    <th className="p-3 w-44">الجهة / المعني</th>
                    <th className="p-3">تفاصيل الحركة والتغييرات</th>
                    <th className="p-3 w-24 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {logs.map((log) => {
                    const badge = getActionBadge(log.action_type);
                    const hasDiff = log.diff_data && Object.keys(log.diff_data).length > 0;

                    return (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition-colors group">
                        <td className="p-3 text-center text-slate-500 font-mono text-xs">{log.id}</td>
                        <td className="p-3 text-slate-300 font-mono text-xs whitespace-nowrap">
                          {formatTimestamp(log.created_at)}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.color}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-white text-xs">{log.user_fullname || log.username}</span>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <span className="text-amber-400/90">{getRoleLabel(log.user_role)}</span>
                              {log.ip_address && (
                                <span className="font-mono text-slate-500 text-[10px]" title="عنوان الجهاز">
                                  {log.ip_address}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-white text-xs font-medium">
                            {log.entity_name || log.entity_id || 'ـ'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300 text-xs leading-relaxed">
                          {log.details}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          {hasDiff ? (
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg border border-amber-500/30 text-xs font-semibold flex items-center gap-1 mx-auto transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>الفروقات</span>
                            </button>
                          ) : (
                            <span className="text-slate-600 text-xs">ـ</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-800/80 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
          <div>
            صفحة <span className="font-bold text-white">{page}</span> من <span className="font-bold text-white">{totalPages}</span> (إجمالي {totalLogs} حركة)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLogs(page - 1)}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg border border-slate-600 transition-colors disabled:opacity-40 flex items-center gap-1"
            >
              <ChevronRight className="w-4 h-4" />
              <span>السابق</span>
            </button>
            <button
              onClick={() => fetchLogs(page + 1)}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg border border-slate-600 transition-colors disabled:opacity-40 flex items-center gap-1"
            >
              <span>التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Field-Level Diff Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4">
          <div className="bg-slate-900 border border-amber-500/40 w-full max-w-2xl rounded-2xl shadow-2xl p-6 text-right" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">تفاصيل التعديلات والفروقات الميدانية</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 bg-slate-800/60 rounded-xl p-3 border border-slate-700 text-xs space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>المعني: <strong className="text-white">{selectedLog.entity_name}</strong></span>
                <span>المسؤول: <strong className="text-amber-400">{selectedLog.user_fullname} ({getRoleLabel(selectedLog.user_role)})</strong></span>
              </div>
              <div className="flex justify-between text-slate-400 font-mono">
                <span>التاريخ: {formatTimestamp(selectedLog.created_at)}</span>
                <span>IP: {selectedLog.ip_address || 'ـ'}</span>
              </div>
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {Object.entries(selectedLog.diff_data || {}).map(([key, item]) => (
                <div key={key} className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/60 flex flex-col gap-1.5 text-xs">
                  <div className="font-bold text-amber-400">{item.label || key}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-red-950/30 border border-red-900/40">
                      <span className="text-[10px] text-red-400 block mb-0.5">القيمة السابقة:</span>
                      <span className="text-red-200 line-through">{item.old || 'فارغ'}</span>
                    </div>
                    <div className="p-2 rounded bg-emerald-950/30 border border-emerald-900/40">
                      <span className="text-[10px] text-emerald-400 block mb-0.5">القيمة الجديدة:</span>
                      <span className="text-emerald-200 font-semibold">{item.new || 'فارغ'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
