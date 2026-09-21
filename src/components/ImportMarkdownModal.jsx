import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  Eye,
  RefreshCw,
  Trash2,
  FolderOpen,
  Info,
  Check
} from 'lucide-react';
import { authHeaders } from '../utils/auth';

export default function ImportMarkdownModal({
  isOpen,
  onClose,
  activeBatch,
  batches = [],
  onImportSuccess
}) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState(activeBatch?.id || '');
  const [duplicatePolicy, setDuplicatePolicy] = useState('skip'); // 'skip' | 'update'
  const [previewItems, setPreviewItems] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [resultSummary, setResultSummary] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (activeBatch?.id && !selectedBatchId) {
      setSelectedBatchId(activeBatch.id);
    }
  }, [activeBatch]);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setResultSummary(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Process files selected or dropped
  const handleFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMsg('');
    setIsLoading(true);
    setResultSummary(null);

    const validFiles = Array.from(fileList).filter(f => 
      f.name.endsWith('.md') || f.name.endsWith('.markdown') || f.name.endsWith('.txt')
    );

    if (validFiles.length === 0) {
      setErrorMsg('يرجى اختيار ملفات نصية بصيغة Markdown (.md أو .markdown)');
      setIsLoading(false);
      return;
    }

    try {
      // Read files content in parallel
      const filePayloads = await Promise.all(
        validFiles.map(file => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve({ name: file.name, content: e.target.result });
            reader.onerror = () => resolve({ name: file.name, content: '' });
            reader.readAsText(file, 'utf-8');
          });
        })
      );

      // Call preview API
      const res = await fetch('/api/recruits/preview-markdown', {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ files: filePayloads, batch_id: selectedBatchId })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'فشل فحص الملفات' }));
        throw new Error(errData.error || 'فشل فحص الملفات');
      }

      const data = await res.json();
      setPreviewItems(data.items || []);

      // Select all ready and duplicate items by default (exclude only invalid)
      const newSelected = new Set();
      (data.items || []).forEach((item, idx) => {
        if (item.status === 'ready' || item.status === 'duplicate') {
          newSelected.add(idx);
        }
      });
      setSelectedIndices(newSelected);
    } catch (err) {
      console.error('Error previewing files:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء فحص محتوى الملفات');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const toggleSelect = (idx) => {
    const next = new Set(selectedIndices);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedIndices(next);
  };

  const toggleSelectAll = () => {
    if (selectedIndices.size === previewItems.length) {
      setSelectedIndices(new Set());
    } else {
      const all = new Set();
      previewItems.forEach((item, idx) => {
        if (item.status !== 'invalid') all.add(idx);
      });
      setSelectedIndices(all);
    }
  };

  const removeItem = (idx) => {
    const next = previewItems.filter((_, i) => i !== idx);
    setPreviewItems(next);
    const nextSelected = new Set();
    selectedIndices.forEach(i => {
      if (i < idx) nextSelected.add(i);
      else if (i > idx) nextSelected.add(i - 1);
    });
    setSelectedIndices(nextSelected);
  };

  const handleImportSubmit = async () => {
    if (selectedIndices.size === 0) {
      setErrorMsg('يرجى اختيار مجند واحد على الأقل للاستيراد');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const recruitsToImport = [];
      selectedIndices.forEach(idx => {
        const item = previewItems[idx];
        if (item && item.data) {
          recruitsToImport.push(item);
        }
      });

      const res = await fetch('/api/recruits/import-markdown', {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          batch_id: selectedBatchId,
          recruits: recruitsToImport,
          on_duplicate: duplicatePolicy
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'فشل استيراد الاستمارات' }));
        throw new Error(errData.error || 'فشل استيراد الاستمارات');
      }

      const result = await res.json();
      setResultSummary(result);
      if (onImportSuccess) {
        onImportSuccess(result);
      }
    } catch (err) {
      console.error('Import submit error:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ الاستمارات في قاعدة البيانات');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAll = () => {
    setPreviewItems([]);
    setSelectedIndices(new Set());
    setResultSummary(null);
    setErrorMsg('');
    setExpandedIndex(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" dir="rtl">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                استيراد استمارات المجندين من ملفات Markdown (.md)
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  معالجة ذكية
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                استيراد استمارات المقابلات والتفريغ الصوتي المعزول مع فحص التكرار التلقائي
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          
          {errorMsg && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Summary View */}
          {resultSummary ? (
            <div className="bg-slate-950/50 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white">تمت عملية الاستيراد بنجاح!</h3>
              <p className="text-sm text-slate-300 max-w-md mx-auto">{resultSummary.message}</p>
              
              <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto pt-2">
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                  <div className="text-2xl font-black text-emerald-400">{resultSummary.imported_count || 0}</div>
                  <div className="text-xs text-slate-400">مجند جديد تم تسجيله</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                  <div className="text-2xl font-black text-amber-400">{resultSummary.updated_count || 0}</div>
                  <div className="text-xs text-slate-400">سجل تم تحديثه</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                  <div className="text-2xl font-black text-slate-400">{resultSummary.skipped_count || 0}</div>
                  <div className="text-xs text-slate-400">سجل تم تخطيه</div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  onClick={resetAll}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  استيراد ملفات أخرى
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-emerald-600/20"
                >
                  إغلاق وعرض المجندين
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Dropzone & Batch Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Target Batch Select */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    الدفعة التجنيدية المستهدفة
                  </label>
                  <select
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.active ? '(الدفعة النشطة)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Duplicate Policy */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    الإجراء في حال وجود رقم قومي مسجل مسبقاً
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDuplicatePolicy('skip')}
                      className={`px-3 py-2 rounded-xl border text-xs font-semibold text-center transition-all flex items-center justify-center gap-2 ${
                        duplicatePolicy === 'skip'
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Info className="w-3.5 h-3.5" />
                      تخطي المكرر (حماية السجل الحالي)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuplicatePolicy('update')}
                      className={`px-3 py-2 rounded-xl border text-xs font-semibold text-center transition-all flex items-center justify-center gap-2 ${
                        duplicatePolicy === 'update'
                          ? 'bg-blue-500/10 border-blue-500/40 text-blue-300 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      تحديث البيانات وإضافة الملاحظات
                    </button>
                  </div>
                </div>
              </div>

              {/* Drag & Drop Box */}
              {previewItems.length === 0 && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                    dragOver
                      ? 'border-emerald-500 bg-emerald-500/10 scale-[0.99]'
                      : 'border-slate-700/80 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/70'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".md,.markdown,.txt"
                    onChange={(e) => handleFiles(e.target.files)}
                    className="hidden"
                  />
                  <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-emerald-500/20">
                    <FolderOpen className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-bold text-white mb-1">
                    اسحب وأفلت ملفات الـ (.md) هنا، أو اضغط للاختيار
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mb-3">
                    يمكنك اختيار ملف استمارة مجند واحد أو عشرات الملفات معاً في نفس الوقت
                  </p>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 border border-slate-700 text-slate-300 rounded-lg text-xs font-mono">
                    صيغ مدعومة: .md / .markdown / .txt
                  </span>
                </div>
              )}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="py-10 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                  <p className="text-sm text-slate-300">جارٍ قراءة وفحص ملفات الاستمارات والتحقق من السجلات...</p>
                </div>
              )}

              {/* Preview Table of Parsed Dossiers */}
              {previewItems.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-white">
                        الملفات الجاهزة للمعاينة ({previewItems.length})
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        تم تحديد {selectedIndices.size} من {previewItems.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="text-xs text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20"
                      >
                        {selectedIndices.size === previewItems.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-800 border border-slate-700 flex items-center gap-1"
                      >
                        <Upload className="w-3 h-3" />
                        إضافة ملفات أخرى
                      </button>
                      <button
                        type="button"
                        onClick={resetAll}
                        className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded bg-rose-500/10 border border-rose-500/20 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        مسح القائمة
                      </button>
                    </div>
                  </div>

                  {/* List Container */}
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 divide-y divide-slate-800/60 max-h-72 overflow-y-auto">
                    {previewItems.map((item, idx) => {
                      const isSelected = selectedIndices.has(idx);
                      const isExpanded = expandedIndex === idx;
                      const isDuplicate = item.status === 'duplicate';
                      const isInvalid = item.status === 'invalid';

                      return (
                        <div key={idx} className="transition-colors hover:bg-slate-900/40">
                          <div className="p-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <input
                                type="checkbox"
                                disabled={isInvalid}
                                checked={isSelected}
                                onChange={() => toggleSelect(idx)}
                                className="w-4 h-4 rounded text-emerald-600 bg-slate-900 border-slate-700 focus:ring-emerald-500 disabled:opacity-30 cursor-pointer"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-slate-100 truncate">
                                    {item.data?.name || item.filename}
                                  </span>
                                  {isInvalid ? (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                                      <XCircle className="w-3 h-3" /> غير صالح
                                    </span>
                                  ) : isDuplicate ? (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3" /> مسجل مسبقاً
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> جاهز
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5 font-mono">
                                  <span>بطاقة: {item.data?.national_id || 'غير محدد'}</span>
                                  {item.data?.company && <span>سرية: {item.data.company}</span>}
                                  {item.data?.qualification && <span>مؤهل: {item.data.qualification}</span>}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                                className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                                title="عرض التفاصيل"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeItem(idx)}
                                className="p-1.5 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                                title="حذف من القائمة"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Expanded Details Drawer */}
                          {isExpanded && (
                            <div className="p-3 bg-slate-900/90 border-t border-slate-800/80 text-xs text-slate-300 space-y-2">
                              {item.error && (
                                <div className="text-amber-400 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                                  {item.error}
                                </div>
                              )}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                                <div><span className="text-slate-500">رقم الشرطة:</span> {item.data?.police_number || 'ـ'}</div>
                                <div><span className="text-slate-500">الديانة:</span> {item.data?.religion || 'ـ'}</div>
                                <div><span className="text-slate-500">الميلاد:</span> {item.data?.birth_date || 'ـ'}</div>
                                <div><span className="text-slate-500">العنوان:</span> {item.data?.address || 'ـ'}</div>
                                <div><span className="text-slate-500">المهنة:</span> {item.data?.current_job || 'ـ'}</div>
                                <div><span className="text-slate-500">الأب:</span> {item.data?.father_name || 'ـ'}</div>
                                <div><span className="text-slate-500">الأم:</span> {item.data?.mother_name || 'ـ'}</div>
                                <div><span className="text-slate-500">حالة نفسية:</span> {item.data?.is_psychological_case ? 'نعم' : 'لا'}</div>
                              </div>
                              {item.data?.notes && (
                                <div className="mt-2 pt-2 border-t border-slate-800 text-[11px]">
                                  <div className="font-semibold text-slate-400 mb-1">الملاحظات وتفريغ المقابلة:</div>
                                  <pre className="bg-slate-950 p-2 rounded text-slate-300 whitespace-pre-wrap font-sans max-h-24 overflow-y-auto">
                                    {item.data.notes}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer Actions */}
        {!resultSummary && (
          <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/40">
            <div className="text-xs text-slate-400">
              {previewItems.length > 0 && (
                <span>
                  سيتم معالجة <strong>{selectedIndices.size}</strong> مجند في{' '}
                  <span className="text-emerald-400 font-semibold">
                    {batches.find(b => String(b.id) === String(selectedBatchId))?.name || 'الدفعة'}
                  </span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleImportSubmit}
                disabled={isSubmitting || selectedIndices.size === 0}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جارٍ الاستيراد والحفظ...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>تأكيد واستيراد ({selectedIndices.size}) مجند</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
