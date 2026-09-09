import React, { useState, useEffect } from 'react';
import { 
  X, Database, HardDrive, Wifi, RefreshCw, Download, 
  Trash2, ShieldCheck, CheckCircle2, Clock, AlertCircle, 
  ExternalLink, Copy, Check, QrCode, Play
} from 'lucide-react';
import { authHeaders } from '../utils/auth';

export default function BackupManagerModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('backup'); // 'backup' | 'network' | 'schedule'
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  
  // Data states
  const [drives, setDrives] = useState([]);
  const [localBackups, setLocalBackups] = useState([]);
  const [externalBackups, setExternalBackups] = useState([]);
  const [config, setConfig] = useState({
    externalPath: '',
    autoBackupEnabled: true,
    intervalHours: 6
  });
  
  // Network info
  const [networkInfo, setNetworkInfo] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchBackupData = async () => {
    try {
      setLoading(true);
      const [bRes, dRes, nRes] = await Promise.all([
        fetch('/api/backup/list', { headers: authHeaders() }),
        fetch('/api/backup/drives', { headers: authHeaders() }),
        fetch('/api/network-info')
      ]);

      if (bRes.ok) {
        const bData = await bRes.json();
        setLocalBackups(bData.localBackups || []);
        setExternalBackups(bData.externalBackups || []);
        if (bData.config) setConfig(bData.config);
      }

      if (dRes.ok) {
        const dData = await dRes.json();
        setDrives(dData || []);
      }

      if (nRes.ok) {
        const nData = await nRes.json();
        setNetworkInfo(nData);
      }
    } catch (err) {
      console.error('Error fetching backup data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBackupData();
    }
  }, [isOpen]);

  // Save Settings
  const handleSaveConfig = async (newConfig) => {
    try {
      const updated = { ...config, ...newConfig };
      setConfig(updated);
      await fetch('/api/backup/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify(updated)
      });
    } catch (err) {
      console.error('Error saving config:', err);
    }
  };

  // Create immediate backup (local or external)
  const handleCreateBackup = async (toExternal = false) => {
    try {
      setProcessing(true);
      setProgressMsg(toExternal ? 'جاري ضغط البيانات وسحب النسخة للهارد الخارجي...' : 'جاري إنشاء النسخة الاحتياطية الشاملة...');

      const res = await fetch('/api/backup/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({
          externalPath: toExternal ? config.externalPath : null
        })
      });

      if (res.ok) {
        const data = await res.json();
        alert(toExternal && data.backup?.externalCopied 
          ? `✅ تم سحب النسخة بنجاح على الهارد الخارجي:\n${data.backup.externalPath}`
          : '✅ تم إنشاء النسخة الاحتياطية الشاملة بنجاح.'
        );
        await fetchBackupData();
      } else {
        const err = await res.json();
        alert('حدث خطأ: ' + (err.error || 'فشل إنشاء النسخة'));
      }
    } catch (err) {
      console.error(err);
      alert('خطأ في الاتصال بالسيرفر');
    } finally {
      setProcessing(false);
      setProgressMsg('');
    }
  };

  // Delete a backup
  const handleDeleteBackup = async (fileName) => {
    if (!window.confirm(`هل أنت متأكد من حذف النسخة الاحتياطية "${fileName}"؟`)) return;
    try {
      const res = await fetch(`/api/backup/${fileName}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (res.ok) {
        await fetchBackupData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyNetworkUrl = () => {
    if (!networkInfo?.networkUrl) return;
    navigator.clipboard.writeText(networkInfo.networkUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#161616] border border-[#393939] w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl text-gray-100 rounded-none font-sans">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#393939] flex items-center justify-between bg-[#262626]">
          <div className="flex items-center gap-3.5">
            <div className="p-2 bg-[#0f62fe]/10 border border-[#0f62fe]/30 text-[#0f62fe]">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-wide">إدارة النسخ الاحتياطي والربط الشبكي</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                تأمين بيانات المجندين، السحب الدوري للهارد الخارجي، وتوحيد العمل عبر جهازين بالشبكة
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 hover:bg-[#393939] text-gray-400 hover:text-white transition-colors"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#333333] bg-[#1a1a1a] px-6">
          <button
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'backup'
                ? 'border-[#0f62fe] text-white bg-[#262626]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <HardDrive className="w-4 h-4 text-amber-400" />
            <span>النسخ الاحتياطي والهارد الخارجي</span>
          </button>

          <button
            onClick={() => setActiveTab('network')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'network'
                ? 'border-[#0f62fe] text-white bg-[#262626]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Wifi className="w-4 h-4 text-emerald-400" />
            <span>ربط وتوحيد جهازين (الشبكة والواي فاي)</span>
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'schedule'
                ? 'border-[#0f62fe] text-white bg-[#262626]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Clock className="w-4 h-4 text-[#0f62fe]" />
            <span>الجدولة الدورية التلقائية</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {loading ? (
            <div className="py-16 text-center text-gray-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#0f62fe] mb-2" />
              <p className="text-xs">جاري فحص الأقراص والنسخ الاحتياطية...</p>
            </div>
          ) : activeTab === 'backup' ? (
            
            /* ============================================================ */
            /* Tab 1: External Drive & Manual Backup                        */
            /* ============================================================ */
            <div className="space-y-6">
              
              {/* External Drive Destination Box */}
              <div className="bg-[#1e1e1e] border border-[#393939] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-amber-400" />
                    <h3 className="text-sm font-bold text-white">تخصيص مسار الهارد الخارجي أو الفلاشة (External Drive)</h3>
                  </div>
                  <span className="text-xs text-gray-400">حفظ مباشر على وسائط USB</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <input
                    type="text"
                    value={config.externalPath}
                    onChange={(e) => setConfig({ ...config, externalPath: e.target.value })}
                    onBlur={() => handleSaveConfig({ externalPath: config.externalPath })}
                    placeholder="مثال: E:\AmnEye_Backups أو F:\Backups"
                    className="flex-1 bg-[#141414] border border-[#525252] text-white text-xs px-3 py-2.5 focus:border-[#0f62fe] focus:outline-none font-mono"
                  />
                  <button
                    onClick={() => handleSaveConfig({ externalPath: config.externalPath })}
                    className="px-4 py-2.5 bg-[#2a2a2a] hover:bg-[#383838] text-xs font-bold border border-[#525252] text-gray-200"
                  >
                    حفظ المسار
                  </button>
                </div>

                {/* Quick Drive selector pills */}
                {drives.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className="text-xs text-gray-400">الأقراص المتصلة المكتشفة:</span>
                    {drives.map(d => (
                      <button
                        key={d.drive}
                        onClick={() => {
                          const newPath = `${d.drive}\\AmnEye_Backups`;
                          setConfig({ ...config, externalPath: newPath });
                          handleSaveConfig({ externalPath: newPath });
                        }}
                        className={`text-xs px-2.5 py-1 font-mono border transition-colors flex items-center gap-1 ${
                          config.externalPath?.startsWith(d.drive)
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                            : 'bg-[#141414] border-[#393939] text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        <HardDrive className="w-3 h-3" />
                        <span>{d.drive} ({d.isSystem ? 'قرص النظام C' : 'قرص خارجي/إضافي'})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Immediate Local Backup */}
                <button
                  onClick={() => handleCreateBackup(false)}
                  disabled={processing}
                  className="p-4 bg-[#262626] border border-[#393939] hover:border-[#0f62fe] text-right transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white group-hover:text-[#0f62fe]">
                      إنشاء نسخة احتياطية محلية
                    </span>
                    <Database className="w-5 h-5 text-[#0f62fe]" />
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    حفظ نسخة شاملة مضغوطة تشمل قاعدة البيانات وصور وفيديوهات المجندين بمجلد backups الداخلي.
                  </p>
                </button>

                {/* Immediate External Drive Backup */}
                <button
                  onClick={() => handleCreateBackup(true)}
                  disabled={processing || !config.externalPath}
                  className={`p-4 border text-right transition-all group ${
                    config.externalPath 
                      ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400 hover:bg-amber-950/30' 
                      : 'bg-[#1c1c1c] border-[#333] opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-amber-300">
                      سحب نسخة فورية للهارد الخارجي
                    </span>
                    <HardDrive className="w-5 h-5 text-amber-400" />
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {config.externalPath 
                      ? `سحب وحفظ نسخة فورية إلى المسار المحدد: ${config.externalPath}`
                      : 'يرجى كتابة أو اختيار مسار الهارد الخارجي بالأعلى أولاً'}
                  </p>
                </button>

              </div>

              {/* Processing Spinner */}
              {processing && (
                <div className="p-4 bg-[#1f2937] border border-[#0f62fe] text-center flex items-center justify-center gap-3">
                  <RefreshCw className="w-5 h-5 animate-spin text-[#0f62fe]" />
                  <span className="text-xs font-bold text-white">{progressMsg}</span>
                </div>
              )}

              {/* Backups History Table */}
              <div className="border border-[#393939] bg-[#161616]">
                <div className="px-4 py-3 border-b border-[#393939] flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    سجل النسخ الاحتياطية المتوفرة ({localBackups.length} نسخة محلية)
                  </h4>
                  <button
                    onClick={fetchBackupData}
                    className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>تحديث القائمة</span>
                  </button>
                </div>

                {localBackups.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500">
                    لا توجد نسخ احتياطية مسجلة حتى الآن. اضغط على "إنشاء نسخة احتياطية" لحفظ أول نسخة.
                  </div>
                ) : (
                  <div className="divide-y divide-[#2a2a2a] max-h-72 overflow-y-auto">
                    {localBackups.map((b) => (
                      <div key={b.fileName} className="p-3 hover:bg-[#202020] flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                          <Database className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div>
                            <span className="font-mono text-white font-bold block">{b.fileName}</span>
                            <span className="text-[11px] text-gray-400">
                              تاريخ الإنشاء: {new Date(b.createdAt).toLocaleString('ar-EG')} — الحجم: <strong className="text-gray-300 font-mono">{b.sizeFormatted}</strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={`/api/backup/download/${b.fileName}`}
                            download
                            className="p-1.5 bg-[#2a2a2a] hover:bg-[#0f62fe] text-gray-300 hover:text-white border border-[#444]"
                            title="تنزيل ملف النسخة الاحتياطية"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => handleDeleteBackup(b.fileName)}
                            className="p-1.5 bg-[#2a2a2a] hover:bg-red-950 text-gray-400 hover:text-red-400 border border-[#444]"
                            title="حذف النسخة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          ) : activeTab === 'network' ? (
            
            /* ============================================================ */
            /* Tab 2: Multi-Device Network & Wi-Fi Sync                     */
            /* ============================================================ */
            <div className="space-y-5">
              <div className="bg-[#1b2b48] border border-[#0f62fe]/40 p-4 space-y-3">
                <div className="flex items-center gap-2 text-[#0f62fe]">
                  <Wifi className="w-5 h-5" />
                  <h3 className="text-sm font-bold text-white">كيفية تشغيل المنظومة على جهازين بنفس الوقت مع توحيد البيانات</h3>
                </div>
                <p className="text-xs text-gray-200 leading-relaxed">
                  المنظومة مصممة لتعمل كـ <strong>خادم مركزي (Master Station)</strong> على هذا الجهاز، مما يتيح لأي جهاز ثانٍ متصل بنفس شبكة الواي فاي أو السلك بالمعسكر الدخول الفوري وتدوين وفحص المجندين، وتُحفظ كافة البيانات فورياً في نفس قاعدة البيانات المشتركة بدون أي تضارب.
                </p>
              </div>

              {/* Network IP Card */}
              <div className="bg-[#1e1e1e] border border-[#393939] p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#333] pb-3">
                  <div>
                    <span className="text-xs text-gray-400 block">عنوان الربط الشبكي للجهاز الثاني:</span>
                    <span className="text-xl font-mono font-bold text-emerald-400 mt-1 block">
                      {networkInfo?.networkUrl || 'جاري استخراج العنوان...'}
                    </span>
                  </div>
                  <button
                    onClick={copyNetworkUrl}
                    className="px-4 py-2 bg-[#0f62fe] hover:bg-[#0353e9] text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'تم النسخ' : 'نسخ رابط الدخول'}</span>
                  </button>
                </div>

                <div className="space-y-2 text-xs text-gray-300">
                  <h4 className="font-bold text-white">خطوات ربط الجهاز الثاني في دقيقة واحدة:</h4>
                  <ol className="list-decimal list-inside space-y-1.5 text-gray-300 pr-2">
                    <li>تأكد من توصيل الجهازين بنفس راوتر الواي فاي أو سويتش الشبكة بالمعسكر.</li>
                    <li>اترك هذا البرنامج مفتوحاً على هذا الجهاز الرئيسي.</li>
                    <li>من الجهاز الثاني، افتح متصفح Google Chrome أو Edge واكتب الرابط: <strong className="text-emerald-300 font-mono">{networkInfo?.networkUrl}</strong></li>
                    <li>سيبدأ الجهاز الثاني العمل فوراً وسيظهر له نفس واجهة المنظومة، وتتزامن كافة الإدخالات لحظياً بنسبة 100%!</li>
                  </ol>
                </div>

                {/* Available Network Interfaces */}
                {networkInfo?.addresses && networkInfo.addresses.length > 0 && (
                  <div className="pt-3 border-t border-[#333] text-xs">
                    <span className="text-gray-400 block mb-2">كروت الشبكة المفعلة على هذا الجهاز:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {networkInfo.addresses.map((addr, idx) => (
                        <div key={idx} className="p-2 bg-[#141414] border border-[#2a2a2a] flex items-center justify-between">
                          <span className="text-gray-300">{addr.interfaceName}</span>
                          <span className="font-mono text-emerald-400 font-bold">{addr.ip}:{networkInfo.port}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>

          ) : (
            
            /* ============================================================ */
            /* Tab 3: Automated Periodic Schedule                           */
            /* ============================================================ */
            <div className="space-y-5">
              <div className="bg-[#1e1e1e] border border-[#393939] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">النسخ الاحتياطي التلقائي الدوري (Automated Scheduler)</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      يقوم السيرفر بإنشاء نسخة احتياطية مضغوطة تلقائياً في الخلفية كل فترة محددة دون تعطيل العمل.
                    </p>
                  </div>
                  
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.autoBackupEnabled}
                      onChange={(e) => handleSaveConfig({ autoBackupEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0f62fe]"></div>
                  </label>
                </div>

                <div className="pt-4 border-t border-[#333] space-y-3">
                  <label className="block text-xs text-gray-300 font-bold">
                    معدل تكرار النسخ الاحتياطي التلقائي:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { hours: 4, label: 'كل ٤ ساعات' },
                      { hours: 6, label: 'كل ٦ ساعات (موصى به)' },
                      { hours: 12, label: 'كل ١٢ ساعة (نهاية النوبة)' },
                      { hours: 24, label: 'يومياً (كل ٢٤ ساعة)' }
                    ].map(opt => (
                      <button
                        key={opt.hours}
                        onClick={() => handleSaveConfig({ intervalHours: opt.hours })}
                        className={`p-3 text-xs font-bold border transition-all text-center ${
                          config.intervalHours === opt.hours
                            ? 'bg-[#0f62fe]/20 border-[#0f62fe] text-white'
                            : 'bg-[#141414] border-[#393939] text-gray-400 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-[#141414] border border-[#2a2a2a] text-xs text-gray-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    يتم تطبيق سياسة تدوير تلقائي: الاحتفاظ بآخر 10 نسخ احتياطية وحذف النسخ الأقدم لتفادي امتلاء القرص الصلب.
                  </span>
                </div>
              </div>
            </div>

          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#1e1e1e] border-t border-[#393939] flex items-center justify-between">
          <div className="text-xs text-gray-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>نظام الحماية والأرشفة التلقائية — قطاع الأمن المركزي</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#393939] hover:bg-[#4c4c4c] text-white text-xs font-bold"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
}
