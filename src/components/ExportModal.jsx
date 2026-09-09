import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  FileSpreadsheet, 
  IdCard, 
  Layers, 
  Check, 
  ChevronRight, 
  ChevronLeft,
  Loader2,
  Sparkles,
  Edit3
} from 'lucide-react';
import LockerCard from './LockerCard';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

export default function ExportModal({ 
  isOpen, 
  onClose, 
  recruits = [], 
  selectedRecruitIds = [], 
  activeBatch,
  onUpdateRecruit
}) {
  const [exportType, setExportType] = useState('cards'); // 'cards' | 'excel' | 'csv'
  const [scope, setScope] = useState('selected'); // 'selected' | 'all'
  const [pdfLayout, setPdfLayout] = useState('a4_grid'); // 'a4_grid' (4 per page) | 'single' (1 per page)
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  // Editing police_number / company directly in preview if needed
  const [editingCard, setEditingCard] = useState(false);
  const [tempPoliceNum, setTempPoliceNum] = useState('');
  const [tempCompany, setTempCompany] = useState('');

  const cardRef = useRef(null);
  const batchContainerRef = useRef(null);

  // Filter target recruits based on selected scope
  const targetRecruits = React.useMemo(() => {
    if (scope === 'selected' && selectedRecruitIds.length > 0) {
      return recruits.filter(r => selectedRecruitIds.includes(r.id));
    }
    return recruits;
  }, [scope, selectedRecruitIds, recruits]);

  // Adjust preview index if bounds change
  useEffect(() => {
    if (previewIndex >= targetRecruits.length) {
      setPreviewIndex(0);
    }
  }, [targetRecruits.length, previewIndex]);

  // Sync edit fields with current preview
  const currentRecruit = targetRecruits[previewIndex] || null;
  useEffect(() => {
    if (currentRecruit) {
      setTempPoliceNum(currentRecruit.police_number || '');
      setTempCompany(currentRecruit.company || 'السرية الثالثة ( ٣ )');
      setEditingCard(false);
    }
  }, [currentRecruit?.id]);

  // Handle escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && !isProcessing) onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose, isProcessing]);

  if (!isOpen) return null;

  // Save quick card edits back to recruit
  const handleSaveCardEdits = () => {
    if (!currentRecruit) return;
    currentRecruit.police_number = tempPoliceNum;
    currentRecruit.company = tempCompany;
    if (onUpdateRecruit) {
      onUpdateRecruit(currentRecruit.id, {
        police_number: tempPoliceNum,
        company: tempCompany
      });
    }
    setEditingCard(false);
  };

  // 1. Export Current Card as PNG
  const handleExportSinglePNG = async () => {
    if (!cardRef.current || !currentRecruit) return;
    setIsProcessing(true);
    setProgressMsg('جاري إنشاء صورة الكارت عالية الدقة...');

    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `كارت_دولاب_${currentRecruit.name.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export PNG:', err);
      alert('حدث خطأ أثناء تصدير الصورة.');
    } finally {
      setIsProcessing(false);
      setProgressMsg('');
    }
  };

  // 2. Export All / Selected Cards as PDF (A4 Sheet ready for printing)
  const handleExportCardsPDF = async () => {
    if (targetRecruits.length === 0) {
      alert('لا يوجد مجندين محددين للتصدير');
      return;
    }

    setIsProcessing(true);
    setProgressMsg('جاري تجهيز بطاقات المجندين للطباعة...');

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // A4 dimensions: 210mm x 297mm
      // Card aspect ratio: 640 x 380 (~1.68). Card size in mm: 92mm x 55mm (fits 4 per page: 2 rows x 2 cols)
      const cardWidth = 95;
      const cardHeight = 56;
      const marginX = 8;
      const marginY = 12;
      const gapX = 4;
      const gapY = 12;

      for (let i = 0; i < targetRecruits.length; i++) {
        const rec = targetRecruits[i];
        setProgressMsg(`جاري إنشاء كارت ${i + 1} من ${targetRecruits.length}: ${rec.name}...`);

        // Render card offscreen or sequentially in preview
        setPreviewIndex(i);
        // Short delay to allow React DOM update
        await new Promise(r => setTimeout(r, 120));

        if (!cardRef.current) continue;

        const canvas = await html2canvas(cardRef.current, {
          scale: 2.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        if (pdfLayout === 'single') {
          // 1 card centered per page (landscape A6 / horizontal)
          if (i > 0) pdf.addPage('a6', 'landscape');
          else {
            // first page
            pdf.deletePage(1);
            pdf.addPage('a6', 'landscape');
          }
          pdf.addImage(imgData, 'JPEG', 5, 5, 138, 82);
        } else {
          // A4 Grid: 4 cards per page (2 columns x 2 rows, or up to 6)
          const indexOnPage = i % 4;
          if (i > 0 && indexOnPage === 0) {
            pdf.addPage('a4', 'portrait');
          }

          const col = indexOnPage % 2; // 0 or 1
          const row = Math.floor(indexOnPage / 2); // 0 or 1

          const x = marginX + col * (cardWidth + gapX);
          const y = marginY + row * (cardHeight + gapY);

          pdf.addImage(imgData, 'JPEG', x, y, cardWidth, cardHeight);

          // Cutting guides (light gray dashed border)
          pdf.setDrawColor(200, 200, 200);
          pdf.setLineDashPattern([2, 2], 0);
          pdf.rect(x - 1, y - 1, cardWidth + 2, cardHeight + 2);
        }
      }

      pdf.save(`كروت_الدولاب_${activeBatch ? activeBatch.name : 'دفعة'}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('حدث خطأ أثناء تصدير ملف PDF');
    } finally {
      setIsProcessing(false);
      setProgressMsg('');
    }
  };

  // 3. Export Excel Spreadsheet (.xlsx)
  const handleExportExcel = () => {
    if (targetRecruits.length === 0) {
      alert('لا توجد بيانات للتصدير');
      return;
    }

    setIsProcessing(true);
    setProgressMsg('جاري تجميع جدول البيانات الإحصائي...');

    try {
      const rows = targetRecruits.map((r, idx) => ({
        'م': idx + 1,
        'الاسم الرباعي': r.name || '',
        'رقم الشرطة': r.police_number || '',
        'السرية': r.company || '',
        'الرقم القومي': r.national_id || '',
        'المؤهل الدراسي': r.qualification || '',
        'تاريخ التجنيد': r.attendance_date || '',
        'تاريخ الميلاد': r.birth_date || '',
        'الحالة الاجتماعية': r.wife || '',
        'المهنة الحالية': r.current_job || '',
        'مهن أخرى': r.other_jobs || '',
        'العنوان': r.address || '',
        'اللياقة الطبية': r.medical_status || '',
        'المناظرة الأمنية': r.inspection || '',
        'اسم الوالد': r.father_name || '',
        'وظيفة الوالد': r.father_job || '',
        'اسم الوالدة': r.mother_name || '',
        'وظيفة الوالدة': r.mother_job || '',
        'الموقف الأمني للعائلة': r.family_security_status || '',
        'ملاحظات': r.notes || ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      // Set right-to-left view for Excel
      worksheet['!views'] = [{ rightToLeft: true }];

      // Column widths
      worksheet['!cols'] = [
        { wch: 5 },  // م
        { wch: 28 }, // الاسم
        { wch: 14 }, // رقم الشرطة
        { wch: 16 }, // السرية
        { wch: 18 }, // الرقم القومي
        { wch: 15 }, // المؤهل
        { wch: 12 }, // تاريخ التجنيد
        { wch: 12 }, // الميلاد
        { wch: 12 }, // الزوجة
        { wch: 18 }, // المهنة
        { wch: 15 }, // مهن اخرى
        { wch: 30 }, // العنوان
        { wch: 20 }, // الطبية
        { wch: 25 }, // المناظرة
        { wch: 25 }, // الوالد
        { wch: 15 }, // وظيفة الوالد
        { wch: 25 }, // الوالدة
        { wch: 15 }, // وظيفة الوالدة
        { wch: 30 }, // الموقف الأمني
        { wch: 25 }, // ملاحظات
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'بيانات المجندين');

      const fileName = `بيانات_المجندين_${activeBatch ? activeBatch.name : 'دفعة'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error('Excel export error:', err);
      alert('حدث خطأ أثناء تصدير ملف الإكسيل');
    } finally {
      setIsProcessing(false);
      setProgressMsg('');
    }
  };

  // 4. Export CSV (UTF-8 with BOM for Excel Arabic support)
  const handleExportCSV = () => {
    if (targetRecruits.length === 0) return;

    try {
      const headers = ['م', 'الاسم', 'رقم الشرطة', 'السرية', 'الرقم القومي', 'المؤهل', 'العنوان', 'تاريخ التجنيد'];
      const csvRows = [headers.join(',')];

      targetRecruits.forEach((r, idx) => {
        const row = [
          idx + 1,
          `"${(r.name || '').replace(/"/g, '""')}"`,
          `"${r.police_number || ''}"`,
          `"${r.company || ''}"`,
          `"${r.national_id || ''}"`,
          `"${r.qualification || ''}"`,
          `"${(r.address || '').replace(/"/g, '""')}"`,
          `"${r.attendance_date || ''}"`
        ];
        csvRows.push(row.join(','));
      });

      const csvContent = '\uFEFF' + csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `بيانات_المجندين_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } catch (err) {
      console.error('CSV export error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <div className="bg-[#0f141c] border border-slate-700 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col my-auto">
        
        {/* Header */}
        <div className="bg-[#141b26] px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                تصدير البيانات وكروت الدولاب
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  {targetRecruits.length} مجند محدد
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                استخراج كروت تعريف الدولاب الرسمية بصيغة PNG أو PDF للطباعة، وتصدير قواعد البيانات لإكسيل
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={isProcessing}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Export Controls & Selection (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* 1. Format Selection Tabs */}
            <div>
              <label className="text-xs font-bold text-slate-300 mb-2 block">نوع التصدير المطلوب:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExportType('cards')}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-bold transition-all ${
                    exportType === 'cards'
                      ? 'bg-orange-600/20 border-orange-500 text-orange-300 shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                  }`}
                >
                  <IdCard className="w-4 h-4 text-orange-400" />
                  <span>كارت الدولاب الرسمي</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportType('excel')}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-bold transition-all ${
                    exportType === 'excel'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>جدول بيانات إكسيل</span>
                </button>
              </div>
            </div>

            {/* 2. Scope Selection (Selected vs All) */}
            <div>
              <label className="text-xs font-bold text-slate-300 mb-2 block">نطاق التصدير:</label>
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
                <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-200">
                  <input
                    type="radio"
                    name="scope"
                    value="selected"
                    checked={scope === 'selected'}
                    onChange={() => setScope('selected')}
                    className="text-orange-500 focus:ring-orange-500 bg-slate-800 border-slate-700"
                  />
                  <span>
                    المجندين المحددين في الجدول 
                    <strong className="text-orange-400 mx-1">({selectedRecruitIds.length})</strong>
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-200">
                  <input
                    type="radio"
                    name="scope"
                    value="all"
                    checked={scope === 'all'}
                    onChange={() => setScope('all')}
                    className="text-orange-500 focus:ring-orange-500 bg-slate-800 border-slate-700"
                  />
                  <span>
                    جميع مجندين الدفع المعروضين
                    <strong className="text-slate-400 mx-1">({recruits.length})</strong>
                  </span>
                </label>
              </div>
            </div>

            {/* 3. Card Options (if Cards selected) */}
            {exportType === 'cards' && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
                <label className="text-xs font-bold text-slate-300 block">خيارات تصدير كروت الدولاب:</label>
                
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="pdfLayout"
                      value="a4_grid"
                      checked={pdfLayout === 'a4_grid'}
                      onChange={() => setPdfLayout('a4_grid')}
                      className="text-orange-500"
                    />
                    <span>صفحة A4 للطباعة والقص (4 كروت في كل ورقة)</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="pdfLayout"
                      value="single"
                      checked={pdfLayout === 'single'}
                      onChange={() => setPdfLayout('single')}
                      className="text-orange-500"
                    />
                    <span>كارت منفصل لكل صفحة (مقاس البطاقة المستقل)</span>
                  </label>
                </div>

                <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
                  {/* Quick Edit Police Number / Company for current card */}
                  {currentRecruit && (
                    <div className="bg-slate-850 p-2.5 rounded-lg border border-slate-750 text-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-300">تعديل سريع لبيانات الكارت:</span>
                        <button
                          type="button"
                          onClick={() => setEditingCard(!editingCard)}
                          className="text-orange-400 hover:text-orange-300 flex items-center gap-1 font-semibold"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          {editingCard ? 'إلغاء' : 'تعديل'}
                        </button>
                      </div>

                      {editingCard ? (
                        <div className="space-y-2 mt-2">
                          <div>
                            <span className="text-[11px] text-slate-400 block mb-1">رقم الشرطة:</span>
                            <input
                              type="text"
                              value={tempPoliceNum}
                              onChange={(e) => setTempPoliceNum(e.target.value)}
                              placeholder="مثال: ١٢٤٩٢٣"
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                            />
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-400 block mb-1">السرية:</span>
                            <input
                              type="text"
                              value={tempCompany}
                              onChange={(e) => setTempCompany(e.target.value)}
                              placeholder="مثال: السرية الثالثة ( ٣ )"
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleSaveCardEdits}
                            className="w-full mt-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1 rounded text-xs transition-colors"
                          >
                            حفظ على الكارت
                          </button>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 space-y-0.5">
                          <div>رقم الشرطة: <span className="text-white font-mono">{currentRecruit.police_number || 'غير مسجل'}</span></div>
                          <div>السرية: <span className="text-white">{currentRecruit.company || 'السرية الثالثة ( ٣ )'}</span></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. Action Buttons */}
            <div className="space-y-2 pt-2">
              {exportType === 'cards' ? (
                <>
                  <button
                    type="button"
                    onClick={handleExportCardsPDF}
                    disabled={isProcessing || targetRecruits.length === 0}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-sm shadow-lg shadow-orange-900/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{progressMsg || 'جاري المعالجة...'}</span>
                      </>
                    ) : (
                      <>
                        <Printer className="w-4 h-4" />
                        <span>تصدير كروت الدولاب للطباعة (PDF)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleExportSinglePNG}
                    disabled={isProcessing || !currentRecruit}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs border border-slate-700 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Download className="w-4 h-4 text-orange-400" />
                    <span>تحميل الكارت المعروض حالياً كصورة (PNG)</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    disabled={isProcessing || targetRecruits.length === 0}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="w-4 h-4" />
                    )}
                    <span>تصدير جدول البيانات الشامل (Excel .xlsx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportCSV}
                    disabled={isProcessing || targetRecruits.length === 0}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs border border-slate-700 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>تصدير كملف نصي (CSV UTF-8)</span>
                  </button>
                </>
              )}
            </div>

          </div>

          {/* Right Column: Live Card Preview & Pagination (7 cols) */}
          <div className="lg:col-span-7 bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-between">
            
            <div className="w-full flex items-center justify-between mb-3 px-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-bold text-slate-300">معاينة حية ومطابقة للطباعة:</span>
              </div>

              {targetRecruits.length > 1 && (
                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                  <span>{previewIndex + 1} من {targetRecruits.length}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPreviewIndex((prev) => (prev > 0 ? prev - 1 : targetRecruits.length - 1))}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title="المجند السابق"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewIndex((prev) => (prev < targetRecruits.length - 1 ? prev + 1 : 0))}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title="المجند التالي"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* The Actual Scaled Card Rendering */}
            <div className="w-full flex items-center justify-center p-2 overflow-x-auto min-h-[300px]">
              {currentRecruit ? (
                <div className="shadow-2xl rounded-sm transition-all">
                  <LockerCard 
                    ref={cardRef} 
                    recruit={currentRecruit} 
                    scale={0.92}
                  />
                </div>
              ) : (
                <div className="text-center py-16 text-slate-500">
                  لا يوجد مجندين لعرض الكارت
                </div>
              )}
            </div>

            {/* Print specifications badge */}
            <div className="w-full mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 px-2">
              <span>أبعاد البطاقة: 640 × 380 بكسل (أبعاد دولاب المجند القياسية)</span>
              <span className="text-orange-400 font-medium">جاهز للطباعة والقص الفوري</span>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
