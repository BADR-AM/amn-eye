import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  RefreshCw, 
  Check, 
  Filter, 
  ArrowRight, 
  Building2,
  Users,
  Search,
  FileCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { authHeaders } from '../utils/auth';

export const OFFICIAL_SECTORS = [
  'رئاسة المنطقة',
  'قطاع أحمد عمارة',
  'قطاع عمر القاضي',
  'قطاع على خاطر',
  'قطاع جمال فايق',
  'مركز التدريب',
  'جهة خارجية',
  'عودة'
];

// Normalize Arabic text for reliable matching
export function normalizeArabicText(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove tashkeel
    .replace(/[إأآا]/g, 'ا')
    .replace(/[ةه]/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

// Map various colloquial sector text representations to official standardized names
export function mapToOfficialSector(rawSector) {
  if (!rawSector) return '';
  const norm = normalizeArabicText(rawSector);

  if (norm.includes('احمد عماره') || norm.includes('عماره')) return 'قطاع أحمد عمارة';
  if (norm.includes('عمر القاضي') || norm.includes('القاضي')) return 'قطاع عمر القاضي';
  if (norm.includes('علي خاطر') || norm.includes('خاطر')) return 'قطاع على خاطر';
  if (norm.includes('جمال فايق') || norm.includes('فايق')) return 'قطاع جمال فايق';
  if (norm.includes('رئاسه') || norm.includes('المنطقه') || norm.includes('قياده')) return 'رئاسة المنطقة';
  if (norm.includes('مركز التدريب') || norm.includes('التدريب')) return 'مركز التدريب';
  if (norm.includes('خارجيه') || norm.includes('خارج')) return 'جهة خارجية';
  if (norm.includes('عوده') || norm.includes('راجع')) return 'عودة';

  // If already exactly matching one of the official sectors
  const exact = OFFICIAL_SECTORS.find(s => normalizeArabicText(s) === norm);
  if (exact) return exact;

  return rawSector.trim();
}

export default function DistributionImportModal({ isOpen, onClose, onImportSuccess }) {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loadingFile, setLoadingFile] = useState(false);
  const [dbRecruits, setDbRecruits] = useState([]);
  const [loadingDb, setLoadingDb] = useState(false);

  // Parsed raw sheets and columns
  const [sheets, setSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [workbook, setWorkbook] = useState(null);
  const [columns, setColumns] = useState([]);

  // Selected column mappings
  const [nameCol, setNameCol] = useState('');
  const [sectorCol, setSectorCol] = useState('');
  const [idCol, setIdCol] = useState('');

  // Processed comparison results
  const [matchedItems, setMatchedItems] = useState([]);
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'ready' | 'already' | 'not_found'
  const [searchTerm, setSearchTerm] = useState('');

  // Execution state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const fileInputRef = useRef(null);

  // 1. Fetch live recruits from database when modal opens
  useEffect(() => {
    if (!isOpen) {
      resetState();
      return;
    }
    fetchLiveRecruits();
  }, [isOpen]);

  const resetState = () => {
    setFile(null);
    setFileName('');
    setSheets([]);
    setSelectedSheet('');
    setWorkbook(null);
    setColumns([]);
    setNameCol('');
    setSectorCol('');
    setIdCol('');
    setMatchedItems([]);
    setFilterTab('all');
    setSearchTerm('');
    setSubmitting(false);
    setSubmitError(null);
  };

  const fetchLiveRecruits = async () => {
    setLoadingDb(true);
    try {
      const res = await fetch('/api/recruits?limit=all', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDbRecruits(data.recruits || []);
      }
    } catch (err) {
      console.error('Failed to load recruits for distribution matching:', err);
    } finally {
      setLoadingDb(false);
    }
  };

  // 2. Handle File Upload
  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    processExcelFile(uploadedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;
    processExcelFile(droppedFile);
  };

  const processExcelFile = (fileObj) => {
    setFile(fileObj);
    setFileName(fileObj.name);
    setLoadingFile(true);
    setSubmitError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        setWorkbook(wb);
        setSheets(wb.SheetNames);
        if (wb.SheetNames.length > 0) {
          const firstSheet = wb.SheetNames[0];
          setSelectedSheet(firstSheet);
          parseSheetData(wb, firstSheet);
        }
      } catch (err) {
        console.error('Error parsing Excel:', err);
        setSubmitError('تعذر قراءة ملف الإكسيل. تأكد من أن الملف سليم بصيغة .xlsx أو .xls');
      } finally {
        setLoadingFile(false);
      }
    };
    reader.readAsBinaryString(fileObj);
  };

  // 3. Parse Sheet Data & Detect Columns
  const parseSheetData = (wb, sheetName) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;

    // Convert to JSON with headers
    const rawData = XLSX.utils.sheet_to_json(ws, { defval: '', header: 1 });
    if (!rawData || rawData.length === 0) {
      setSubmitError('ورقة العمل المختارة فارغة');
      return;
    }

    // Find header row (the first row with at least 2 non-empty string cells)
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(rawData.length, 10); i++) {
      const row = rawData[i];
      if (Array.isArray(row)) {
        const strCells = row.filter(c => typeof c === 'string' && c.trim().length > 0);
        if (strCells.length >= 2) {
          headerRowIdx = i;
          break;
        }
      }
    }

    const headers = rawData[headerRowIdx].map(h => String(h || '').trim());
    setColumns(headers);

    // Auto-detect Name column
    let detectedName = headers.find(h => {
      const n = normalizeArabicText(h);
      return n.includes('اسم') || n.includes('الاسم') || n.includes('المجند') || n === 'name';
    }) || headers[0] || '';

    // Auto-detect Sector column
    let detectedSector = headers.find(h => {
      const n = normalizeArabicText(h);
      return n.includes('جهه') || n.includes('جهة') || n.includes('قطاع') || n.includes('توزيع') || n.includes('مكان') || n.includes('sector');
    }) || headers[1] || '';

    // Auto-detect National ID column
    let detectedId = headers.find(h => {
      const n = normalizeArabicText(h);
      return n.includes('قومي') || n.includes('بطاقه') || n.includes('عسكري') || n.includes('شرطه');
    }) || '';

    setNameCol(detectedName);
    setSectorCol(detectedSector);
    setIdCol(detectedId);

    // Run matching with detected columns
    runMatching(rawData.slice(headerRowIdx + 1), headers, detectedName, detectedSector, detectedId);
  };

  // 4. Match Excel Rows against Database Recruits
  const runMatching = (dataRows, headers, activeNameCol, activeSectorCol, activeIdCol) => {
    if (!dataRows || dataRows.length === 0 || !activeNameCol || !activeSectorCol) {
      setMatchedItems([]);
      return;
    }

    const nameIdx = headers.indexOf(activeNameCol);
    const sectorIdx = headers.indexOf(activeSectorCol);
    const idIdx = activeIdCol ? headers.indexOf(activeIdCol) : -1;

    if (nameIdx === -1 || sectorIdx === -1) {
      setMatchedItems([]);
      return;
    }

    // Index DB recruits for fast lookup
    const recruitsByNameNorm = new Map();
    const recruitsByNationalId = new Map();
    const recruitsByMilitaryNum = new Map();
    const recruitsByPoliceNum = new Map();

    dbRecruits.forEach(r => {
      const normN = normalizeArabicText(r.name);
      if (normN) recruitsByNameNorm.set(normN, r);
      if (r.national_id) recruitsByNationalId.set(String(r.national_id).trim(), r);
      if (r.military_number) recruitsByMilitaryNum.set(String(r.military_number).trim(), r);
      if (r.police_number) recruitsByPoliceNum.set(String(r.police_number).trim(), r);
    });

    const results = [];

    dataRows.forEach((row, rowIdx) => {
      if (!Array.isArray(row)) return;
      const rawName = String(row[nameIdx] || '').trim();
      const rawSector = String(row[sectorIdx] || '').trim();
      const rawIdVal = idIdx !== -1 ? String(row[idIdx] || '').trim() : '';

      // Skip completely empty rows
      if (!rawName && !rawSector) return;

      const officialSector = mapToOfficialSector(rawSector);
      const normName = normalizeArabicText(rawName);

      // Attempt matching
      let matchedRecruit = null;

      // 1. Match by National ID / Military number if provided
      if (rawIdVal) {
        if (recruitsByNationalId.has(rawIdVal)) {
          matchedRecruit = recruitsByNationalId.get(rawIdVal);
        } else if (recruitsByMilitaryNum.has(rawIdVal)) {
          matchedRecruit = recruitsByMilitaryNum.get(rawIdVal);
        } else if (recruitsByPoliceNum.has(rawIdVal)) {
          matchedRecruit = recruitsByPoliceNum.get(rawIdVal);
        }
      }

      // 2. Exact normalized name match
      if (!matchedRecruit && normName) {
        if (recruitsByNameNorm.has(normName)) {
          matchedRecruit = recruitsByNameNorm.get(normName);
        } else {
          // 3. Substring / Token match (e.g. 4 words vs 3 words)
          for (const [dbNorm, r] of recruitsByNameNorm.entries()) {
            if (dbNorm.includes(normName) || normName.includes(dbNorm)) {
              matchedRecruit = r;
              break;
            }
          }
        }
      }

      let status = 'not_found';
      if (matchedRecruit) {
        if (matchedRecruit.distribution_sector && matchedRecruit.distribution_sector === officialSector) {
          status = 'already';
        } else {
          status = 'ready';
        }
      }

      results.push({
        rowNumber: rowIdx + 2,
        excelName: rawName,
        excelRawSector: rawSector,
        officialSector,
        matchedRecruit,
        status // 'ready' | 'already' | 'not_found'
      });
    });

    setMatchedItems(results);
  };

  // Re-run matching when user changes column mapping dropdown
  const handleColumnChange = (type, colVal) => {
    let curName = nameCol;
    let curSector = sectorCol;
    let curId = idCol;

    if (type === 'name') {
      setNameCol(colVal);
      curName = colVal;
    } else if (type === 'sector') {
      setSectorCol(colVal);
      curSector = colVal;
    } else if (type === 'id') {
      setIdCol(colVal);
      curId = colVal;
    }

    if (workbook && selectedSheet) {
      const ws = workbook.Sheets[selectedSheet];
      const rawData = XLSX.utils.sheet_to_json(ws, { defval: '', header: 1 });
      const headers = rawData[0].map(h => String(h || '').trim());
      runMatching(rawData.slice(1), headers, curName, curSector, curId);
    }
  };

  // Execute Bulk Distribution Update
  const handleApplyDistribution = async () => {
    const readyItems = matchedItems.filter(item => item.status === 'ready' && item.matchedRecruit && item.officialSector);
    if (readyItems.length === 0) {
      alert('لا توجد سجلات جديدة جاهزة للتحديث');
      return;
    }

    const confirmMsg = `هل أنت متأكد من اعتماد تحديث بيانات التوزيع لعدد (${readyItems.length}) مجند من واقع ملف الإكسيل؟`;
    if (!window.confirm(confirmMsg)) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const updates = readyItems.map(item => ({
        id: item.matchedRecruit.id,
        distribution_sector: item.officialSector
      }));

      const res = await fetch('/api/recruits/bulk-update-distribution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({ updates })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'فشل تحديث بيانات التوزيع');
      }

      const resData = await res.json();
      alert(`✅ تم تحديث بيانات التوزيع لعدد (${resData.updatedCount}) مجند بنجاح!`);

      if (onImportSuccess) {
        onImportSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Error applying distribution:', err);
      setSubmitError(err.message || 'حدث خطأ أثناء حفظ التوزيع');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Filter items for display table
  const readyCount = matchedItems.filter(i => i.status === 'ready').length;
  const alreadyCount = matchedItems.filter(i => i.status === 'already').length;
  const notFoundCount = matchedItems.filter(i => i.status === 'not_found').length;

  const filteredItems = matchedItems.filter(item => {
    if (filterTab === 'ready' && item.status !== 'ready') return false;
    if (filterTab === 'already' && item.status !== 'already') return false;
    if (filterTab === 'not_found' && item.status !== 'not_found') return false;

    if (searchTerm.trim()) {
      const q = normalizeArabicText(searchTerm);
      const matchName = normalizeArabicText(item.excelName).includes(q);
      const matchDb = item.matchedRecruit && normalizeArabicText(item.matchedRecruit.name).includes(q);
      const matchSec = normalizeArabicText(item.officialSector).includes(q);
      return matchName || matchDb || matchSec;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto" dir="rtl">
      <div className="bg-darkslate-900 border border-slate-700/80 rounded-3xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-darkslate-850">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>استيراد وتوزيع المجندين من ملف إكسيل</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
                  Excel Distribution Sync
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                توزيع المجندين آلياً على القطاعات ورئاسة المنطقة والجهات الخارجية من واقع كشوف الإكسيل
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* Upload Box (if no file yet) */}
          {!file ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-darkslate-850/60 hover:bg-emerald-950/10 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 group-hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 transition-all border border-emerald-500/20 group-hover:scale-110">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">
                اضغط هنا لاختيار ملف إكسيل التوزيع أو اسحبه وأفلته هنا
              </h3>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                يدعم صيغ <span className="font-mono text-emerald-400 font-bold">.xlsx, .xls, .csv</span>.
                يتضمن الملف عمود باسم المجند وعمود الجهة أو القطاع الموزع إليه (مثل: قطاع عمر القاضي، رئاسة المنطقة، قطاع أحمد عمارة...).
              </p>
            </div>
          ) : (
            /* File & Column Configuration Bar */
            <div className="bg-darkslate-850 border border-slate-800 rounded-2xl p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-white text-sm">{fileName}</span>
                  <span className="text-xs text-slate-400 font-mono">({matchedItems.length} صف مقروء)</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors border border-slate-700"
                  >
                    تغيير الملف
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Column Mapping Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">عمود اسم المجند *</label>
                  <select
                    value={nameCol}
                    onChange={(e) => handleColumnChange('name', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold outline-none focus:border-emerald-500"
                  >
                    {columns.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">عمود القطاع / جهة التوزيع *</label>
                  <select
                    value={sectorCol}
                    onChange={(e) => handleColumnChange('sector', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold outline-none focus:border-emerald-500"
                  >
                    {columns.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">عمود الرقم القومي / الشرطة (اختياري)</label>
                  <select
                    value={idCol}
                    onChange={(e) => handleColumnChange('id', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  >
                    <option value="">-- بدون عمود هوية إضافي --</option>
                    {columns.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* KPI Summary Cards */}
          {matchedItems.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`p-3 rounded-2xl border text-right transition-all ${
                  filterTab === 'all' 
                    ? 'bg-blue-950/40 border-blue-500 text-white shadow-lg' 
                    : 'bg-darkslate-850 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="text-[11px] block font-semibold text-slate-400">إجمالي صفوف الإكسيل</span>
                <span className="text-xl font-black font-mono text-white mt-1 block">{matchedItems.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('ready')}
                className={`p-3 rounded-2xl border text-right transition-all ${
                  filterTab === 'ready' 
                    ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-lg' 
                    : 'bg-darkslate-850 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="text-[11px] block font-semibold text-emerald-400">جاهز للتحديث الجديد</span>
                <span className="text-xl font-black font-mono text-emerald-400 mt-1 block">{readyCount}</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('already')}
                className={`p-3 rounded-2xl border text-right transition-all ${
                  filterTab === 'already' 
                    ? 'bg-blue-950/40 border-cyan-500 text-white shadow-lg' 
                    : 'bg-darkslate-850 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="text-[11px] block font-semibold text-cyan-400">مطابق وموزع مسبقاً</span>
                <span className="text-xl font-black font-mono text-cyan-400 mt-1 block">{alreadyCount}</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('not_found')}
                className={`p-3 rounded-2xl border text-right transition-all ${
                  filterTab === 'not_found' 
                    ? 'bg-rose-950/40 border-rose-500 text-white shadow-lg' 
                    : 'bg-darkslate-850 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="text-[11px] block font-semibold text-rose-400">غير موجود بالقاعدة</span>
                <span className="text-xl font-black font-mono text-rose-400 mt-1 block">{notFoundCount}</span>
              </button>
            </div>
          )}

          {/* Search in Preview */}
          {matchedItems.length > 0 && (
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="بحث في أسماء الإكسيل أو القطاعات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-darkslate-850 border border-slate-800 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                />
              </div>

              <span className="text-xs text-slate-400 font-bold">
                عرض ({filteredItems.length}) من إجمالي ({matchedItems.length})
              </span>
            </div>
          )}

          {/* Preview Table */}
          {matchedItems.length > 0 && (
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-darkslate-850 max-h-[350px] overflow-y-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 border-b border-slate-800 sticky top-0 text-slate-400 font-bold z-10">
                  <tr>
                    <th className="p-3 w-12 text-center">م</th>
                    <th className="p-3">اسم المجند (في ملف الإكسيل)</th>
                    <th className="p-3">المجند المطابق بالمنظومة</th>
                    <th className="p-3">القطاع بالإكسيل</th>
                    <th className="p-3">القطاع المعتمد</th>
                    <th className="p-3 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredItems.map((item, idx) => {
                    const r = item.matchedRecruit;
                    return (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 text-center text-slate-500 font-mono text-[11px]">{item.rowNumber}</td>
                        <td className="p-3 font-bold text-white">{item.excelName}</td>
                        <td className="p-3">
                          {r ? (
                            <div>
                              <span className="font-bold text-emerald-300 block">{r.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {r.company || 'السرية الأولى'} • ر.ق: {r.police_number || 'ـ'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px] italic">لم يتم العثور على تطابق</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-300">{item.excelRawSector || 'ـ'}</td>
                        <td className="p-3">
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold text-[11px]">
                            {item.officialSector || 'لم يحدد'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {item.status === 'ready' && (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              جاهز للتحديث
                            </span>
                          )}
                          {item.status === 'already' && (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold">
                              <Check className="w-3 h-3" />
                              موزع مسبقاً
                            </span>
                          )}
                          {item.status === 'not_found' && (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                              <AlertTriangle className="w-3 h-3" />
                              غير موجود
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Error Banner */}
          {submitError && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{submitError}</span>
            </div>
          )}

        </div>

        {/* Footer Action Bar */}
        <div className="px-6 py-4 border-t border-slate-800 bg-darkslate-850 flex items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            {readyCount > 0 ? (
              <span className="text-emerald-300 font-bold">
                سيتم تحديث عدد ({readyCount}) مجند بالقطاعات المحددة فور الضغط على اعتماد التوزيع.
              </span>
            ) : (
              <span>قم برفع الملف وتأكيد الأعمدة للبدء في المطابقة والتحديث.</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={handleApplyDistribution}
              disabled={submitting || readyCount === 0}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs shadow-xl transition-all ${
                readyCount > 0 && !submitting
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/60 active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري حفظ وتحديث التوزيع...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  <span>اعتماد وتحديث التوزيع ({readyCount})</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
