import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Camera, 
  Scan, 
  Check, 
  RotateCcw, 
  Sparkles, 
  AlertTriangle, 
  FileText,
  Sliders,
  Crop,
  Shield,
  Loader2
} from 'lucide-react';

export default function DocumentScannerModal({
  isOpen,
  onClose,
  title = 'مسح وثيقة ضوئياً',
  subtitle = 'قم بمحاذاة الوثيقة داخل الإطار الذكي للالتقاط',
  onCapture
}) {
  if (!isOpen) return null;

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const containerRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [documentMode, setDocumentMode] = useState(true); // Enhanced contrast for paper
  const [isProcessing, setIsProcessing] = useState(false);

  // Aspect ratio for the guide frame: standard A4 / ID Card ratio (approx 1.41)
  const [frameRatio, setFrameRatio] = useState('a4'); // 'a4' (vertical doc) | 'card' (horizontal ID card)

  const startCamera = async () => {
    setCameraError(null);
    setCapturedImage(null);

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      console.error('Camera open error:', err);
      setCameraError('تعذر فتح الكاميرا المباشرة. تأكد من توصيل الكاميرا أو الماسح الضوئي وإعطاء الإذن بالمتصفح.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // Capture and crop within the document frame
  const handleCapture = () => {
    if (!videoRef.current) return;
    setIsProcessing(true);

    try {
      const video = videoRef.current;
      const vw = video.videoWidth || 1280;
      const vh = video.videoHeight || 720;

      // Temporary full canvas
      const fullCanvas = document.createElement('canvas');
      fullCanvas.width = vw;
      fullCanvas.height = vh;
      const fullCtx = fullCanvas.getContext('2d');
      fullCtx.drawImage(video, 0, 0, vw, vh);

      // Calculate cropped box relative to video aspect ratio
      // In the UI, the guide frame occupies approx 75% width and 85% height
      const cropWidthRatio = frameRatio === 'card' ? 0.70 : 0.65;
      const cropHeightRatio = frameRatio === 'card' ? 0.45 : 0.82;

      const cropW = Math.round(vw * cropWidthRatio);
      const cropH = Math.round(vh * cropHeightRatio);
      const cropX = Math.round((vw - cropW) / 2);
      const cropY = Math.round((vh - cropH) / 2);

      // Cropped Document Canvas
      const docCanvas = document.createElement('canvas');
      docCanvas.width = cropW;
      docCanvas.height = cropH;
      const docCtx = docCanvas.getContext('2d');

      // Draw cropped area
      docCtx.drawImage(fullCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      // Apply Document Mode Enhancement (contrast + sharp paper white/black)
      if (documentMode) {
        const imgData = docCtx.getImageData(0, 0, cropW, cropH);
        const d = imgData.data;
        const contrastFactor = 1.35; // 35% contrast boost
        const brightnessOffset = 10;

        for (let i = 0; i < d.length; i += 4) {
          // Grayscale luma
          let r = d[i];
          let g = d[i + 1];
          let b = d[i + 2];

          // Apply contrast
          r = Math.min(255, Math.max(0, ((r - 128) * contrastFactor) + 128 + brightnessOffset));
          g = Math.min(255, Math.max(0, ((g - 128) * contrastFactor) + 128 + brightnessOffset));
          b = Math.min(255, Math.max(0, ((b - 128) * contrastFactor) + 128 + brightnessOffset));

          d[i] = r;
          d[i + 1] = g;
          d[i + 2] = b;
        }
        docCtx.putImageData(imgData, 0, 0);
      }

      const finalBase64 = docCanvas.toDataURL('image/jpeg', 0.95);
      setCapturedImage(finalBase64);
      stopCamera();
    } catch (e) {
      console.error('Capture error:', e);
      setCameraError('حدث خطأ أثناء معالجة واقتصاص الوثيقة: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (capturedImage && onCapture) {
      onCapture(capturedImage);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3" dir="rtl">
      <div className="bg-[#141414] border border-[#383838] w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="p-4 bg-[#1c1c1c] border-b border-[#2e2e2e] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{title}</span>
                <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 px-2 py-0.5 border border-cyan-800">
                  وضع المسح الذكي للوثائق
                </span>
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2e2e2e] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="p-4 flex-1 flex flex-col items-center justify-center bg-black overflow-hidden relative min-h-[380px]">
          {capturedImage ? (
            // Preview captured cropped document
            <div className="relative max-h-[60vh] overflow-hidden flex flex-col items-center">
              <img
                src={capturedImage}
                alt="الوثيقة الممسوحة"
                className="max-h-[55vh] object-contain border-2 border-emerald-500 shadow-2xl"
              />
              <div className="mt-2 text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>تم التقاط واقتصاص الوثيقة بنجاح وجاهزة للحفظ بالأرشيف</span>
              </div>
            </div>
          ) : (
            // Live Camera View with Document Detection Frame
            <div ref={containerRef} className="relative w-full max-w-xl h-[420px] bg-black flex items-center justify-center overflow-hidden border border-[#2a2a2a]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Blue Translucent Document Detection Box (مثل صورة الكاميرا المرفقة) */}
              <div 
                className={`absolute pointer-events-none transition-all duration-300 flex items-center justify-center ${
                  frameRatio === 'card'
                    ? 'w-[75%] h-[50%] rounded-xl'
                    : 'w-[68%] h-[84%] rounded-lg'
                } bg-cyan-500/15 border-2 border-dashed border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.35)]`}
              >
                {/* Corner Accents */}
                <div className="absolute top-0 right-0 w-4 h-4 border-t-3 border-r-3 border-cyan-300"></div>
                <div className="absolute top-0 left-0 w-4 h-4 border-t-3 border-l-3 border-cyan-300"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-3 border-r-3 border-cyan-300"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-3 border-l-3 border-cyan-300"></div>

                {/* Guide Text */}
                <div className="bg-black/70 backdrop-blur-sm px-3 py-1 rounded border border-cyan-500/40 text-[11px] font-bold text-cyan-200 flex items-center gap-1.5 shadow">
                  <Scan className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
                  <span>محاذاة حواف الوثيقة داخل الإطار</span>
                </div>
              </div>

              {cameraError && (
                <div className="absolute inset-0 bg-black/90 p-6 flex flex-col items-center justify-center text-center">
                  <AlertTriangle className="w-10 h-10 text-red-400 mb-2" />
                  <p className="text-xs text-red-300 max-w-sm">{cameraError}</p>
                  <button
                    onClick={startCamera}
                    className="mt-3 px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Toolbar & Filter Switches */}
        {!capturedImage && (
          <div className="px-5 py-2.5 bg-[#1a1a1a] border-t border-[#2a2a2a] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-bold">نوع الإطار:</span>
              <button
                type="button"
                onClick={() => setFrameRatio('a4')}
                className={`px-2.5 py-1 text-[11px] border font-bold transition-all ${
                  frameRatio === 'a4' 
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-200' 
                    : 'bg-[#242424] border-[#383838] text-gray-400 hover:text-white'
                }`}
              >
                وثيقة A4 / سجل عسكري
              </button>
              <button
                type="button"
                onClick={() => setFrameRatio('card')}
                className={`px-2.5 py-1 text-[11px] border font-bold transition-all ${
                  frameRatio === 'card' 
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-200' 
                    : 'bg-[#242424] border-[#383838] text-gray-400 hover:text-white'
                }`}
              >
                بطاقة شخصية / كارت دولاب
              </button>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none text-gray-300">
              <input
                type="checkbox"
                checked={documentMode}
                onChange={(e) => setDocumentMode(e.target.checked)}
                className="rounded bg-[#222] border-cyan-500 text-cyan-500 focus:ring-0"
              />
              <span className="flex items-center gap-1 font-bold text-cyan-300">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                تحسين وضوح النصوص والورق (Document Mode)
              </span>
            </label>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 bg-[#181818] border-t border-[#2e2e2e] flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#383838] text-gray-300 text-xs font-semibold border border-[#444]"
          >
            إلغاء
          </button>

          {capturedImage ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRetake}
                className="px-4 py-2 bg-[#2f2f2f] hover:bg-[#3d3d3d] text-gray-200 text-xs font-bold flex items-center gap-1.5 border border-[#484848]"
              >
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>إعادة الالتقاط</span>
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg"
              >
                <Check className="w-4 h-4" />
                <span>حفظ الوثيقة بالأرشيف</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleCapture}
              disabled={!cameraActive || isProcessing}
              className="px-8 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-cyan-950/50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري الاقتصاص والمعالجة...</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 text-cyan-200" />
                  <span>التقاط واقتصاص الوثيقة</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
