import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Video, 
  Check, 
  RotateCcw, 
  Play, 
  Square, 
  CircleDot, 
  Sparkles, 
  Upload, 
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  Loader2
} from 'lucide-react';

export default function MediaCapture({ formData, onSaveSuccess, onBack, onCancel }) {
  // Stages: 'photo' | 'video' | 'review' | 'saving'
  const [stage, setStage] = useState('photo');

  // Media streams & recordings
  const videoRef = useRef(null);
  const playbackRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // Captured assets
  const [capturedPhoto, setCapturedPhoto] = useState(null); // base64 or blob
  const [capturedVideoBlob, setCapturedVideoBlob] = useState(null);
  const [capturedVideoUrl, setCapturedVideoUrl] = useState(null);

  // Video recording state
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const timerIntervalRef = useRef(null);

  // Status & error
  const [cameraError, setCameraError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize camera stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('لم نتمكن من الوصول للويب كام أو الميكروفون. يرجى التأكد من توصيل الكاميرا.');
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      // Clean up stream tracks and intervals on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // Ensure video element plays stream when switching back to camera
  useEffect(() => {
    if (videoRef.current && streamRef.current && (stage === 'photo' && !capturedPhoto || stage === 'video' && !capturedVideoBlob)) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [stage, capturedPhoto, capturedVideoBlob]);

  // Capture photo snapshot from live video
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const base64Image = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedPhoto(base64Image);
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
  };

  const confirmPhotoAndProceedToVideo = () => {
    setStage('video');
  };

  // Start 30-second video recording
  const startVideoRecording = () => {
    if (!streamRef.current) return;

    recordedChunksRef.current = [];
    let mimeType = 'video/webm;codecs=vp8,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }

    try {
      const recorder = new MediaRecorder(streamRef.current, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        setCapturedVideoBlob(blob);
        const url = URL.createObjectURL(blob);
        setCapturedVideoUrl(url);
        setIsRecording(false);
      };

      recorder.start(500); // 500ms slices
      setIsRecording(true);
      setCountdown(30);

      // Countdown timer 30 seconds
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      let currentSeconds = 30;
      timerIntervalRef.current = setInterval(() => {
        currentSeconds -= 1;
        setCountdown(currentSeconds);

        if (currentSeconds <= 0) {
          clearInterval(timerIntervalRef.current);
          stopVideoRecording();
        }
      }, 1000);

    } catch (err) {
      console.error('Error starting video recording:', err);
      setSaveError('حدث خطأ أثناء بدء تسجيل الفيديو: ' + err.message);
    }
  };

  // Stop video recording
  const stopVideoRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const retakeVideo = () => {
    if (capturedVideoUrl) {
      URL.revokeObjectURL(capturedVideoUrl);
    }
    setCapturedVideoBlob(null);
    setCapturedVideoUrl(null);
    setCountdown(30);
  };

  // Final Submit to Backend API
  const handleFinalSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const submitData = new FormData();

      // Append all form fields
      Object.keys(formData).forEach((key) => {
        submitData.append(key, formData[key]);
      });

      // Append Photo (either file blob or base64)
      if (capturedPhoto) {
        // Convert base64 to blob
        const res = await fetch(capturedPhoto);
        const photoBlob = await res.blob();
        submitData.append('photo', photoBlob, `photo_${formData.national_id || Date.now()}.jpg`);
      }

      // Append Video Blob
      if (capturedVideoBlob) {
        submitData.append('video', capturedVideoBlob, `video_${formData.national_id || Date.now()}.webm`);
      }

      const response = await fetch('/api/recruits', {
        method: 'POST',
        body: submitData
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'فشل حفظ بيانات المجند في السيرفر');
      }

      const savedRecruit = await response.json();

      // Stop camera tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      onSaveSuccess(savedRecruit);
    } catch (error) {
      console.error('Save error:', error);
      setSaveError('خطأ أثناء حفظ الملف: ' + error.message);
      setIsSaving(false);
    }
  };

  // File fallback upload for photo/video if no camera is available
  const handlePhotoFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setCapturedPhoto(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleVideoFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCapturedVideoBlob(file);
      setCapturedVideoUrl(URL.createObjectURL(file));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-darkslate-950 flex flex-col justify-between p-6 sm:p-8 select-none overflow-y-auto">
      
      {/* Header */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <span className="text-xs font-bold text-emerald-400">
            محطة الوسائط الرقمية (استوديو التسجيل المباشر)
          </span>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            مجند: <span className="text-emerald-300">{formData.name}</span>
          </h2>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${
            stage === 'photo' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
          }`}>
            <Camera className="w-3.5 h-3.5" />
            <span>1. الصورة الشخصية</span>
          </div>

          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${
            stage === 'video' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
          }`}>
            <Video className="w-3.5 h-3.5" />
            <span>2. فيديو 30 ثانية</span>
          </div>
        </div>
      </div>

      {/* Main Studio Viewport */}
      <div className="max-w-3xl w-full mx-auto my-auto py-4 flex flex-col items-center">
        
        {cameraError && (
          <div className="w-full mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 text-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <span>{cameraError}</span>
            </div>
            <button 
              onClick={startCamera}
              className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-lg text-xs font-bold"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {saveError && (
          <div className="w-full mb-4 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STAGE 1: PHOTO CAPTURE */}
        {/* ------------------------------------------------------------- */}
        {stage === 'photo' && (
          <div className="w-full flex flex-col items-center">
            <div className="relative w-full max-w-lg aspect-[4/3] bg-slate-900 rounded-3xl overflow-hidden border-2 border-slate-700 shadow-2xl">
              
              {!capturedPhoto ? (
                <>
                  {/* Live Video Feed */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]" // Mirror effect for natural webcam experience
                  />

                  {/* Face Guide Oval Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-64 border-2 border-dashed border-emerald-400/70 rounded-[50%] shadow-[0_0_50px_rgba(16,185,129,0.2)] flex flex-col items-center justify-between py-6">
                      <span className="text-[10px] font-bold text-emerald-300 bg-darkslate-950/80 px-2 py-0.5 rounded-full">
                        مستوى العينين
                      </span>
                      <span className="text-[10px] font-bold text-emerald-300 bg-darkslate-950/80 px-2 py-0.5 rounded-full">
                        مستوى الذقن
                      </span>
                    </div>
                  </div>

                  <div className="absolute top-3 right-3 bg-darkslate-950/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-slate-300 border border-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    كاميرا مباشرة
                  </div>
                </>
              ) : (
                /* Captured Photo Preview */
                <div className="relative w-full h-full">
                  <img
                    src={capturedPhoto}
                    alt="صورة المجند"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 left-3 bg-emerald-600/90 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    تم التقاط الصورة بنجاح
                  </div>
                </div>
              )}
            </div>

            {/* Photo Action Buttons */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              {!capturedPhoto ? (
                <>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-base shadow-xl shadow-emerald-950/60 transform hover:scale-105 active:scale-95 transition-all"
                  >
                    <Camera className="w-6 h-6" />
                    <span>التقاط الصورة الشخصية (Space)</span>
                  </button>

                  <label className="flex items-center gap-2 px-4 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 cursor-pointer transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>رفع صورة من الجهاز</span>
                    <input type="file" accept="image/*" onChange={handlePhotoFileUpload} className="hidden" />
                  </label>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={retakePhoto}
                    className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm border border-slate-700 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>إعادة الالتقاط</span>
                  </button>

                  <button
                    type="button"
                    onClick={confirmPhotoAndProceedToVideo}
                    className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-950/60 transition-all"
                  >
                    <span>اعتماد الصورة والانتقال للفيديو</span>
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STAGE 2: 30-SECOND VIDEO RECORDING */}
        {/* ------------------------------------------------------------- */}
        {stage === 'video' && (
          <div className="w-full flex flex-col items-center">
            <div className="relative w-full max-w-xl aspect-video bg-slate-900 rounded-3xl overflow-hidden border-2 border-slate-700 shadow-2xl">
              
              {!capturedVideoUrl ? (
                <>
                  {/* Live Video Feed for recording */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />

                  {/* Recording Status & 30s Countdown Display */}
                  {isRecording && (
                    <div className="absolute top-4 inset-x-0 flex items-center justify-between px-6">
                      <div className="flex items-center gap-2 bg-rose-600/90 text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-lg animate-pulse">
                        <CircleDot className="w-4 h-4 text-white" />
                        <span>جاري التسجيل المباشر</span>
                      </div>

                      {/* Prominent Circular Countdown */}
                      <div className="flex items-center gap-2 bg-darkslate-950/90 border border-slate-700 px-4 py-2 rounded-2xl shadow-xl">
                        <span className="text-2xl font-black text-rose-400 font-mono">
                          {countdown < 10 ? `0${countdown}` : countdown}
                        </span>
                        <span className="text-xs text-slate-400 font-bold">ثانية متبقية</span>
                      </div>
                    </div>
                  )}

                  {/* Guidance Instructions overlay */}
                  {!isRecording && (
                    <div className="absolute inset-0 bg-darkslate-950/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 border border-emerald-500/30">
                        <Video className="w-7 h-7" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-1">
                        تسجيل مقطع الفيديو المرفق (30 ثانية)
                      </h3>
                      <p className="text-slate-300 text-xs sm:text-sm max-w-md leading-relaxed">
                        قم بتوجيه المجند للتحدث بصوت واضح: <br />
                        <span className="text-emerald-300 font-bold">
                          "اذكر اسمك الرباعي، مؤهلك الدراسي، ومحل إقامتك بالتفصيل"
                        </span>
                      </p>
                    </div>
                  )}
                </>
              ) : (
                /* Video Playback Review */
                <video
                  ref={playbackRef}
                  src={capturedVideoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain bg-black"
                />
              )}
            </div>

            {/* Video Action Buttons */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              {!capturedVideoUrl ? (
                <>
                  {!isRecording ? (
                    <>
                      <button
                        type="button"
                        onClick={startVideoRecording}
                        className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-extrabold text-base shadow-xl shadow-rose-950/60 transform hover:scale-105 active:scale-95 transition-all"
                      >
                        <CircleDot className="w-5 h-5 text-white" />
                        <span>بدء تسجيل الفيديو (30 ثانية)</span>
                      </button>

                      <label className="flex items-center gap-2 px-4 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 cursor-pointer transition-colors">
                        <Upload className="w-4 h-4" />
                        <span>رفع فيديو من الجهاز</span>
                        <input type="file" accept="video/*" onChange={handleVideoFileUpload} className="hidden" />
                      </label>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={stopVideoRecording}
                      className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-sm border-2 border-rose-500 shadow-xl transition-all"
                    >
                      <Square className="w-5 h-5 text-rose-400 fill-rose-400" />
                      <span>إنهاء التسجيل الآن ({countdown} ث)</span>
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={retakeVideo}
                    className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm border border-slate-700 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>إعادة التسجيل</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFinalSave}
                    disabled={isSaving}
                    className="flex items-center gap-3 px-10 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-base shadow-2xl shadow-emerald-950/80 transform hover:scale-105 active:scale-95 transition-all"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>جاري حفظ واعتماد الملف...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-6 h-6 text-white" />
                        <span>حفظ واعتماد ملف المجند نهائياً</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Footer Navigation */}
      <div className="max-w-4xl w-full mx-auto pt-4 border-t border-slate-800 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            if (stage === 'video') setStage('photo');
            else onBack();
          }}
          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
        >
          رجوع
        </button>

        <button
          type="button"
          onClick={handleFinalSave}
          disabled={isSaving}
          className="text-xs text-slate-400 hover:text-slate-200 underline"
        >
          حفظ الملف بدون فيديو (في حالة عدم توفر كاميرا)
        </button>
      </div>

    </div>
  );
}
