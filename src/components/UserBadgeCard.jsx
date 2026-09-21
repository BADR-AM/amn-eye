import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  Printer, 
  Download, 
  RefreshCw, 
  X, 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  KeyRound, 
  QrCode,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import centralSecurityLogo from '../assets/central_security_logo.png';
import { toPng } from 'html-to-image';

const ROLE_STYLES = {
  admin: {
    label: 'مدير المنظومة',
    color: '#e11d48', // Rose / Red
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    barColor: '#e11d48',
    glowColor: 'rgba(225, 29, 72, 0.4)'
  },
  officer: {
    label: 'ضابط أمن وتحريات',
    color: '#2563eb', // Blue
    badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    barColor: '#2563eb',
    glowColor: 'rgba(37, 99, 235, 0.4)'
  },
  operator: {
    label: 'مدخل بيانات / كشك',
    color: '#10b981', // Emerald
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    barColor: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.4)'
  }
};

export default function UserBadgeCard({ 
  user, 
  onClose, 
  onRegenerate,
  showToast 
}) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef(null);

  const roleStyle = ROLE_STYLES[user?.role] || ROLE_STYLES.officer;

  // Generate QR Code data URL whenever token changes
  useEffect(() => {
    if (user && user.qr_login_token) {
      QRCode.toDataURL(user.qr_login_token, {
        width: 320,
        margin: 1,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#0a0f1d',
          light: '#ffffff'
        }
      })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Failed to generate badge QR:', err));
    }
  }, [user?.qr_login_token]);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!user) return null;

  // Handle direct card printing
  const handlePrint = () => {
    window.print();
  };

  // Handle PNG Image Download
  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { 
        cacheBust: true,
        pixelRatio: 3, // Ultra-sharp 300+ DPI
      });
      const link = document.createElement('a');
      link.download = `SECURITY_EYE_BADGE_${user.username}.png`;
      link.href = dataUrl;
      link.click();
      if (showToast) showToast('تم تنزيل بطاقة الهوية الذكية كصورة فائقة الدقة بنجاح');
    } catch (err) {
      console.error('Download badge image error:', err);
      if (showToast) showToast('حدث خطأ أثناء حفظ الصورة', 'error');
    } finally {
      setDownloading(false);
    }
  };

  // Handle Regenerate QR Token
  const handleRegenerateToken = async () => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في تجديد الرمز الأمني لبطاقة "${user.full_name}"؟ سيتم إبطال أي كارت مطبوع سابقاً فوراً.`)) {
      return;
    }
    setRegenerating(true);
    try {
      await onRegenerate(user.id);
    } catch (err) {
      console.error('Error regenerating token:', err);
    } finally {
      setRegenerating(false);
    }
  };

  const serialNumber = `SEC-ID-${String(user.id).padStart(4, '0')}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 overflow-y-auto animate-fade-in" dir="rtl">
      
      {/* Top Controls Action Bar - Hidden in print */}
      <div className="w-full max-w-xl flex items-center justify-between bg-darkslate-900 border border-slate-800 p-4 rounded-2xl mb-4 shadow-2xl no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">معاينة وطباعة بطاقة الهوية الذكية</h3>
            <span className="text-[11px] text-slate-400 font-mono">CR80 SMART ID BADGE</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة البطاقة (Ctrl+P)</span>
          </button>

          {/* Download Image Button */}
          <button
            onClick={handleDownloadImage}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-950/50 transition-all disabled:opacity-50"
            title="حفظ كصورة عالية الدقة للطباعة أو الإرسال"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'جاري الحفظ...' : 'تصدير PNG'}</span>
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Printable Badge Wrapper */}
      <div className="flex flex-col items-center justify-center">
        
        {/* Physical Smart Card ID (CR80 Standard proportions: 85.6mm × 54mm) */}
        <div
          ref={cardRef}
          id="printable-badge"
          style={{
            width: '480px',
            height: '290px',
            minWidth: '480px',
            minHeight: '290px',
            maxWidth: '480px',
            maxHeight: '290px',
            fontFamily: "'Cairo', 'Segoe UI', Tahoma, sans-serif",
            direction: 'rtl',
            background: 'linear-gradient(135deg, #090e1a 0%, #10192e 50%, #080d18 100%)',
            border: `2px solid ${roleStyle.color}`,
            boxShadow: `0 0 35px ${roleStyle.glowColor}, inset 0 0 15px rgba(255,255,255,0.05)`,
          }}
          className="relative rounded-2xl overflow-hidden text-white flex flex-col justify-between select-none shadow-2xl p-4 m-2"
        >
          {/* Subtle Security Micro-Mesh Background Watermark */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-5 bg-repeat"
            style={{
              backgroundImage: `radial-gradient(${roleStyle.color} 1px, transparent 1px)`,
              backgroundSize: '12px 12px'
            }}
          ></div>

          {/* Top Brand & Authority Header */}
          <div className="relative z-10 flex items-center justify-between border-b border-slate-700/60 pb-2">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <img 
                src={centralSecurityLogo} 
                alt="شعار الأمن المركزي" 
                className="w-10 h-12 object-contain drop-shadow-md"
              />
              <div className="flex flex-col">
                <span className="text-[11px] font-black text-amber-300 tracking-wider">
                  وزارة الداخليـــــة
                </span>
                <span className="text-[10px] font-extrabold text-white">
                  قطاع الأمن المركزي • منطقة وسط الدلتا
                </span>
                <span className="text-[9px] font-bold text-slate-300">
                  مركز تدريب المجندين • وحدة الأمن والتحريات
                </span>
              </div>
            </div>

            {/* Micro Badge ID */}
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-mono font-bold text-slate-400">
                {serialNumber}
              </span>
              <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                VER 2.3
              </span>
            </div>
          </div>

          {/* Main Card Body */}
          <div className="relative z-10 flex items-center justify-between gap-4 my-auto py-1">
            
            {/* Right Side: Officer / User Details */}
            <div className="flex-1 flex flex-col justify-center pr-1">
              <span className="text-[10px] text-slate-400 font-semibold mb-0.5">
                حامل البطاقة الذكية:
              </span>
              <h2 className="text-base font-black text-white leading-tight mb-2 truncate">
                {user.full_name}
              </h2>

              {/* Role Badge */}
              <div className="inline-flex items-center gap-1.5 mb-2">
                <span 
                  className="text-xs font-black px-3 py-1 rounded-lg border shadow-sm flex items-center gap-1"
                  style={{
                    backgroundColor: `${roleStyle.color}20`,
                    color: roleStyle.color,
                    borderColor: `${roleStyle.color}50`
                  }}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{roleStyle.label}</span>
                </span>
              </div>

              {/* Username tag */}
              <div className="flex items-center gap-1 text-[11px] text-slate-300 font-mono">
                <span className="text-slate-500">حساب:</span>
                <span className="font-bold text-white bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                  @{user.username}
                </span>
              </div>
            </div>

            {/* Left Side: High-Definition QR Code */}
            <div className="flex flex-col items-center justify-center shrink-0">
              <div className="p-1.5 bg-white rounded-xl shadow-lg border-2 border-slate-300 flex items-center justify-center">
                {qrDataUrl ? (
                  <img 
                    src={qrDataUrl} 
                    alt="رمز تسجيل الدخول الذكي" 
                    className="w-[98px] h-[98px] object-contain"
                  />
                ) : (
                  <div className="w-[98px] h-[98px] bg-slate-100 flex items-center justify-center text-slate-400 text-[10px] font-bold">
                    جاري الإنشاء...
                  </div>
                )}
              </div>
              <span className="text-[9px] text-cyan-300 font-mono font-bold mt-1 tracking-wider uppercase">
                SMART PASS
              </span>
            </div>

          </div>

          {/* Bottom Security Footer Strip */}
          <div className="relative z-10 flex items-center justify-between border-t border-slate-800 pt-2 text-[9px] text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>بطاقة دخول أمنية مشفرة • صلاحية نشطة</span>
            </span>
            <span>SECURITY EYE • CENTRAL SECURITY</span>
          </div>

        </div>

      </div>

      {/* Admin Action Notice & Revocation Option */}
      <div className="w-full max-w-xl mt-4 bg-darkslate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between no-print">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            في حال فقدان الكارت، يمكنك تجديد الرمز الأمني فوراً لإبطال هذا الكارت ومنع استخدامه.
          </span>
        </div>

        <button
          onClick={handleRegenerateToken}
          disabled={regenerating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all shrink-0 disabled:opacity-50"
          title="إبطال الكارت الحالي وتوليد رمز QR جديد تماماً"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
          <span>{regenerating ? 'جاري التجديد...' : 'إلغاء وتجديد الرمز'}</span>
        </button>
      </div>

      {/* Global CSS for Clean Printing of Badge */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-badge, #printable-badge * {
            visibility: visible;
          }
          #printable-badge {
            position: fixed;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            margin: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

    </div>
  );
}
