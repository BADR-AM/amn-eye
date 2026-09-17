import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { Camera, RefreshCw, X, AlertCircle, Volume2, VolumeX, SwitchCamera, Upload, Image as ImageIcon } from 'lucide-react';

// Play crisp tactical confirmation beep via Web Audio API
const playScanChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1); // E6

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    // AudioContext autoplay restrictions or disabled audio
  }
};

export default function CameraQrScanner({ 
  onScan, 
  onClose, 
  title = "مسح بطاقة الهوية الذكية (QR Code)",
  instruction = "وجّه كود الـ QR الخاص بالبطاقة نحو منتصف الكاميرا للتحقق الفوري"
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameId = useRef(null);
  const fileInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scannedSuccess, setScannedSuccess] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Enumerate cameras
  useEffect(() => {
    const getDevices = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
          setError('الكاميرا غير مدعومة في هذا المتصفح أو بيئة التشغيل');
          setLoading(false);
          return;
        }

        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = allDevices.filter(d => d.kind === 'videoinput');
        setDevices(videoInputs);

        if (videoInputs.length > 0) {
          // Prefer back camera if mobile, or first device
          const backCam = videoInputs.find(d => /back|rear|environment/i.test(d.label));
          setSelectedDeviceId(backCam ? backCam.deviceId : videoInputs[0].deviceId);
        }
      } catch (err) {
        console.error('Error enumerating cameras:', err);
      }
    };
    getDevices();
  }, []);

  // Start / restart camera stream
  useEffect(() => {
    let isMounted = true;

    const startCamera = async () => {
      setLoading(true);
      setError('');
      stopCamera();

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setLoading(false);
          // Over HTTP on mobile, getUserMedia is disabled by browser security.
          // Native file capture buttons below handle scanning smoothly!
          return;
        }

        let stream = null;
        try {
          const constraints = {
            video: selectedDeviceId 
              ? { deviceId: { exact: selectedDeviceId } }
              : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
          };
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (specErr) {
          console.warn('Exact constraints failed, falling back to basic video:', specErr);
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }

        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS/Safari
          videoRef.current.muted = true;
          await videoRef.current.play();
        }

        setLoading(false);
        startScanning();
      } catch (err) {
        if (!isMounted) return;
        console.warn('Camera stream error:', err);
        setLoading(false);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('تم رفض إذن الوصول للكاميرا المباشرة. يمكنك استخدام زر فتح كاميرا الهاتف بالأسفل.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('لم يتم العثور على كاميرا متصلة. يمكنك استخدام زر فتح كاميرا الهاتف بالأسفل.');
        } else {
          setError(`تعذر فتح الكاميرا المباشرة. استخدم زر كاميرا الهاتف بالأسفل.`);
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [selectedDeviceId]);

  // Decode QR code from uploaded image or direct mobile camera snapshot
  const handleImageFileScan = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: 'attemptBoth'
        });

        setLoading(false);

        if (code && code.data && code.data.trim()) {
          if (soundEnabled) playScanChime();
          setScannedSuccess(true);
          setTimeout(() => {
            stopCamera();
            onScan(code.data.trim());
          }, 350);
        } else {
          setError('لم يتم العثور على كود QR واضح في الصورة الملتقطة. يرجى التقاط صورة قريبة وواضحة للكود وإعادة المحاولة.');
        }
      };
      img.onerror = () => {
        setLoading(false);
        setError('تعذر معالجة الصورة الملتقطة.');
      };
      img.src = reader.result;
    };
    reader.onerror = () => {
      setLoading(false);
      setError('تعذر قراءة ملف الصورة.');
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  const stopCamera = () => {
    if (animFrameId.current) {
      cancelAnimationFrame(animFrameId.current);
      animFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  // Frame processing loop
  const startScanning = () => {
    const scanFrame = () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        animFrameId.current = requestAnimationFrame(scanFrame);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement('canvas');
      canvasRef.current = canvas;

      if (video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // Fast QR decoding with jsQR
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth'
          });

          if (code && code.data && code.data.trim()) {
            setScannedSuccess(true);
            if (soundEnabled) {
              playScanChime();
            }

            // Small delay for tactical scan animation feedback
            setTimeout(() => {
              stopCamera();
              if (onScan) {
                onScan(code.data.trim());
              }
            }, 300);
            return; // Stop scan loop
          }
        }
      }

      animFrameId.current = requestAnimationFrame(scanFrame);
    };

    animFrameId.current = requestAnimationFrame(scanFrame);
  };

  return (
    <div className="relative w-full flex flex-col items-center bg-[#0d1117] border border-blue-500/30 rounded-2xl overflow-hidden shadow-2xl p-4 animate-fade-in" dir="rtl">
      
      {/* Top Bar with Camera Controls */}
      <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-[#30363d] text-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">{title}</h4>
            <span className="text-[10px] text-gray-400 font-mono">JSQR OPTICAL SCANNER</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-lg border transition-colors ${
              soundEnabled 
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                : 'bg-gray-800 border-gray-700 text-gray-400'
            }`}
            title={soundEnabled ? 'كتم الصوت' : 'تفعيل صوت التأكيد'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Camera Switcher if multiple devices */}
          {devices.length > 1 && (
            <button
              type="button"
              onClick={() => {
                const currentIndex = devices.findIndex(d => d.deviceId === selectedDeviceId);
                const nextIndex = (currentIndex + 1) % devices.length;
                setSelectedDeviceId(devices[nextIndex].deviceId);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#21262d] border border-[#30363d] text-gray-300 hover:text-white text-[11px] transition-colors"
              title="تبديل الكاميرا"
            >
              <SwitchCamera className="w-3.5 h-3.5 text-blue-400" />
              <span>كاميرا {devices.findIndex(d => d.deviceId === selectedDeviceId) + 1}/{devices.length}</span>
            </button>
          )}

          {/* Close button if modal */}
          {onClose && (
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              title="إلغاء المسح"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Viewfinder Window */}
      <div className="relative w-full aspect-[4/3] max-h-[340px] bg-black rounded-xl overflow-hidden flex items-center justify-center border border-[#30363d]">
        
        {/* Video Element */}
        <video
          ref={videoRef}
          className={`w-full h-full object-cover transition-opacity duration-300 ${loading || error ? 'opacity-0' : 'opacity-100'}`}
          muted
          playsInline
        />

        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-blue-400 gap-2 z-20">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <span className="text-xs font-bold text-gray-300">جاري تشغيل الكاميرا...</span>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-4 text-center z-20">
            <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
            <p className="text-xs text-rose-300 font-bold mb-3 max-w-xs">{error}</p>
            <button
              type="button"
              onClick={() => setSelectedDeviceId(selectedDeviceId)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Tactical Reticle Overlay */}
        {!loading && !error && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
            
            {/* Target Reticle Box */}
            <div className={`relative w-[210px] h-[210px] transition-all duration-300 rounded-lg ${
              scannedSuccess 
                ? 'border-2 border-emerald-400 bg-emerald-500/20 scale-105 shadow-[0_0_30px_rgba(16,185,129,0.5)]' 
                : 'border-2 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
            }`}>
              
              {/* Corner Brackets */}
              <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-blue-400 rounded-tl"></div>
              <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-blue-400 rounded-tr"></div>
              <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-blue-400 rounded-bl"></div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-blue-400 rounded-br"></div>

              {/* Animated Laser Scanning Beam */}
              {!scannedSuccess && (
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-scan"></div>
              )}

              {/* Success Badge Overlay */}
              {scannedSuccess && (
                <div className="absolute inset-0 flex items-center justify-center bg-emerald-950/60 backdrop-blur-xs rounded-lg">
                  <span className="text-emerald-300 font-extrabold text-sm px-3 py-1 bg-emerald-900/80 border border-emerald-400 rounded-full animate-pulse">
                    ✓ تم التعرف بنجاح
                  </span>
                </div>
              )}
            </div>

            {/* Vignette Shadow around reticle */}
            <div className="absolute inset-0 bg-black/35"></div>
          </div>
        )}
      </div>

      {/* Hidden file inputs for direct mobile camera capture & gallery image upload */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={fileInputRef}
        onChange={handleImageFileScan}
        className="hidden"
      />
      <input
        type="file"
        accept="image/*"
        ref={galleryInputRef}
        onChange={handleImageFileScan}
        className="hidden"
      />

      {/* Direct Mobile Camera & Photo Upload Buttons */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 active:scale-95 transition-all"
          title="فتح كاميرا الموبايل لالتقاط صورة الكود مباشرة"
        >
          <Camera className="w-4 h-4" />
          <span>فتح كاميرا الهاتف</span>
        </button>

        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 active:scale-95 transition-all"
          title="اختيار صورة كود QR من الاستوديو أو ملفات الجهاز"
        >
          <Upload className="w-4 h-4 text-cyan-400" />
          <span>اختيار صورة الكود</span>
        </button>
      </div>

      {/* Bottom Guidance Instruction */}
      <p className="text-[11px] text-gray-300 text-center mt-2.5 font-medium flex items-center justify-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
        <span>{instruction}</span>
      </p>

    </div>
  );
}
