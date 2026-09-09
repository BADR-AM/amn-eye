import React, { useEffect, useState } from 'react';
import { 
  X, 
  Wifi, 
  Copy, 
  Check, 
  Laptop, 
  Smartphone, 
  ShieldCheck,
  ExternalLink,
  QrCode
} from 'lucide-react';
import QRCode from 'qrcode';

export default function NetworkModal({ networkInfo, onClose }) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  const networkUrl = networkInfo?.networkUrl || `http://${networkInfo?.primaryIp || 'localhost'}:${networkInfo?.port || 5000}`;

  useEffect(() => {
    if (networkUrl) {
      QRCode.toDataURL(networkUrl, {
        width: 220,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('QR code generation error:', err));
    }
  }, [networkUrl]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(networkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-darkslate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-darkslate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">ربط الأجهزة عبر الشبكة الداخلية (Wi-Fi)</h2>
              <p className="text-xs text-slate-400">مزامنة فورية بدون إنترنت بين الأجهزة في نفس المكان</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          
          {/* Instructions banner */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 text-xs text-slate-300 leading-relaxed space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>كيفية تشغيل جهاز إدخال ثانٍ بالتزامن:</span>
            </div>
            <p>
              تأكد من اتصال الجهاز الآخر (لابتوب / تابلت) <strong>بنفس راوتر الواي فاي</strong> أو الشبكة المحلية، ثم افتح متصفح الإنترنت (Google Chrome أو Edge) وافتح الرابط التالي:
            </p>
          </div>

          {/* Network Link Box */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 block">رابط الشبكة المحلية المباشر:</label>
            <div className="flex items-center gap-2 bg-darkslate-950 border border-emerald-500/40 p-2.5 rounded-2xl">
              <span className="text-emerald-300 font-mono font-bold text-sm sm:text-base flex-1 px-2 select-all dir-ltr text-left truncate">
                {networkUrl}
              </span>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'تم النسخ' : 'نسخ الرابط'}</span>
              </button>
            </div>
          </div>

          {/* QR Code Section */}
          {qrDataUrl && (
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-darkslate-850 border border-slate-800">
              <div className="p-2.5 bg-white rounded-2xl shadow-xl mb-3">
                <img src={qrDataUrl} alt="QR Code" className="w-40 h-40" />
              </div>
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                امسح الكود بكاميرا الهاتف أو التابلت للفتح الفوري
              </span>
            </div>
          )}

          {/* Connected Network Interfaces list */}
          {networkInfo?.addresses && networkInfo.addresses.length > 0 && (
            <div className="space-y-1.5 text-xs text-slate-400">
              <span className="font-bold block text-slate-300">كروت الشبكة المكتشفة على جهازك:</span>
              {networkInfo.addresses.map((addr, idx) => (
                <div key={idx} className="flex justify-between items-center bg-slate-800/40 px-3 py-1.5 rounded-lg border border-slate-800">
                  <span className="font-mono text-slate-300">{addr.ip}</span>
                  <span className="text-slate-500 text-[11px]">{addr.interfaceName}</span>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
