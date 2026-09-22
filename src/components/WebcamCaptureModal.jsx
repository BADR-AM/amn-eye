import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Camera, 
  Video, 
  RotateCcw, 
  Check, 
  Sparkles, 
  SwitchCamera, 
  AlertTriangle, 
  Square, 
  CircleDot, 
  Volume2, 
  VolumeX, 
  Smartphone, 
  Upload 
} from 'lucide-react';

export default function WebcamCaptureModal({
  isOpen,
  mode = 'photo', // 'photo' | 'video'
  onCapture,      // (file: File, previewUrl: string) => void
  onClose,
  onFallbackMobileCapture // optional callback if user wants to use mobile input
}) {
  const [stage, setStage] = useState('live'); // 'live' | 'preview'
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [cameraError, setCameraError] = useState(null);
  const [hasAudio, setHasAudio] = useState(true);

  // Photo captured
  const [capturedPhotoDataUrl, setCapturedPhotoDataUrl] = useState(null);
  const [capturedPhotoBlob, setCapturedPhotoBlob] = useState(null);
  const [isFlashing, setIsFlashing] = useState(false);

  // Video recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(30);
  const [capturedVideoBlob, setCapturedVideoBlob] = useState(null);
  const [capturedVideoUrl, setCapturedVideoUrl] = useState(null);

  const videoRef = useRef(null);
  const playbackRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const fallbackFileInputRef = useRef(null);

  // Cross-browser supported MIME type detection
  const getSupportedVideoMime = () => {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/mp4;codecs=avc1',
      'video/mp4',
      'video/quicktime'
    ];
    for (const t of candidates) {
      if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return '';
  };

  // Stop active camera stream tracks
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  // Start Camera Stream
  const startCamera = async (targetDeviceId = null) => {
    setCameraError(null);
    stopStream();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('المتصفح في بيئة التشغيل الحالية لا يدعم البث المباشر للويب كام. يمكنك استخدام زر رفع الملف أو كاميرا الهاتف.');
      return;
    }

    try {
      // 1. Enumerate available video input devices
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = allDevices.filter((d) => d.kind === 'videoinput');
        setDevices(videoDevs);
        if (!targetDeviceId && videoDevs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevs[0].deviceId);
        }
      } catch (enumErr) {
        console.warn('Failed to enumerate devices:', enumErr);
      }

      const activeDeviceId = targetDeviceId || selectedDeviceId || undefined;
      const videoConstraints = {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        ...(activeDeviceId ? { deviceId: { exact: activeDeviceId } } : { facingMode: 'user' })
      };

      let stream = null;
      if (mode === 'video') {
        // Try audio + video
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraints,
            audio: true
          });
          setHasAudio(true);
        } catch (audioErr) {
          console.warn('Microphone failed or not granted, falling back to video only:', audioErr);
          stream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraints,
            audio: false
          });
          setHasAudio(false);
        }
      } else {
        // Photo mode: video only
        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('تم رفض إذن الوصول للكاميرا. يرجى السماح للمتصفح بالوصول لكاميرا الويب.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('لم يتم العثور على كاميرا ويب متصلة بالجهاز. يرجى توصيل كاميرا الويب والتأكد من تعريفها.');
      } else {
        setCameraError('تعذر تشغيل كاميرا الويب المباشرة. يمكنك استخدام خيار كاميرا الهاتف أو رفع ملف من الكمبيوتر.');
      }
    }
  };

  // Switch to next available camera
  const handleSwitchCamera = () => {
    if (devices.length <= 1) return;
    const currentIndex = devices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDevice = devices[nextIndex];
    setSelectedDeviceId(nextDevice.deviceId);
    startCamera(nextDevice.deviceId);
  };

  // Initialize or re-initialize on open / mode change
  useEffect(() => {
    if (isOpen) {
      setStage('live');
      setCapturedPhotoDataUrl(null);
      setCapturedPhotoBlob(null);
      setCapturedVideoBlob(null);
      setCapturedVideoUrl(null);
      setIsRecording(false);
      setRecordingSeconds(30);
      startCamera();
    } else {
      stopStream();
      if (capturedVideoUrl && capturedVideoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(capturedVideoUrl);
      }
    }
    return () => {
      stopStream();
      if (capturedVideoUrl && capturedVideoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(capturedVideoUrl);
      }
    };
  }, [isOpen, mode]);

  // Capture Photo Handler
  const handleSnapPhoto = () => {
    if (!videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    
    // Flash effect
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedPhotoBlob(blob);
        setCapturedPhotoDataUrl(dataUrl);
        setStage('preview');
        stopStream();
      }
    }, 'image/jpeg', 0.95);
  };

  // Start Video Recording
  const handleStartVideoRecording = () => {
    if (!streamRef.current) return;
    recordedChunksRef.current = [];

    const mimeType = getSupportedVideoMime();
    const options = mimeType ? { mimeType } : undefined;

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalMime = mimeType || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: finalMime });
        const videoUrl = URL.createObjectURL(blob);
        setCapturedVideoBlob(blob);
        setCapturedVideoUrl(videoUrl);
        setStage('preview');
        stopStream();
      };

      mediaRecorder.start(250); // Record in 250ms slices
      setIsRecording(true);
      setRecordingSeconds(30);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev <= 1) {
            handleStopVideoRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (recErr) {
      console.error('MediaRecorder error:', recErr);
      setCameraError('فشل بدء تسجيل الفيديو في هذا المتصفح.');
    }
  };

  // Stop Video Recording
  const handleStopVideoRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Retake Handler
  const handleRetake = () => {
    setStage('live');
    setCapturedPhotoDataUrl(null);
    setCapturedPhotoBlob(null);
    if (capturedVideoUrl && capturedVideoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(capturedVideoUrl);
    }
    setCapturedVideoBlob(null);
    setCapturedVideoUrl(null);
    setRecordingSeconds(30);
    startCamera(selectedDeviceId);
  };

  // Confirm and save to parent
  const handleConfirm = () => {
    if (mode === 'photo' && capturedPhotoBlob) {
      const file = new File([capturedPhotoBlob], `webcam_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
      onCapture(file, capturedPhotoDataUrl);
      onClose();
    } else if (mode === 'video' && capturedVideoBlob) {
      const mime = capturedVideoBlob.type || 'video/webm';
      const ext = mime.includes('mp4') ? 'mp4' : 'webm';
      const file = new File([capturedVideoBlob], `webcam_video_${Date.now()}.${ext}`, { type: mime });
      onCapture(file, capturedVideoUrl);
      onClose();
    }
  };

  // Fallback file selection
  const handleFallbackFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (mode === 'photo') {
        const reader = new FileReader();
        reader.onload = () => {
          onCapture(file, reader.result);
          onClose();
        };
        reader.readAsDataURL(file);
      } else {
        const url = URL.createObjectURL(file);
        onCapture(file, url);
        onClose();
      }
    }
  };

  // Keyboard shortcut: Spacebar to capture or toggle recording; Escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        if (isRecording) {
          handleStopVideoRecording();
        } else {
          onClose();
        }
      } else if (e.code === 'Space' && stage === 'live') {
        e.preventDefault();
        if (mode === 'photo') {
          handleSnapPhoto();
        } else if (mode === 'video') {
          if (!isRecording) {
            handleStartVideoRecording();
          } else {
            handleStopVideoRecording();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, stage, mode, isRecording]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150" dir="rtl">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col shadow-2xl relative">
        
        {/* Flash effect overlay */}
        {isFlashing && (
          <div className="absolute inset-0 bg-white z-50 pointer-events-none animate-out fade-out duration-200" />
        )}

        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              mode === 'photo' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
            }`}>
              {mode === 'photo' ? <Camera className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {mode === 'photo' ? 'التقاط الصورة الشخصية بكاميرا الويب' : 'تسجيل مقطع الفيديو بكاميرا الويب'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {mode === 'photo' ? 'اضغط زر الالتقاط أو زر مسافة (Space) لحفظ الصورة' : 'مدة المقطع 30 ثانية كحد أقصى للتحقق الأمني'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Camera Switcher */}
            {stage === 'live' && devices.length > 1 && (
              <button
                type="button"
                onClick={handleSwitchCamera}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors"
                title="تبديل كاميرا الويب"
              >
                <SwitchCamera className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">تبديل الكاميرا</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="إغلاق (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewfinder / Preview Screen */}
        <div className="p-4 flex flex-col items-center justify-center bg-slate-950">
          <div className="relative w-full aspect-[4/3] sm:aspect-video max-h-[420px] rounded-2xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center">
            
            {/* Live Camera Viewfinder */}
            {stage === 'live' && (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Face Target Framing Guide for Photo */}
                {mode === 'photo' && !cameraError && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-44 h-56 sm:w-56 sm:h-72 border-2 border-dashed border-emerald-400/60 rounded-[50px] flex items-center justify-center shadow-inner">
                      <span className="text-[10px] text-emerald-300/80 font-bold bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-xs">
                        وجّه وجه المجند هنا
                      </span>
                    </div>
                  </div>
                )}

                {/* Recording Badge & Timer Overlay for Video */}
                {mode === 'video' && isRecording && (
                  <div className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1.5 bg-rose-600/90 text-white font-mono font-bold text-xs rounded-full shadow-lg backdrop-blur-sm animate-pulse">
                    <span className="w-2.5 h-2.5 rounded-full bg-white"></span>
                    <span>جارٍ التسجيل: 00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}</span>
                  </div>
                )}

                {/* Audio Status for Video */}
                {mode === 'video' && !isRecording && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/80 border border-slate-700 text-[11px] rounded-lg text-slate-300">
                    {hasAudio ? (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>الميكروفون متصل</span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-amber-300">بدون ميكروفون</span>
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Photo Captured Preview */}
            {stage === 'preview' && mode === 'photo' && capturedPhotoDataUrl && (
              <img
                src={capturedPhotoDataUrl}
                alt="معاينة الصورة الملتقطة"
                className="w-full h-full object-contain bg-black"
              />
            )}

            {/* Video Recorded Preview */}
            {stage === 'preview' && mode === 'video' && capturedVideoUrl && (
              <video
                ref={playbackRef}
                src={capturedVideoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain bg-black"
              />
            )}

            {/* Camera Error Display */}
            {cameraError && (
              <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
                <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center text-xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="max-w-md">
                  <h4 className="text-sm font-bold text-white mb-1">تعذر تشغيل كاميرا الويب</h4>
                  <p className="text-xs text-rose-300 leading-relaxed">{cameraError}</p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => startCamera(selectedDeviceId)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    إعادة المحاولة
                  </button>
                  <button
                    type="button"
                    onClick={() => fallbackFileInputRef.current?.click()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>رفع ملف من الكمبيوتر بدلاً من ذلك</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Controls Footer */}
        <div className="px-5 py-4 bg-slate-850 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Left / Secondary Action: File upload fallback */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              ref={fallbackFileInputRef}
              type="file"
              accept={mode === 'photo' ? 'image/*' : 'video/*'}
              className="hidden"
              onChange={handleFallbackFileSelect}
            />
            <button
              type="button"
              onClick={() => fallbackFileInputRef.current?.click()}
              className="w-full sm:w-auto px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-750 transition-colors"
              title="اختيار ملف من الجهاز"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>رفع ملف من الجهاز</span>
            </button>
          </div>

          {/* Right / Main Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {stage === 'live' ? (
              <>
                {mode === 'photo' ? (
                  <button
                    type="button"
                    onClick={handleSnapPhoto}
                    disabled={!!cameraError}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <Camera className="w-4 h-4 text-cyan-200" />
                    <span>التقاط الصورة الآن</span>
                  </button>
                ) : (
                  !isRecording ? (
                    <button
                      type="button"
                      onClick={handleStartVideoRecording}
                      disabled={!!cameraError}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <CircleDot className="w-4 h-4 text-rose-300 animate-pulse" />
                      <span>بدء تسجيل الفيديو (30 ثانية)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStopVideoRecording}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <Square className="w-4 h-4 fill-white" />
                      <span>إنهاء وحفظ التسجيل</span>
                    </button>
                  )
                )}
              </>
            ) : (
              /* Preview Stage Buttons */
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>إعادة {mode === 'photo' ? 'الالتقاط' : 'التسجيل'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirm}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>اعتماد واستخدام {mode === 'photo' ? 'الصورة' : 'الفيديو'}</span>
                </button>
              </>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
