import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Upload, Camera, FileText, CheckCircle2, AlertTriangle, 
  Trash2, Printer, Download, Eye, ZoomIn, RefreshCw, Shield, Scan
} from 'lucide-react';
import { authHeaders } from '../utils/auth';

export default function RecruitDocumentsModal({ recruit, onClose, onRefreshRecruits }) {
  const [documents, setDocuments] = useState([]);
  const [quickPaths, setQuickPaths] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState(null);
  
  // Scanner / Camera capture state
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureTargetType, setCaptureTargetType] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  
  // Preview / Zoom state
  const [previewDoc, setPreviewDoc] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const [activeUploadType, setActiveUploadType] = useState('id_doc_front');

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/recruits/${recruit.id}/documents`, {
        headers: authHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
        setQuickPaths(data.quickPaths || {});
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (recruit?.id) {
      fetchDocuments();
    }
    return () => {
      stopCamera();
    };
  }, [recruit?.id]);

  // Camera handling for direct document scanning
  const startCamera = async (docType) => {
    setCaptureTargetType(docType);
    setCameraError(null);
    setIsCapturing(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Error opening camera:', err);
      setCameraError('تعذر فتح الكاميرا أو الماسح الضوئي المباشر. يرجى التأكد من توصيل الجهاز والسماح بالوصول.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
    setCaptureTargetType(null);
  };

  const captureFrame = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Data = canvas.toDataURL('image/jpeg', 0.92);
    stopCamera();

    // Upload base64 capture
    try {
      setUploadingType(captureTargetType);
      const res = await fetch(`/api/recruits/${recruit.id}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({
          doc_type: captureTargetType,
          base64_data: base64Data
        })
      });

      if (res.ok) {
        await fetchDocuments();
        onRefreshRecruits?.();
      } else {
        alert('فشل حفظ المسح الضوئي');
      }
    } catch (err) {
      console.error(err);
      alert('خطأ في الاتصال بالخادم');
    } finally {
      setUploadingType(null);
    }
  };

  // File Upload handling
  const triggerFileUpload = (docType) => {
    setActiveUploadType(docType);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingType(activeUploadType);
      const formData = new FormData();
      formData.append('document', file);
      formData.append('doc_type', activeUploadType);

      const res = await fetch(`/api/recruits/${recruit.id}/documents`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData
      });

      if (res.ok) {
        await fetchDocuments();
        onRefreshRecruits?.();
      } else {
        const err = await res.json();
        alert(err.error || 'فشل رفع المستند');
      }
    } catch (err) {
      console.error(err);
      alert('خطأ في رفع الملف');
    } finally {
      setUploadingType(null);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الوثيقة من ملف المجند؟')) return;
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (res.ok) {
        await fetchDocuments();
        onRefreshRecruits?.();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrintDocument = (docPath, title) => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>${title} - ${recruit.name}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body { font-family: 'Cairo', sans-serif; text-align: center; margin: 0; padding: 0; }
          .header { border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
          img.doc-img { max-width: 100%; max-height: 255mm; object-fit: contain; }
        </style>
      </head>
      <body>
        <div class="header">
          <div><strong>قطاع الأمن المركزي - منطقة وسط الدلتا</strong></div>
          <div><strong>المجند:</strong> ${recruit.name} | <strong>رقم الشرطة:</strong> ${recruit.police_number || '---'}</div>
          <div><strong>${title}</strong></div>
        </div>
        <img src="${docPath}" class="doc-img" />
      </body>
      </html>
    `);
    printWin.document.close();
    setTimeout(() => {
      printWin.print();
    }, 400);
  };

  // Find documents by type
  const docFront = documents.find(d => d.doc_type === 'id_doc_front') || (quickPaths.id_doc_front ? { file_path: quickPaths.id_doc_front, title: 'وثيقة تعارف (الوجه الأول)' } : null);
  const docBack = documents.find(d => d.doc_type === 'id_doc_back') || (quickPaths.id_doc_back ? { file_path: quickPaths.id_doc_back, title: 'وثيقة تعارف (الوجه الثاني)' } : null);
  const docMil = documents.find(d => d.doc_type === 'military_record') || (quickPaths.military_record ? { file_path: quickPaths.military_record, title: 'أصل السجل العسكري' } : null);

  const otherDocs = documents.filter(d => !['id_doc_front', 'id_doc_back', 'military_record'].includes(d.doc_type));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*,application/pdf" 
        className="hidden" 
      />

      {/* Main Container - IBM Carbon style */}
      <div className="bg-[#161616] border border-[#393939] w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl text-gray-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#393939] flex items-center justify-between bg-[#262626]">
          <div className="flex items-center gap-3.5">
            <div className="p-2 bg-[#0f62fe]/10 border border-[#0f62fe]/30 text-[#0f62fe]">
              <Scan className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold tracking-wide">أرشيف وثائق التعارف والسجل العسكري</h2>
                <span className="text-xs px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                  المرحلة الثانية (بعد الدخول)
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                المجند: <strong className="text-white">{recruit.name}</strong> — رقم الشرطة: <span className="font-mono text-amber-300 font-bold">{recruit.police_number || '---'}</span> — الرقم القومي: <span className="font-mono text-gray-300">{recruit.national_id || '---'}</span>
              </p>
            </div>
          </div>

          <button 
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 hover:bg-[#393939] text-gray-400 hover:text-white transition-colors"
            title="إغلاق (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera / Scanner Direct Capture Overlay */}
        {isCapturing && (
          <div className="p-4 bg-[#1a1a1a] border-b border-[#393939] flex flex-col items-center">
            <div className="w-full max-w-2xl bg-black border border-[#525252] relative overflow-hidden mb-3">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-80 object-contain"
              ></video>
              
              {/* Overlay alignment guide */}
              <div className="absolute inset-4 border-2 border-dashed border-[#0f62fe]/70 pointer-events-none flex items-center justify-center">
                <span className="bg-black/60 px-3 py-1 text-xs text-[#0f62fe] font-bold">
                  قم بمحاذاة الوثيقة داخل الإطار
                </span>
              </div>
            </div>

            {cameraError && (
              <p className="text-xs text-red-400 mb-3 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                {cameraError}
              </p>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={captureFrame}
                className="px-6 py-2 bg-[#0f62fe] hover:bg-[#0353e9] text-white text-sm font-bold flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>التقاط وحفظ المسح الضوئي</span>
              </button>
              <button
                onClick={stopCamera}
                className="px-4 py-2 bg-[#393939] hover:bg-[#4c4c4c] text-gray-300 text-sm"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* Body content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Section 1: Official Identification Document (وثيقة التعارف - وجهين) */}
          <div>
            <div className="flex items-center justify-between border-b border-[#333333] pb-2 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0f62fe]" />
                <h3 className="text-base font-bold text-white">وثيقة التعارف المفصلة (المعتمدة من الأمن المركزي)</h3>
              </div>
              <span className="text-xs text-gray-400">نموذج الاستدعاء لليوم التالي - بيان الأقارب والشجرة العائلية</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Face 1: الوجه الأول (بيانات المجند، الوالدين، الأجداد، الإخوة، الأعمام) */}
              <div className="bg-[#1e1e1e] border border-[#393939] p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white">وثيقة التعارف (الوجه الأول)</span>
                    {docFront ? (
                      <span className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        تم الرفع والمسح
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">
                        بانتظار المسح
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mb-3">
                    يشمل: بيانات المجند، جهة الالتحاق، الوالدين والأجداد، الإخوة، بيانات الزوجة، والأعمام.
                  </p>

                  {/* Thumbnail / Preview Tile */}
                  <div className="h-56 bg-[#141414] border border-[#333] flex items-center justify-center overflow-hidden relative group">
                    {docFront ? (
                      <>
                        <img 
                          src={docFront.file_path} 
                          alt="وثيقة التعارف - وجه 1" 
                          className="w-full h-full object-contain p-1"
                        />
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity">
                          <button
                            onClick={() => setPreviewDoc(docFront)}
                            className="p-2 bg-[#0f62fe] text-white hover:bg-[#0353e9]"
                            title="تكبير ومعاينة دقيقة"
                          >
                            <ZoomIn className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePrintDocument(docFront.file_path, 'وثيقة تعارف - الوجه الأول')}
                            className="p-2 bg-gray-700 text-white hover:bg-gray-600"
                            title="طباعة A4"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {docFront.id && (
                            <button
                              onClick={() => handleDeleteDocument(docFront.id)}
                              className="p-2 bg-red-800 text-white hover:bg-red-700"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-4 text-gray-600">
                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-40" />
                        <span className="text-xs">لم يتم رفع أو مسح الوجه الأول</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload & Scan Actions */}
                <div className="mt-3 pt-3 border-t border-[#333] flex items-center gap-2">
                  <button
                    onClick={() => triggerFileUpload('id_doc_front')}
                    disabled={uploadingType === 'id_doc_front'}
                    className="flex-1 py-1.5 px-3 bg-[#2a2a2a] hover:bg-[#383838] text-xs font-semibold text-gray-200 hover:text-white border border-[#444] flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#0f62fe]" />
                    <span>{docFront ? 'استبدال بملف' : 'رفع صورة الوثيقة'}</span>
                  </button>

                  <button
                    onClick={() => startCamera('id_doc_front')}
                    className="flex-1 py-1.5 px-3 bg-[#2a2a2a] hover:bg-[#383838] text-xs font-semibold text-gray-200 hover:text-white border border-[#444] flex items-center justify-center gap-1.5"
                  >
                    <Scan className="w-3.5 h-3.5 text-emerald-400" />
                    <span>مسح بالكاميرا</span>
                  </button>
                </div>
              </div>

              {/* Face 2: الوجه الثاني (العمات، أولاد العم، الأخوال، الخالات، أولاد الخال، الإقرار) */}
              <div className="bg-[#1e1e1e] border border-[#393939] p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white">وثيقة التعارف (الوجه الثاني)</span>
                    {docBack ? (
                      <span className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        تم الرفع والمسح
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">
                        بانتظار المسح
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mb-3">
                    يشمل: العمات، أولاد العم والعمة، الأخوال والخالات، أولادهم، الأصدقاء، وإقرار صحة البيانات.
                  </p>

                  {/* Thumbnail / Preview Tile */}
                  <div className="h-56 bg-[#141414] border border-[#333] flex items-center justify-center overflow-hidden relative group">
                    {docBack ? (
                      <>
                        <img 
                          src={docBack.file_path} 
                          alt="وثيقة التعارف - وجه 2" 
                          className="w-full h-full object-contain p-1"
                        />
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity">
                          <button
                            onClick={() => setPreviewDoc(docBack)}
                            className="p-2 bg-[#0f62fe] text-white hover:bg-[#0353e9]"
                            title="تكبير ومعاينة دقيقة"
                          >
                            <ZoomIn className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePrintDocument(docBack.file_path, 'وثيقة تعارف - الوجه الثاني')}
                            className="p-2 bg-gray-700 text-white hover:bg-gray-600"
                            title="طباعة A4"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {docBack.id && (
                            <button
                              onClick={() => handleDeleteDocument(docBack.id)}
                              className="p-2 bg-red-800 text-white hover:bg-red-700"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-4 text-gray-600">
                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-40" />
                        <span className="text-xs">لم يتم رفع أو مسح الوجه الثاني</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload & Scan Actions */}
                <div className="mt-3 pt-3 border-t border-[#333] flex items-center gap-2">
                  <button
                    onClick={() => triggerFileUpload('id_doc_back')}
                    disabled={uploadingType === 'id_doc_back'}
                    className="flex-1 py-1.5 px-3 bg-[#2a2a2a] hover:bg-[#383838] text-xs font-semibold text-gray-200 hover:text-white border border-[#444] flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#0f62fe]" />
                    <span>{docBack ? 'استبدال بملف' : 'رفع صورة الوثيقة'}</span>
                  </button>

                  <button
                    onClick={() => startCamera('id_doc_back')}
                    className="flex-1 py-1.5 px-3 bg-[#2a2a2a] hover:bg-[#383838] text-xs font-semibold text-gray-200 hover:text-white border border-[#444] flex items-center justify-center gap-1.5"
                  >
                    <Scan className="w-3.5 h-3.5 text-emerald-400" />
                    <span>مسح بالكاميرا</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Section 2: Military Record (أصل السجل العسكري) */}
          <div>
            <div className="flex items-center justify-between border-b border-[#333333] pb-2 mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-white">أصل السجل العسكري الممسوح ضوئياً</h3>
              </div>
              <span className="text-xs text-gray-400">وثيقة إثبات التجنيد والسلاح المعتمدة</span>
            </div>

            <div className="bg-[#1e1e1e] border border-[#393939] p-4 flex flex-col md:flex-row items-center gap-6">
              
              <div className="w-full md:w-64 h-48 bg-[#141414] border border-[#333] flex items-center justify-center overflow-hidden relative group shrink-0">
                {docMil ? (
                  <>
                    <img 
                      src={docMil.file_path} 
                      alt="أصل السجل العسكري" 
                      className="w-full h-full object-contain p-1"
                    />
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity">
                      <button
                        onClick={() => setPreviewDoc(docMil)}
                        className="p-2 bg-[#0f62fe] text-white hover:bg-[#0353e9]"
                        title="تكبير ومعاينة"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handlePrintDocument(docMil.file_path, 'أصل السجل العسكري')}
                        className="p-2 bg-gray-700 text-white hover:bg-gray-600"
                        title="طباعة A4"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      {docMil.id && (
                        <button
                          onClick={() => handleDeleteDocument(docMil.id)}
                          className="p-2 bg-red-800 text-white hover:bg-red-700"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4 text-gray-600">
                    <Shield className="w-12 h-12 mx-auto mb-2 opacity-40" />
                    <span className="text-xs">لم يتم إرفاق السجل العسكري</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">النسخة الضوئية لأصل السجل العسكري</h4>
                  {docMil ? (
                    <span className="text-xs px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      مؤرشف في قاعدة البيانات
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">
                      غير مرفوع
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-400 leading-relaxed">
                  يتم مسح أو تصوير أصل السجل العسكري لتوثيق رقم الشرطة، السلاح، وتاريخ بدء وانتهاء الخدمة في ملف المجند.
                </p>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => triggerFileUpload('military_record')}
                    disabled={uploadingType === 'military_record'}
                    className="py-2 px-4 bg-[#2a2a2a] hover:bg-[#383838] text-xs font-semibold text-gray-200 hover:text-white border border-[#444] flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>{docMil ? 'استبدال السجل' : 'رفع صورة السجل العسكري'}</span>
                  </button>

                  <button
                    onClick={() => startCamera('military_record')}
                    className="py-2 px-4 bg-[#2a2a2a] hover:bg-[#383838] text-xs font-semibold text-gray-200 hover:text-white border border-[#444] flex items-center gap-2"
                  >
                    <Scan className="w-4 h-4 text-emerald-400" />
                    <span>مسح بالماسح الضوئي / الكاميرا</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#1e1e1e] border-t border-[#393939] flex items-center justify-between">
          <div className="text-xs text-gray-400 flex items-center gap-2">
            <Scan className="w-4 h-4 text-[#0f62fe]" />
            <span>نظام الأرشفة الرقمية والمسح الضوئي — قطاع الأمن المركزي</span>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-6 py-2 bg-[#393939] hover:bg-[#4c4c4c] text-white text-xs font-bold"
          >
            إغلاق النافذة
          </button>
        </div>

      </div>

      {/* High-Resolution Document Zoom Viewer */}
      {previewDoc && (
        <div className="fixed inset-0 z-60 bg-black/95 flex flex-col p-4">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-3">
            <h3 className="text-base font-bold text-white">{previewDoc.title} — {recruit.name}</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handlePrintDocument(previewDoc.file_path, previewDoc.title)}
                className="px-3 py-1.5 bg-[#0f62fe] text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الوثيقة A4</span>
              </button>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 text-gray-400 hover:text-white bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto flex items-center justify-center p-2">
            <img 
              src={previewDoc.file_path} 
              alt={previewDoc.title} 
              className="max-h-[85vh] max-w-full object-contain shadow-2xl border border-gray-700"
            />
          </div>
        </div>
      )}

    </div>
  );
}
