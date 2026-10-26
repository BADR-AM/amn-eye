import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  Maximize2,
  ZoomIn,
  ZoomOut, 
  Printer, 
  Trash2, 
  Video, 
  Camera, 
  User, 
  Calendar, 
  CreditCard, 
  Home, 
  Briefcase, 
  ShieldAlert, 
  Activity, 
  Users, 
  IdCard, 
  Download,
  Edit3,
  Save,
  RotateCcw,
  Upload,
  Smartphone,
  Check,
  Loader2,
  AlertTriangle,
  History,
  Brain,
  FileCheck,
  AlertOctagon
} from 'lucide-react';
import LockerCard from './LockerCard';
import RecruitHistoryModal from './RecruitHistoryModal';
import ActivityLogModal from './ActivityLogModal';
import RecruitDocumentsModal from './RecruitDocumentsModal';
import TicketModal from './TicketModal';
import PsychologicalFollowupModal from './PsychologicalFollowupModal';
import WebcamCaptureModal from './WebcamCaptureModal';
import { toPng } from 'html-to-image';
import { parseEgyptianNationalId } from '../utils/nationalId';
import { authHeaders, getUser } from '../utils/auth';

export default function RecruitModal({ 
  recruit, 
  onClose, 
  onPrint, 
  onDelete, 
  onUpdate,
  initialEditMode = false,
  currentUser: propCurrentUser
}) {
  const currentUser = propCurrentUser || getUser();
  const [showCardPreview, setShowCardPreview] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showPsychologicalModal, setShowPsychologicalModal] = useState(false);
  const cardRef = useRef(null);

  // Enlarged media modal (Photo zoom & Video theater modal)
  const [enlargedMedia, setEnlargedMedia] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Editable Form Data
  const [editData, setEditData] = useState({ ...recruit });

  // Photo replacement
  const [newPhotoFile, setNewPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(recruit?.photo_path || null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const photoInputRef = useRef(null);
  const mobilePhotoInputRef = useRef(null);

  // Video replacement
  const [newVideoFile, setNewVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(recruit?.video_path || null);
  const [removeVideo, setRemoveVideo] = useState(false);
  const videoInputRef = useRef(null);
  const mobileVideoInputRef = useRef(null);

  // Webcam Capture Modal (Live camera snapshot / 30s video recording)
  const [webcamModalConfig, setWebcamModalConfig] = useState({
    isOpen: false,
    mode: 'photo' // 'photo' | 'video'
  });

  // Sync state if recruit changes
  useEffect(() => {
    if (recruit && !isEditing) {
      setEditData({ ...recruit });
      setPhotoPreview(recruit.photo_path || null);
      setVideoPreview(recruit.video_path || null);
      setNewPhotoFile(null);
      setNewVideoFile(null);
      setRemovePhoto(false);
      setRemoveVideo(false);
      setSaveError(null);
    }
  }, [recruit, isEditing]);

  // Handle ESC key (supports enlarged media closing first)
  useEffect(() => {
    const handleEsc = (e) => { 
      if (e.key === 'Escape') {
        if (enlargedMedia) {
          setEnlargedMedia(null);
        } else if (isEditing) {
          setIsEditing(false);
          setSaveError(null);
        } else {
          onClose(); 
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, isEditing, enlargedMedia]);

  const handleDownloadCard = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        cacheBust: true
      });
      const link = document.createElement('a');
      link.download = `كارت_دولاب_${recruit.name.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  // Form field change with auto national ID parser
  const handleFieldChange = (field, val) => {
    setEditData(prev => {
      const updated = { ...prev, [field]: val };
      const safeVal = val?.trim?.() ?? val ?? '';
      if (field === 'national_id' && safeVal.length === 14) {
        const parsed = parseEgyptianNationalId(safeVal);
        if (parsed && parsed.isValid) {
          updated.birth_date = parsed.birthDate;
          if (!updated.address || updated.address === '') {
            updated.address = `محافظة ${parsed.governorate}`;
          }
        }
      }
      return updated;
    });
  };

  // Photo handlers
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewPhotoFile(file);
      setRemovePhoto(false);
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = '';
  };

  const handleRemovePhoto = () => {
    setNewPhotoFile(null);
    setPhotoPreview(null);
    setRemovePhoto(true);
  };

  // Video handlers
  const handleVideoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewVideoFile(file);
      setRemoveVideo(false);
      if (videoPreview && typeof videoPreview === 'string' && videoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(videoPreview);
      }
      setVideoPreview(URL.createObjectURL(file));
    }
    if (e.target) e.target.value = '';
  };

  useEffect(() => {
    return () => {
      if (videoPreview && typeof videoPreview === 'string' && videoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(videoPreview);
      }
    };
  }, [videoPreview]);

  const handleRemoveVideo = () => {
    setNewVideoFile(null);
    setVideoPreview(null);
    setRemoveVideo(true);
  };

  // Webcam Capture Handlers
  const handleOpenWebcamPhoto = () => {
    setWebcamModalConfig({ isOpen: true, mode: 'photo' });
  };

  const handleOpenWebcamVideo = () => {
    setWebcamModalConfig({ isOpen: true, mode: 'video' });
  };

  const handleWebcamCapture = (file, previewUrl) => {
    if (webcamModalConfig.mode === 'photo') {
      setNewPhotoFile(file);
      setPhotoPreview(previewUrl);
      setRemovePhoto(false);
    } else {
      setNewVideoFile(file);
      if (videoPreview && typeof videoPreview === 'string' && videoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(videoPreview);
      }
      setVideoPreview(previewUrl);
      setRemoveVideo(false);
    }
  };

  // Save changes
  const handleSave = async () => {
    if (!editData.name || !editData.name.trim()) {
      setSaveError('اسم المجند مطلوب');
      return;
    }
    if (editData.national_id && editData.national_id.trim().length > 0 && !/^\d{14}$/.test(editData.national_id.trim())) {
      setSaveError('الرقم القومي يجب أن يتكون من 14 رقماً');
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const formData = new FormData();
      const textFields = [
        'name', 'national_id', 'birth_date', 'religion', 'qualification',
        'wife', 'address', 'current_job', 'other_jobs', 'travel_abroad',
        'literacy', 'inspection', 'medical_status', 'father_name', 'father_job',
        'mother_name', 'mother_job', 'siblings_check', 'family_social_status',
        'family_security_status', 'police_number', 'company', 'distribution_sector', 'notes',
        'attendance_date', 'batch_id', 'military_number',
        'political_suspicion_status', 'political_suspicion_details',
        'criminal_suspicion_status', 'criminal_suspicion_details'
      ];

      textFields.forEach((field) => {
        if (editData[field] !== undefined && editData[field] !== null) {
          formData.append(field, editData[field]);
        }
      });

      if (newPhotoFile) {
        formData.append('photo', newPhotoFile);
      } else if (removePhoto) {
        formData.append('remove_photo', 'true');
      }

      if (newVideoFile) {
        formData.append('video', newVideoFile);
      } else if (removeVideo) {
        formData.append('remove_video', 'true');
      }

      const res = await fetch(`/api/recruits/${recruit.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: formData
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'فشل تحديث بيانات المجند');
      }

      const updated = await res.json();
      setIsEditing(false);
      if (onUpdate) {
        onUpdate(updated);
      }
    } catch (err) {
      console.error('Error updating recruit:', err);
      setSaveError(err.message || 'خطأ أثناء حفظ التعديلات');
    } finally {
      setSaving(false);
    }
  };

  if (!recruit) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-3 sm:p-4 overflow-y-auto" dir="rtl">
      <div className="bg-darkslate-900 border border-slate-700/80 rounded-3xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        
        {/* Hidden inputs for photo/video replace */}
        <input 
          ref={photoInputRef} 
          type="file" 
          accept="image/*" 
          onChange={handlePhotoSelect} 
          className="hidden" 
        />
        <input 
          ref={mobilePhotoInputRef} 
          type="file" 
          accept="image/*" 
          capture="user" 
          onChange={handlePhotoSelect} 
          className="hidden" 
        />
        <input 
          ref={videoInputRef} 
          type="file" 
          accept="video/*" 
          onChange={handleVideoSelect} 
          className="hidden" 
        />
        <input 
          ref={mobileVideoInputRef} 
          type="file" 
          accept="video/*" 
          capture="user" 
          onChange={handleVideoSelect} 
          className="hidden" 
        />

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-4 bg-darkslate-850">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg border ${
              isEditing ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            }`}>
              {isEditing ? <Edit3 className="w-6 h-6 text-amber-400" /> : (recruit.name ? recruit.name[0] : 'م')}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  {isEditing ? `تعديل ملف: ${editData.name || recruit.name}` : recruit.name}
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {recruit.batch_name}
                </span>
                {isEditing && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    وضع التعديل الشامل
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                الرقم القومي: <span className="font-mono text-slate-200">{isEditing ? editData.national_id : recruit.national_id}</span> • الحضور: {recruit.attendance_date}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                {currentUser?.role !== 'operator' && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-extrabold text-xs shadow-md transition-all"
                    title="تعديل كافة بيانات المجند والصور والفيديو"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>تعديل البيانات والوسائط</span>
                  </button>
                )}

                {/* 1. سجل المتابعات والتحركات الطبية والوقائع */}
                <button
                  type="button"
                  onClick={() => setShowActivityModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600/15 hover:bg-teal-600/25 text-teal-300 border border-teal-500/30 text-xs font-bold transition-all shadow-sm hover:border-teal-400"
                  title="سجل المتابعات والتحركات الطبية والوقائع الميدانية"
                >
                  <Activity className="w-4 h-4 text-teal-400" />
                  <span className="hidden sm:inline">المتابعات والوقائع</span>
                </button>

                {/* 2. الوثائق والمستندات الممسوحة */}
                <button
                  type="button"
                  onClick={() => setShowDocumentsModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600/15 hover:bg-cyan-600/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all shadow-sm hover:border-cyan-400"
                  title="رفع أو مسح وثيقة التعارف، أصل السجل العسكري، وأي مستندات إضافية"
                >
                  <FileCheck className="w-4 h-4 text-cyan-400" />
                  <span className="hidden sm:inline">الوثائق والمستندات</span>
                </button>

                {/* 3. تيكتات وبلاغات الاشتباه */}
                <button
                  type="button"
                  onClick={() => setShowTicketModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all shadow-sm hover:border-rose-400"
                  title="فتح أو متابعة أو حذف تيكتات الاشتباه الجنائي والسياسي"
                >
                  <AlertOctagon className="w-4 h-4 text-rose-400" />
                  <span className="hidden sm:inline">تيكتات الاشتباه</span>
                </button>

                {/* 4. المتابعة النفسية والعصبية */}
                <button
                  type="button"
                  onClick={() => setShowPsychologicalModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all shadow-sm hover:border-purple-400"
                  title="سجل المتابعة النفسية والعصبية للحالات الخاصة"
                >
                  <Brain className="w-4 h-4 text-purple-400" />
                  <span className="hidden sm:inline">متابعة نفسية</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCardPreview(!showCardPreview)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                    showCardPreview
                      ? 'bg-orange-600 text-white border-orange-500 shadow-md'
                      : 'bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border-orange-500/30'
                  }`}
                  title="عرض / إخفاء كارت الدولاب"
                >
                  <IdCard className="w-4 h-4" />
                  <span className="hidden sm:inline">{showCardPreview ? 'إخفاء كارت الدولاب' : 'كارت الدولاب'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onPrint(recruit)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">طباعة الاستمارة</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowHistoryModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-850 hover:bg-slate-750 text-amber-300 border border-slate-700 text-xs font-bold transition-all shadow-sm hover:border-amber-500/40"
                  title="سجل الحركات والتعديلات والعمليات السابقة للمجند"
                >
                  <History className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">سجل الحركات (History)</span>
                </button>

                {(!currentUser || currentUser.role === 'admin') && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`هل أنت متأكد من رغبتك في حذف ملف المجند "${recruit.name}"؟ هذا الإجراء نهائي ولا يمكن التراجع عنه.`)) {
                        onDelete(recruit.id);
                      }
                    }}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700 transition-colors"
                    title="حذف الملف (صلاحية المدير فقط)"
                    aria-label="حذف ملف المجند"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg transition-all"
                  aria-label="حفظ التعديلات"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditData({ ...recruit });
                    setPhotoPreview(recruit.photo_path || null);
                    setVideoPreview(recruit.video_path || null);
                    setNewPhotoFile(null);
                    setNewVideoFile(null);
                    setRemovePhoto(false);
                    setRemoveVideo(false);
                  }}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                  aria-label="إلغاء التعديل"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>إلغاء</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="إغلاق (Esc)"
              aria-label="إغلاق النافذة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {saveError && (
          <div className="mx-6 mt-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{saveError}</span>
          </div>
        )}

        {/* Locker Card Preview Banner */}
        {showCardPreview && !isEditing && (
          <div className="mx-6 mt-4 p-4 bg-slate-950/90 border border-orange-500/40 rounded-2xl flex flex-col items-center gap-3">
            <div className="w-full flex items-center justify-between">
              <span className="text-xs font-bold text-orange-400 flex items-center gap-2">
                <IdCard className="w-4 h-4" />
                معاينة كارت الدولاب الرسمي للمجند
              </span>
              <button
                onClick={handleDownloadCard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تحميل الكارت كصورة PNG</span>
              </button>
            </div>
            <div className="shadow-2xl rounded overflow-hidden">
              <LockerCard ref={cardRef} recruit={recruit} scale={0.85} />
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Media (Photo + 30s Video) */}
          <div className="space-y-4">
            
            {/* Recruit Photo */}
            <div className="bg-darkslate-850 border border-slate-800 rounded-2xl p-3 flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  الصورة الشخصية
                </span>
                <div className="flex items-center gap-2">
                  {photoPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setZoomLevel(1);
                        setEnlargedMedia({
                          type: 'photo',
                          url: photoPreview,
                          title: `الصورة الشخصية - ${editData.name || recruit.name || ''}`
                        });
                      }}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded bg-cyan-950/40 border border-cyan-800/40 hover:bg-cyan-900/50"
                      title="تكبير الصورة الشخصية في نافذة كبيرة"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>تكبير</span>
                    </button>
                  )}
                  {isEditing && photoPreview && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="text-[11px] text-rose-400 hover:text-rose-300 font-bold transition-colors"
                    >
                      حذف الصورة
                    </button>
                  )}
                </div>
              </div>

              <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 border border-slate-700 relative group">
                {photoPreview ? (
                  <>
                    <img
                      src={photoPreview}
                      alt={editData.name || recruit.name}
                      className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                      onClick={() => {
                        setZoomLevel(1);
                        setEnlargedMedia({
                          type: 'photo',
                          url: photoPreview,
                          title: `الصورة الشخصية - ${editData.name || recruit.name || ''}`
                        });
                      }}
                      title="انقر لتكبير الصورة في نافذة كبيرة"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setZoomLevel(1);
                        setEnlargedMedia({
                          type: 'photo',
                          url: photoPreview,
                          title: `الصورة الشخصية - ${editData.name || recruit.name || ''}`
                        });
                      }}
                      className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm border border-white/20 transition-all opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] font-bold shadow-md"
                      title="تكبير الصورة"
                    >
                      <Maximize2 className="w-3 h-3 text-cyan-300" />
                      <span>تكبير</span>
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                    <User className="w-12 h-12 mb-2 stroke-1 text-slate-600" />
                    لا توجد صورة مسجلة
                  </div>
                )}
                {isEditing && newPhotoFile && (
                  <span className="absolute bottom-2 left-2 bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded font-bold">
                    صورة جديدة (لم تُحفظ بعد)
                  </span>
                )}
              </div>

              {/* Photo Edit Controls */}
              {isEditing && (
                <div className="w-full mt-3 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleOpenWebcamPhoto}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                    title="تشغيل كاميرا الويب المباشرة لالتقاط صورة شخصية"
                  >
                    <Camera className="w-4 h-4 text-cyan-200" />
                    <span>التقاط مباشر بكاميرا الويب</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] border border-slate-700 transition-colors"
                      title="اختيار صورة من ملفات الكمبيوتر"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-400" />
                      <span>رفع من الجهاز</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => mobilePhotoInputRef.current?.click()}
                      className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] border border-slate-700 transition-colors"
                      title="فتح كاميرا الموبايل عبر المتصفح"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                      <span>كاميرا الهاتف</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Video Clip */}
            <div className="bg-darkslate-850 border border-slate-800 rounded-2xl p-3 flex flex-col">
              <div className="w-full flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-rose-400" />
                  فيديو الاستمارة والتعرف
                </span>
                <div className="flex items-center gap-2">
                  {videoPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setEnlargedMedia({
                          type: 'video',
                          url: videoPreview,
                          title: `فيديو الاستمارة والتعرف - ${editData.name || recruit.name || ''}`
                        });
                      }}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-800/40 hover:bg-amber-900/50"
                      title="عرض الفيديو في نافذة كبيرة (وضع المسرح)"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>تكبير العرض</span>
                    </button>
                  )}
                  {isEditing && videoPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveVideo}
                      className="text-[11px] text-rose-400 hover:text-rose-300 font-bold transition-colors"
                    >
                      حذف الفيديو
                    </button>
                  )}
                </div>
              </div>

              <div className="w-full aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-700 flex items-center justify-center relative group">
                {videoPreview ? (
                  <>
                    <video
                      src={videoPreview}
                      controls
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setEnlargedMedia({
                          type: 'video',
                          url: videoPreview,
                          title: `فيديو الاستمارة والتعرف - ${editData.name || recruit.name || ''}`
                        });
                      }}
                      className="absolute top-2 left-2 z-10 p-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white backdrop-blur-sm border border-white/20 transition-all opacity-85 hover:opacity-100 flex items-center gap-1 text-[10px] font-bold shadow-lg"
                      title="عرض الفيديو في نافذة كبيرة"
                    >
                      <Maximize2 className="w-3 h-3 text-amber-300" />
                      <span>تكبير</span>
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                    <Video className="w-10 h-10 mb-2 stroke-1 text-slate-600" />
                    لا يوجد مقطع فيديو مسجل
                  </div>
                )}
                {isEditing && newVideoFile && (
                  <span className="absolute bottom-2 left-2 bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded font-bold">
                    فيديو جديد (لم يُحفظ بعد)
                  </span>
                )}
              </div>

              {/* Video Edit Controls */}
              {isEditing && (
                <div className="w-full mt-3 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleOpenWebcamVideo}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                    title="تشغيل كاميرا الويب المباشرة لتسجيل مقطع فيديو للمجند (مفتوح / 30ث استرشادية)"
                  >
                    <Video className="w-4 h-4 text-purple-200" />
                    <span>تسجيل فيديو بكاميرا الويب (مفتوح / 30ث استرشادية)</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] border border-slate-700 transition-colors"
                      title="اختيار مقطع فيديو من ملفات الكمبيوتر"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-400" />
                      <span>رفع من الجهاز</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => mobileVideoInputRef.current?.click()}
                      className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] border border-slate-700 transition-colors"
                      title="تسجيل فيديو بكاميرا الموبايل عبر المتصفح"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                      <span>كاميرا الهاتف</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Full Dossier Fields (2 cols wide) */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* VIEW MODE (READ-ONLY) */}
            {!isEditing ? (
              <>
                {/* 1. البيانات الشخصية والتعليمية */}
                <div className="bg-darkslate-850 border border-slate-800 rounded-2xl p-4">
                  <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                    <User className="w-4 h-4" />
                    البيانات الأساسية والتعليمية
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">رقم الشرطة</span>
                      <span className="font-bold text-orange-400 text-sm font-mono">{recruit.police_number || 'غير مدون'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">السرية</span>
                      <span className="font-bold text-orange-400 text-sm">{recruit.company || 'السرية الأولى ( ١ )'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">القطاع الموزع عليه</span>
                      <span className={`font-bold text-xs px-2 py-0.5 rounded-lg inline-block mt-0.5 ${
                        recruit.distribution_sector 
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' 
                          : 'text-slate-400 bg-slate-800/60'
                      }`}>
                        {recruit.distribution_sector || 'قيد التدريب الأساسي'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">الرقم العسكري</span>
                      <span className="font-bold text-cyan-400 text-sm font-mono">{recruit.military_number || 'غير مدون'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">الديانة</span>
                      <span className="font-bold text-white text-sm">{recruit.religion}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">المؤهل الدراسي</span>
                      <span className="font-bold text-white text-sm">{recruit.qualification}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">تاريخ الميلاد</span>
                      <span className="font-bold text-white text-sm font-mono">{recruit.birth_date}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">الحالة الاجتماعية / الزوجة</span>
                      <span className="font-bold text-white text-sm">{recruit.wife || 'أعزب'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">إجادة القراءة والكتابة</span>
                      <span className="font-bold text-white text-sm">{recruit.literacy}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">السفر خارج البلاد</span>
                      <span className="font-bold text-white text-sm">{recruit.travel_abroad}</span>
                    </div>
                  </div>
                </div>

                {/* 2. السكن والوظائف */}
                <div className="bg-darkslate-850 border border-slate-800 rounded-2xl p-4">
                  <h3 className="text-xs font-bold text-blue-400 flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                    <Home className="w-4 h-4" />
                    عنوان السكن والمهن
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="sm:col-span-3">
                      <span className="text-slate-400 block">عنوان السكن بالتفصيل</span>
                      <span className="font-bold text-white text-sm">{recruit.address}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">المهنة الحالية</span>
                      <span className="font-bold text-white text-sm">{recruit.current_job}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block">مهن وحرف أخرى</span>
                      <span className="font-bold text-white text-sm">{recruit.other_jobs}</span>
                    </div>
                  </div>
                </div>

                {/* 3. المناظرة والفحص الطبي */}
                <div className="bg-darkslate-850 border border-slate-800 rounded-2xl p-4">
                  <h3 className="text-xs font-bold text-amber-400 flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                    <Activity className="w-4 h-4" />
                    المناظرة الأمنية والفحص الطبي
                  </h3>
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <span className="text-slate-400 block">مناظرة المجند (المظهر، البنية، العلامات المميزة، السلوك)</span>
                      <p className="font-semibold text-slate-100 bg-slate-900/80 p-2 rounded-xl mt-1 border border-slate-800">
                        {recruit.inspection}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 block">الحالة المرضية للمجند</span>
                      <p className="font-semibold text-slate-100 bg-slate-900/80 p-2 rounded-xl mt-1 border border-slate-800">
                        {recruit.medical_status}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. بيانات العائلة والتحريات الجنائية والسياسية */}
                <div className="bg-darkslate-850 border border-slate-800 rounded-2xl p-4">
                  <h3 className="text-xs font-bold text-purple-400 flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                    <ShieldAlert className="w-4 h-4" />
                    بيانات الأسرة والفحص الأمني والسياسي
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">اسم الوالد ومهنته</span>
                      <span className="font-bold text-white">{recruit.father_name} ({recruit.father_job})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">اسم الأم ومهنتها</span>
                      <span className="font-bold text-white">{recruit.mother_name} ({recruit.mother_job})</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block">فحص الإخوة والأخوات</span>
                      <p className="font-semibold text-slate-200 bg-slate-900/80 p-2 rounded-xl mt-1 border border-slate-800">
                        {recruit.siblings_check}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block">الحالة الاجتماعية للعائلة</span>
                      <span className="font-bold text-white">{recruit.family_social_status}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block">الحالة السياسية والجنائية العامة للعائلة</span>
                      <p className="font-bold text-emerald-300 bg-emerald-500/10 p-2 rounded-xl mt-1 border border-emerald-500/20">
                        {recruit.family_security_status}
                      </p>
                    </div>

                    {/* موقف الاشتباه الجنائي والسياسي للمجند */}
                    <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                      <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                        <span className="text-slate-400 block text-xs mb-1">موقف الاشتباه الجنائي للمجند:</span>
                        <span className={`inline-block font-black text-xs px-2.5 py-1 rounded-lg ${
                          recruit.criminal_suspicion_status === 'اشتباه' 
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                            : recruit.criminal_suspicion_status === 'جاري الفحص'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {recruit.criminal_suspicion_status || 'لا يوجد اشتباه'}
                        </span>
                        {recruit.criminal_suspicion_details && (
                          <p className="mt-2 text-rose-200 text-xs bg-rose-950/40 p-2 rounded-lg border border-rose-900/50">
                            {recruit.criminal_suspicion_details}
                          </p>
                        )}
                      </div>

                      <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                        <span className="text-slate-400 block text-xs mb-1">موقف الاشتباه السياسي للمجند:</span>
                        <span className={`inline-block font-black text-xs px-2.5 py-1 rounded-lg ${
                          recruit.political_suspicion_status === 'اشتباه' 
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                            : recruit.political_suspicion_status === 'جاري الفحص'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {recruit.political_suspicion_status || 'لا يوجد اشتباه'}
                        </span>
                        {recruit.political_suspicion_details && (
                          <p className="mt-2 text-rose-200 text-xs bg-rose-950/40 p-2 rounded-lg border border-rose-900/50">
                            {recruit.political_suspicion_details}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* EDIT MODE (ACTIVE INPUTS) */
              <div className="space-y-4">
                
                {/* 1. البيانات الأساسية */}
                <div className="bg-darkslate-850 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-2 pb-2 border-b border-slate-800">
                    <User className="w-4 h-4" />
                    البيانات الأساسية والتعليمية
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="sm:col-span-2">
                      <label className="text-slate-400 block mb-1">الاسم الرباعي بالكامل *</label>
                      <input 
                        type="text" 
                        value={editData.name || ''} 
                        onChange={(e) => handleFieldChange('name', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:border-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">السرية / الوحدة الملحق عليها</label>
                      <select
                        value={editData.company || 'السرية الأولى ( ١ )'}
                        onChange={(e) => handleFieldChange('company', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:border-emerald-500 outline-none"
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

                    <div>
                      <label className="text-slate-400 block mb-1">القطاع الموزع عليه (بعد التدريب الأساسي)</label>
                      <select
                        value={editData.distribution_sector || ''}
                        onChange={(e) => handleFieldChange('distribution_sector', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-indigo-300 font-bold focus:border-indigo-500 outline-none"
                      >
                        <option value="">لم يحدد (قيد التدريب الأساسي)</option>
                        <option value="رئاسة المنطقة">رئاسة المنطقة</option>
                        <option value="قطاع أحمد عمارة">قطاع أحمد عمارة</option>
                        <option value="قطاع عمر القاضي">قطاع عمر القاضي</option>
                        <option value="قطاع على خاطر">قطاع على خاطر</option>
                        <option value="قطاع جمال فايق">قطاع جمال فايق</option>
                        <option value="مركز التدريب">مركز التدريب</option>
                        <option value="جهة خارجية">جهة خارجية</option>
                        <option value="عودة">عودة</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">رقم الشرطة (كارت الدولاب)</label>
                      <input 
                        type="text" 
                        value={editData.police_number || ''} 
                        onChange={(e) => handleFieldChange('police_number', e.target.value)}
                        placeholder="مثال: ١٢٤٩"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:border-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">الرقم القومي (14 رقم)</label>
                      <input 
                        type="text" 
                        maxLength={14}
                        value={editData.national_id || ''} 
                        onChange={(e) => handleFieldChange('national_id', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:border-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">تاريخ الميلاد</label>
                      <input 
                        type="date" 
                        value={editData.birth_date || ''} 
                        onChange={(e) => handleFieldChange('birth_date', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">الديانة</label>
                      <select
                        value={editData.religion || 'مسلم'}
                        onChange={(e) => handleFieldChange('religion', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:border-emerald-500 outline-none"
                      >
                        <option value="مسلم">مسلم</option>
                        <option value="مسيحي">مسيحي</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">المؤهل الدراسي</label>
                      <input 
                        type="text" 
                        value={editData.qualification || ''} 
                        onChange={(e) => handleFieldChange('qualification', e.target.value)}
                        placeholder="عالي / متوسط / ..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:border-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">الرقم العسكري</label>
                      <input 
                        type="text" 
                        value={editData.military_number || ''} 
                        onChange={(e) => handleFieldChange('military_number', e.target.value)}
                        placeholder="مثال: 20241012..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-cyan-400 font-mono font-bold focus:border-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">الحالة الاجتماعية / الزوجة</label>
                      <input 
                        type="text" 
                        value={editData.wife || 'أعزب'} 
                        onChange={(e) => handleFieldChange('wife', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">إجادة القراءة والكتابة</label>
                      <input 
                        type="text" 
                        value={editData.literacy || 'يجيد القراءة والكتابة'} 
                        onChange={(e) => handleFieldChange('literacy', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. عنوان السكن والمهن */}
                <div className="bg-darkslate-850 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-blue-400 flex items-center gap-2 pb-2 border-b border-slate-800">
                    <Home className="w-4 h-4" />
                    عنوان السكن والمهن
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="sm:col-span-2">
                      <label className="text-slate-400 block mb-1">عنوان السكن بالتفصيل</label>
                      <input 
                        type="text" 
                        value={editData.address || ''} 
                        onChange={(e) => handleFieldChange('address', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:border-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">المهنة الحالية</label>
                      <input 
                        type="text" 
                        value={editData.current_job || ''} 
                        onChange={(e) => handleFieldChange('current_job', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">مهن وحرف أخرى</label>
                      <input 
                        type="text" 
                        value={editData.other_jobs || ''} 
                        onChange={(e) => handleFieldChange('other_jobs', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-slate-400 block mb-1">السفر خارج البلاد</label>
                      <input 
                        type="text" 
                        value={editData.travel_abroad || ''} 
                        onChange={(e) => handleFieldChange('travel_abroad', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. المناظرة الأمنية والفحص الطبي */}
                <div className="bg-darkslate-850 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-amber-400 flex items-center gap-2 pb-2 border-b border-slate-800">
                    <Activity className="w-4 h-4" />
                    المناظرة الأمنية والفحص الطبي
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">مناظرة المجند (المظهر، البنية، الوشم والعلامات المميزة، السلوك)</label>
                      <textarea 
                        rows={2}
                        value={editData.inspection || ''} 
                        onChange={(e) => handleFieldChange('inspection', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">الحالة المرضية والطبية</label>
                      <textarea 
                        rows={2}
                        value={editData.medical_status || ''} 
                        onChange={(e) => handleFieldChange('medical_status', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. بيانات الأسرة والفحص الأمني والسياسي */}
                <div className="bg-darkslate-850 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-purple-400 flex items-center gap-2 pb-2 border-b border-slate-800">
                    <ShieldAlert className="w-4 h-4" />
                    بيانات الأسرة والفحص الأمني والسياسي
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">اسم الوالد</label>
                      <input 
                        type="text" 
                        value={editData.father_name || ''} 
                        onChange={(e) => handleFieldChange('father_name', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-purple-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">مهنة الوالد</label>
                      <input 
                        type="text" 
                        value={editData.father_job || ''} 
                        onChange={(e) => handleFieldChange('father_job', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-purple-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">اسم الأم</label>
                      <input 
                        type="text" 
                        value={editData.mother_name || ''} 
                        onChange={(e) => handleFieldChange('mother_name', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-purple-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">مهنة الأم</label>
                      <input 
                        type="text" 
                        value={editData.mother_job || ''} 
                        onChange={(e) => handleFieldChange('mother_job', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-purple-500 outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-slate-400 block mb-1">فحص وملاحظات الأشقاء</label>
                      <input 
                        type="text" 
                        value={editData.siblings_check || ''} 
                        onChange={(e) => handleFieldChange('siblings_check', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-purple-500 outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-slate-400 block mb-1">الحالة الاجتماعية للعائلة</label>
                      <input 
                        type="text" 
                        value={editData.family_social_status || ''} 
                        onChange={(e) => handleFieldChange('family_social_status', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-purple-500 outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-slate-400 block mb-1">الحالة الأمنية والسياسية للعائلة</label>
                      <textarea 
                        rows={2}
                        value={editData.family_security_status || ''} 
                        onChange={(e) => handleFieldChange('family_security_status', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-emerald-300 font-bold focus:border-purple-500 outline-none"
                      />
                    </div>

                    {/* موقف الاشتباه الجنائي والسياسي للمجند */}
                    <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800">
                      <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                        <label className="text-slate-300 font-bold block mb-1.5 text-xs">موقف الاشتباه الجنائي للمجند</label>
                        <select
                          value={editData.criminal_suspicion_status || 'لا يوجد اشتباه'}
                          onChange={(e) => handleFieldChange('criminal_suspicion_status', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs focus:border-purple-500 outline-none"
                        >
                          <option value="لا يوجد اشتباه">لا يوجد اشتباه</option>
                          <option value="اشتباه">اشتباه جنائي</option>
                          <option value="جاري الفحص">جاري الفحص</option>
                        </select>
                        {editData.criminal_suspicion_status === 'اشتباه' && (
                          <textarea
                            rows={2}
                            placeholder="تفاصيل وسوابق الاشتباه الجنائي..."
                            value={editData.criminal_suspicion_details || ''}
                            onChange={(e) => handleFieldChange('criminal_suspicion_details', e.target.value)}
                            className="w-full mt-2 bg-slate-950 border border-rose-500/50 rounded-xl p-2 text-rose-200 text-xs focus:border-rose-400 outline-none"
                          />
                        )}
                      </div>

                      <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                        <label className="text-slate-300 font-bold block mb-1.5 text-xs">موقف الاشتباه السياسي للمجند</label>
                        <select
                          value={editData.political_suspicion_status || 'لا يوجد اشتباه'}
                          onChange={(e) => handleFieldChange('political_suspicion_status', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs focus:border-purple-500 outline-none"
                        >
                          <option value="لا يوجد اشتباه">لا يوجد اشتباه</option>
                          <option value="اشتباه">اشتباه سياسي</option>
                          <option value="جاري الفحص">جاري الفحص</option>
                        </select>
                        {editData.political_suspicion_status === 'اشتباه' && (
                          <textarea
                            rows={2}
                            placeholder="تفاصيل وتصنيف الاشتباه السياسي..."
                            value={editData.political_suspicion_details || ''}
                            onChange={(e) => handleFieldChange('political_suspicion_details', e.target.value)}
                            className="w-full mt-2 bg-slate-950 border border-rose-500/50 rounded-xl p-2 text-rose-200 text-xs focus:border-rose-400 outline-none"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Save Action Bar */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                  >
                    إلغاء التعديل
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-xl transition-all"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>{saving ? 'جاري حفظ كافة التعديلات...' : 'اعتماد وحفظ كافة التعديلات والوسائط'}</span>
                  </button>
                </div>

              </div>
            )}

          </div>

        </div>

      </div>

      {/* Recruit History Modal */}
      {showHistoryModal && (
        <RecruitHistoryModal
          recruit={recruit}
          onClose={() => setShowHistoryModal(false)}
        />
      )}

      {/* Activity Log Modal (المتابعات والوقائع والتحركات الطبية) */}
      {showActivityModal && (
        <ActivityLogModal
          recruit={recruit}
          onClose={() => setShowActivityModal(false)}
          onRefreshRecruits={() => onUpdate?.(recruit)}
        />
      )}

      {/* Recruit Documents Modal (المستندات والوثائق الممسوحة) */}
      {showDocumentsModal && (
        <RecruitDocumentsModal
          recruit={recruit}
          onClose={() => setShowDocumentsModal(false)}
          onRefreshRecruits={() => onUpdate?.(recruit)}
        />
      )}

      {/* Ticket Modal (تيكتات وبلاغات الاشتباه) */}
      {showTicketModal && (
        <TicketModal
          isOpen={showTicketModal}
          recruit={recruit}
          onClose={() => setShowTicketModal(false)}
          onTicketChanged={() => onUpdate?.(recruit)}
        />
      )}

      {/* Psychological Followup Modal (المتابعة النفسية) */}
      {showPsychologicalModal && (
        <PsychologicalFollowupModal
          isOpen={showPsychologicalModal}
          recruit={recruit}
          onClose={() => setShowPsychologicalModal(false)}
          onUpdated={() => onUpdate?.(recruit)}
        />
      )}

      {/* Webcam Capture Modal (التقاط الصور وتسجيل الفيديو المباشر بكاميرا الويب) */}
      <WebcamCaptureModal
        isOpen={webcamModalConfig.isOpen}
        mode={webcamModalConfig.mode}
        onCapture={handleWebcamCapture}
        onClose={() => setWebcamModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />
      {/* Enlarged Media Modal (تكبير الصورة والفيديو في نافذة كبيرة مسرحية) */}
      {enlargedMedia && (
        <div 
          className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setEnlargedMedia(null)}
        >
          <div 
            className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-slate-900/95 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80">
              <div className="flex items-center gap-2.5">
                {enlargedMedia.type === 'photo' ? (
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Camera className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <Video className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">
                    {enlargedMedia.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    رقم الشرطة: <span className="font-mono text-cyan-400 font-bold">{editData.military_number || recruit.military_number || 'غير محدد'}</span>
                    {' • '}
                    السرية: <span className="text-slate-300 font-medium">{editData.company || recruit.company || 'غير محدد'}</span>
                  </p>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-2">
                {enlargedMedia.type === 'photo' && (
                  <div className="flex items-center bg-slate-800/80 rounded-xl border border-slate-700 p-0.5 ml-2">
                    <button
                      type="button"
                      onClick={() => setZoomLevel(prev => Math.min(Number((prev + 0.25).toFixed(2)), 3))}
                      className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                      title="تكبير (Zoom In)"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <span className="px-2 text-[11px] font-mono text-cyan-400 font-bold min-w-[42px] text-center">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(prev => Math.max(Number((prev - 0.25).toFixed(2)), 0.5))}
                      className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                      title="تصغير (Zoom Out)"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(1)}
                      className="px-2 py-1 text-[10px] text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors font-bold border-r border-slate-700/60"
                      title="إعادة ضبط الحجم الطبيعي 100%"
                    >
                      100%
                    </button>
                  </div>
                )}

                <a
                  href={enlargedMedia.url}
                  download={enlargedMedia.type === 'photo' ? `photo_${recruit.military_number || recruit.id}.jpg` : `video_${recruit.military_number || recruit.id}.webm`}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                  title="تحميل الملف إلى جهازك"
                >
                  <Download className="w-4 h-4" />
                </a>

                <button
                  type="button"
                  onClick={() => setEnlargedMedia(null)}
                  className="p-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 hover:text-rose-100 border border-rose-500/30 transition-colors"
                  title="إغلاق النافذة (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Media Canvas */}
            <div className="flex-1 flex items-center justify-center p-4 bg-black/75 overflow-auto min-h-[380px] max-h-[75vh]">
              {enlargedMedia.type === 'photo' ? (
                <div className="overflow-auto max-w-full max-h-full flex items-center justify-center">
                  <img
                    src={enlargedMedia.url}
                    alt="صورة مكبرة للمجند"
                    style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                    className="max-h-[70vh] max-w-[85vw] object-contain rounded-xl shadow-2xl transition-transform duration-150 border border-slate-800 select-none"
                  />
                </div>
              ) : (
                <div className="w-full max-w-4xl aspect-video rounded-xl overflow-hidden bg-black shadow-2xl border border-slate-800 flex items-center justify-center">
                  <video
                    src={enlargedMedia.url}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
            </div>

            {/* Footer Bar */}
            <div className="px-4 py-2.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                {enlargedMedia.type === 'photo' ? (
                  <>
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>عرض عالي الدقة • استخدم أزرار التكبير لفحص الملامح والسمات الشخصية</span>
                  </>
                ) : (
                  <>
                    <span className="inline-block w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
                    <span>وضع المسرح الكبير • يمكنك تفعيل ملء الشاشة أو التحكم بسرعة التشغيل</span>
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={() => setEnlargedMedia(null)}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] border border-slate-700 transition-colors"
              >
                إغلاق (Esc)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
