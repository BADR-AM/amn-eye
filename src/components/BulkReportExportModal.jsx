import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Download, 
  FileText, 
  Archive, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Printer, 
  Layers, 
  Filter, 
  CheckSquare, 
  Square,
  FileCheck
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { OfficialReportSheet } from './OfficialReport';
import { createZipBlob } from '../utils/simpleZip';
import { getUser, authHeaders } from '../utils/auth';

const COMPANIES = [
  'السرية الأولى ( ١ )',
  'السرية الثانية ( ٢ )',
  'السرية الثالثة ( ٣ )',
  'السرية الرابعة ( ٤ )',
  'السرية الخامسة ( ٥ )',
  'السرية السادسة ( ٦ )',
  'سرية الأمن',
  'القوة الأساسية'
];

const OFFICIAL_SECTORS = [
  'رئاسة المنطقة',
  'قطاع أحمد عمارة',
  'قطاع عمر القاضي',
  'قطاع على خاطر',
  'قطاع جمال فايق',
  'مركز التدريب',
  'جهة خارجية',
  'عودة'
];

// Helper to convert base64 dataUrl to Uint8Array
function dataUrlToUint8Array(dataUrl) {
  const parts = dataUrl.split(',');
  const binaryString = atob(parts[1]);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export default function BulkReportExportModal({
  isOpen,
  onClose,
  recruits = [],
  selectedRecruitIds = [],
  currentUser: propCurrentUser
}) {
  const currentUser = propCurrentUser || getUser();

  // Export scope: 'selected' | 'all' | 'company' | 'sector'
  const hasSelected = selectedRecruitIds.length > 0;
  const [scope, setScope] = useState(hasSelected ? 'selected' : 'all');
  const [selectedCompany, setSelectedCompany] = useState(COMPANIES[0]);
  const [selectedSector, setSelectedSector] = useState(OFFICIAL_SECTORS[0]);
  const [bulkRecruits, setBulkRecruits] = useState([]);
  const [loadingBulk, setLoadingBulk] = useState(false);

  // Fetch full dataset from server based on chosen scope
  useEffect(() => {
    if (!isOpen) return;

    const fetchBulk = async () => {
      setLoadingBulk(true);
      try {
        const params = new URLSearchParams({ limit: 'all' });

        if (scope === 'selected' && selectedRecruitIds.length > 0) {
          params.append('ids', selectedRecruitIds.join(','));
        } else if (scope === 'company' && selectedCompany) {
          params.append('company', selectedCompany);
        } else if (scope === 'sector' && selectedSector) {
          params.append('distribution_sector', selectedSector);
        }

        const res = await fetch(`/api/recruits?${params.toString()}`, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          setBulkRecruits(data.recruits || []);
        }
      } catch (e) {
        console.error('Failed to fetch bulk recruits for report:', e);
      } finally {
        setLoadingBulk(false);
      }
    };

    fetchBulk();
  }, [isOpen, scope, selectedCompany, selectedSector, selectedRecruitIds.length]);

  // Export format: 'pdf' | 'png_zip'
  const [format, setFormat] = useState('pdf');
  const [photoFit, setPhotoFit] = useState('cover');

  // Execution state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0, recruitName: '' });
  const [exportComplete, setExportComplete] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [activeExportRecruit, setActiveExportRecruit] = useState(null);

  const reportSheetRef = useRef(null);
  const isCancelledRef = useRef(false);

  // Compute target recruits based on scope
  const targetRecruits = React.useMemo(() => {
    if (bulkRecruits.length > 0) return bulkRecruits;
    if (scope === 'selected') {
      const idSet = new Set(selectedRecruitIds);
      return recruits.filter(r => idSet.has(r.id));
    }
    if (scope === 'company') {
      return recruits.filter(r => r.company === selectedCompany);
    }
    if (scope === 'sector') {
      return recruits.filter(r => r.distribution_sector === selectedSector);
    }
    return recruits;
  }, [bulkRecruits, recruits, scope, selectedRecruitIds, selectedCompany, selectedSector]);

  // Reset states when modal reopens
  useEffect(() => {
    if (isOpen) {
      setScope(selectedRecruitIds.length > 0 ? 'selected' : 'all');
      setIsExporting(false);
      setExportProgress({ current: 0, total: 0, recruitName: '' });
      setExportComplete(false);
      setExportError(null);
      setActiveExportRecruit(null);
      isCancelledRef.current = false;
    }
  }, [isOpen, selectedRecruitIds.length]);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    if (targetRecruits.length === 0) {
      setExportError('لا يوجد مجندون للتصدير وفق النطاق المحدد.');
      return;
    }

    setIsExporting(true);
    setExportError(null);
    setExportComplete(false);
    isCancelledRef.current = false;

    const total = targetRecruits.length;
    let pdfDoc = null;
    const zipFiles = [];

    if (format === 'pdf') {
      pdfDoc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
    }

    const timestamp = new Date().toISOString().slice(0, 10);

    try {
      for (let i = 0; i < total; i++) {
        if (isCancelledRef.current) {
          throw new Error('تم إلغاء عملية التصدير بواسطة المستخدم.');
        }

        const recruit = targetRecruits[i];
        setExportProgress({
          current: i + 1,
          total,
          recruitName: recruit.name
        });

        // Mount the recruit in the offscreen container
        setActiveExportRecruit(recruit);

        // Wait for DOM layout and QR code generation
        await new Promise(resolve => setTimeout(resolve, 80));

        if (!reportSheetRef.current) {
          throw new Error('فشل الوصول إلى عنصر الاستمارة للرسم.');
        }

        // Render to high-resolution PNG
        const dataUrl = await toPng(reportSheetRef.current, {
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          cacheBust: true
        });

        if (format === 'pdf') {
          if (i > 0) {
            pdfDoc.addPage('a4', 'portrait');
          }
          pdfDoc.addImage(dataUrl, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
        } else {
          const rawBytes = dataUrlToUint8Array(dataUrl);
          const safeName = (recruit.name || `recruit_${recruit.id}`).replace(/[\/\\:*?"<>|]/g, '_').trim();
          const pNum = recruit.police_number || String(recruit.id);
          const fileName = `استمارة_فحص_${pNum}_${safeName}.png`;
          zipFiles.push({
            name: fileName,
            data: rawBytes
          });
        }
      }

      // Finalize and download
      if (format === 'pdf' && pdfDoc) {
        const fileName = `استمارات_فحص_المجندين_${timestamp}.pdf`;
        pdfDoc.save(fileName);
      } else if (format === 'png_zip') {
        const zipBlob = createZipBlob(zipFiles);
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `حزمة_استمارات_الفحص_PNG_${timestamp}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      setExportComplete(true);
    } catch (err) {
      if (!isCancelledRef.current) {
        console.error('Bulk export failed:', err);
        setExportError(err.message || 'حدث خطأ أثناء تصدير الاستمارات.');
      }
    } finally {
      setIsExporting(false);
      setActiveExportRecruit(null);
    }
  };

  const handleCancelExport = () => {
    isCancelledRef.current = true;
    setIsExporting(false);
    setExportError('تم إلغاء عملية التصدير.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
      <div className="bg-darkslate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>تصدير الاستمارات الرسمية دفعة واحدة</span>
                <span className="text-xs font-mono bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                  VER 02.5.1
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                تصدير استمارات الفحص المعتمدة A4 لعدة مجندين بصيغة PDF أو كصور PNG مجمعة
              </p>
            </div>
          </div>
          {!isExporting && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          
          {/* 1. Scope Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Filter className="w-4 h-4 text-emerald-400" />
              <span>نطاق التصدير (المجندين المستهدفين):</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              
              {/* Option: Selected Only */}
              <button
                type="button"
                disabled={isExporting || !hasSelected}
                onClick={() => setScope('selected')}
                className={`p-3.5 rounded-2xl border text-right transition-all flex items-start gap-3 ${
                  scope === 'selected'
                    ? 'border-indigo-500 bg-indigo-950/40 text-white shadow-lg shadow-indigo-950/40'
                    : hasSelected
                    ? 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                    : 'border-slate-800/40 bg-slate-900/20 text-slate-600 cursor-not-allowed'
                }`}
              >
                <div className="mt-0.5">
                  {scope === 'selected' ? <CheckSquare className="w-4 h-4 text-indigo-400" /> : <Square className="w-4 h-4 text-slate-600" />}
                </div>
                <div>
                  <div className="font-bold text-sm">المجندين المحددين بالجدول</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {hasSelected ? `${selectedRecruitIds.length} مجند محدد حالياً` : 'لم يتم تحديد أي مجند بعد'}
                  </div>
                </div>
              </button>

              {/* Option: All Visible */}
              <button
                type="button"
                disabled={isExporting}
                onClick={() => setScope('all')}
                className={`p-3.5 rounded-2xl border text-right transition-all flex items-start gap-3 ${
                  scope === 'all'
                    ? 'border-indigo-500 bg-indigo-950/40 text-white shadow-lg shadow-indigo-950/40'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="mt-0.5">
                  {scope === 'all' ? <CheckSquare className="w-4 h-4 text-indigo-400" /> : <Square className="w-4 h-4 text-slate-600" />}
                </div>
                <div>
                  <div className="font-bold text-sm">جميع مجندي المنظومة بالكامل</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {loadingBulk ? 'جاري جلب كافة السجلات...' : `إجمالي ${targetRecruits.length} مجند`}
                  </div>
                </div>
              </button>

              {/* Option: Filter by Company */}
              <button
                type="button"
                disabled={isExporting}
                onClick={() => setScope('company')}
                className={`p-3.5 rounded-2xl border text-right transition-all flex items-start gap-3 ${
                  scope === 'company'
                    ? 'border-indigo-500 bg-indigo-950/40 text-white shadow-lg shadow-indigo-950/40'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="mt-0.5">
                  {scope === 'company' ? <CheckSquare className="w-4 h-4 text-indigo-400" /> : <Square className="w-4 h-4 text-slate-600" />}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-sm">تصفية حسب السرية</div>
                  {scope === 'company' && (
                    <select
                      value={selectedCompany}
                      onChange={(e) => setSelectedCompany(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-2 w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-bold outline-none"
                    >
                      {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  )}
                </div>
              </button>

              {/* Option: Filter by Distribution Sector */}
              <button
                type="button"
                disabled={isExporting}
                onClick={() => setScope('sector')}
                className={`p-3.5 rounded-2xl border text-right transition-all flex items-start gap-3 ${
                  scope === 'sector'
                    ? 'border-indigo-500 bg-indigo-950/40 text-white shadow-lg shadow-indigo-950/40'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="mt-0.5">
                  {scope === 'sector' ? <CheckSquare className="w-4 h-4 text-indigo-400" /> : <Square className="w-4 h-4 text-slate-600" />}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-sm">تصفية حسب القطاع الموزع إليه</div>
                  {scope === 'sector' && (
                    <select
                      value={selectedSector}
                      onChange={(e) => setSelectedSector(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-2 w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-bold outline-none"
                    >
                      {OFFICIAL_SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                </div>
              </button>

            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">إجمالي المجندين الذين سيتم تصدير استماراتهم:</span>
              <span className="font-bold text-emerald-400 text-sm font-mono">
                {targetRecruits.length} مجند
              </span>
            </div>
          </div>

          {/* 2. Format Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>صيغة التصدير المطلوبة:</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              
              <button
                type="button"
                disabled={isExporting}
                onClick={() => setFormat('pdf')}
                className={`p-4 rounded-2xl border text-right transition-all flex items-start gap-3 ${
                  format === 'pdf'
                    ? 'border-emerald-500 bg-emerald-950/30 text-white shadow-lg shadow-emerald-950/30'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-white">مستند PDF مجمع (A4)</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    ملف PDF واحد يحتوي على صفحة رسمية A4 منفصلة لكل مجند مع رمز QR وبصمة التوثيق، جاهز للطباعة المباشرة.
                  </div>
                </div>
              </button>

              <button
                type="button"
                disabled={isExporting}
                onClick={() => setFormat('png_zip')}
                className={`p-4 rounded-2xl border text-right transition-all flex items-start gap-3 ${
                  format === 'png_zip'
                    ? 'border-blue-500 bg-blue-950/30 text-white shadow-lg shadow-blue-950/30'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 shrink-0">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-white">صور PNG مجمعة (.ZIP)</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    حزمة مضغوطة تحتوي على صورة فائقة الدقة لكل استمارة مسماة باسم ورقم المجند.
                  </div>
                </div>
              </button>

            </div>
          </div>

          {/* 3. Image Mode Option */}
          <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl text-xs">
            <span className="text-slate-300 font-bold">طريقة ملاءمة صورة المجند في الإطار:</span>
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                disabled={isExporting}
                onClick={() => setPhotoFit('cover')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  photoFit === 'cover' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                ملء الإطار (موصى به)
              </button>
              <button
                type="button"
                disabled={isExporting}
                onClick={() => setPhotoFit('contain')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  photoFit === 'contain' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                احتواء كامل
              </button>
            </div>
          </div>

          {/* Progress / Status */}
          {isExporting && (
            <div className="p-4 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-indigo-300 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>جاري معالجة الاستمارات: {exportProgress.recruitName}</span>
                </span>
                <span className="font-mono font-bold text-indigo-200">
                  {exportProgress.current} / {exportProgress.total} ({Math.round((exportProgress.current / exportProgress.total) * 100)}%)
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-500 h-full rounded-full transition-all duration-200"
                  style={{ width: `${(exportProgress.current / exportProgress.total) * 100}%` }}
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleCancelExport}
                  className="text-xs text-rose-400 hover:text-rose-300 font-bold transition-colors"
                >
                  إلغاء التصدير
                </button>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {exportComplete && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-300 text-xs">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold block text-sm">تم التصدير والتحميل بنجاح!</span>
                <span>تم تجهيز وتحميل {exportProgress.total} استمارة رسمية بنجاح على جهازك.</span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {exportError && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-300 text-xs">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{exportError}</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <button
            type="button"
            disabled={isExporting}
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
          >
            {exportComplete ? 'إغلاق' : 'إلغاء'}
          </button>

          <button
            type="button"
            disabled={isExporting || targetRecruits.length === 0}
            onClick={handleStartExport}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all active:scale-95 ${
              isExporting || targetRecruits.length === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                : format === 'pdf'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/60'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-950/60'
            }`}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري تصدير {exportProgress.current} من {exportProgress.total}...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>
                  بدء التصدير ({targetRecruits.length} مجند • {format === 'pdf' ? 'PDF' : 'PNG ZIP'})
                </span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Off-screen Sheet for Image Snapshot Generation */}
      <div 
        style={{ 
          position: 'fixed', 
          left: '-9999px', 
          top: 0, 
          width: '210mm',
          backgroundColor: '#ffffff',
          pointerEvents: 'none',
          zIndex: -1
        }}
        aria-hidden="true"
      >
        {activeExportRecruit && (
          <OfficialReportSheet
            ref={reportSheetRef}
            recruit={activeExportRecruit}
            currentUser={currentUser}
            photoFit={photoFit}
          />
        )}
      </div>

    </div>
  );
}
