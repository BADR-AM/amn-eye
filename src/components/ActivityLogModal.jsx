import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Plus, Calendar, Clock, MapPin, Activity, Stethoscope, 
  CheckCircle2, AlertTriangle, Printer, Trash2, Edit3, ArrowRight, Shield,
  Camera, Upload, Eye, FileText, Image as ImageIcon
} from 'lucide-react';
import centralSecurityLogo from '../assets/central_security_logo.png';
import { getCompanyStyle } from '../utils/companyColors';
import { authHeaders } from '../utils/auth';

export default function ActivityLogModal({ recruit, recruitId, onClose, onRefreshRecruits, companyColors = [] }) {
  const [currentRecruit, setCurrentRecruit] = useState(recruit || null);
  const activeRecruitId = recruit?.id || recruitId;

  useEffect(() => {
    if (recruit) {
      setCurrentRecruit(recruit);
    } else if (recruitId) {
      fetch(`/api/recruits/${recruitId}`, { headers: authHeaders() })
        .then(res => res.json())
        .then(data => setCurrentRecruit(data.recruit || data))
        .catch(console.error);
    }
  }, [recruit, recruitId]);

  const activeRecruit = currentRecruit || recruit || {};

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    activity_type: 'medical_referral',
    destination: 'مستشفى الشرطة بطنطا',
    departure_date: new Date().toISOString().slice(0, 16),
    return_date: '',
    diagnosis: '',
    medical_decision: '',
    notes: '',
    officer_name: ''
  });

  const [returnDialogActivity, setReturnDialogActivity] = useState(null);
  const [returnDateInput, setReturnDateInput] = useState('');
  const [returnDiagnosisInput, setReturnDiagnosisInput] = useState('');
  const [returnDecisionInput, setReturnDecisionInput] = useState('');
  const [returnReportPhotoBase64, setReturnReportPhotoBase64] = useState(null);
  const [returnReportPhotoPreview, setReturnReportPhotoPreview] = useState(null);
  const [previewReportPhotoUrl, setPreviewReportPhotoUrl] = useState(null);
  const reportPhotoInputRef = useRef(null);

  const companyStyle = getCompanyStyle(activeRecruit?.company, companyColors);

  const fetchActivities = async () => {
    if (!activeRecruitId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/recruits/${activeRecruitId}/activities`, {
        headers: authHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeRecruitId) {
      fetchActivities();
    }
  }, [activeRecruitId]);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleCreateActivity = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch(`/api/recruits/${activeRecruitId}/activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setShowAddForm(false);
        setFormData({
          activity_type: 'medical_referral',
          destination: 'مستشفى الشرطة بطنطا',
          departure_date: new Date().toISOString().slice(0, 16),
          return_date: '',
          diagnosis: '',
          medical_decision: '',
          notes: '',
          officer_name: ''
        });
        await fetchActivities();
        onRefreshRecruits?.();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'حدث خطأ أثناء حفظ قيد المتابعة');
      }
    } catch (err) {
      console.error(err);
      alert('خطأ في الاتصال بالخادم');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordReturn = async (activityId) => {
    try {
      const res = await fetch(`/api/activities/${activityId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({
          return_date: returnDateInput,
          diagnosis: returnDiagnosisInput,
          medical_decision: returnDecisionInput,
          report_photo_base64: returnReportPhotoBase64
        })
      });

      if (res.ok) {
        setReturnDialogActivity(null);
        setReturnReportPhotoBase64('');
        setReturnReportPhotoPreview(null);
        await fetchActivities();
        onRefreshRecruits?.();
      } else {
        alert('خطأ في تحديث حالة العودة');
      }
    } catch (err) {
      console.error(err);
      alert('خطأ في الاتصال بالخادم');
    }
  };

  const handleReportPhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setReturnReportPhotoBase64(reader.result);
        setReturnReportPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = '';
  };

  // Handle cancelling active follow-up/referral immediately
  const handleCancelActivity = async (activityId) => {
    if (!window.confirm('هل تريد إلغاء هذه الإحالة/المتابعة فوراً وإنهاء وضع المجند (بالمستشفى)؟')) return;
    try {
      const res = await fetch(`/api/activities/${activityId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({
          return_date: new Date().toISOString().slice(0, 16),
          diagnosis: 'سليم ومستقر (تم إلغاء المتابعة)',
          medical_decision: 'إلغاء المتابعة واستئناف التدريب فوراً'
        })
      });

      if (res.ok) {
        await fetchActivities();
        onRefreshRecruits?.();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'خطأ في إلغاء المتابعة');
      }
    } catch (err) {
      console.error(err);
      alert('خطأ في الاتصال بالخادم');
    }
  };

  const handleDeleteActivity = async (activityId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا السجل من ملف المتابعة؟')) return;
    try {
      const res = await fetch(`/api/activities/${activityId}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (res.ok) {
        await fetchActivities();
        onRefreshRecruits?.();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'فشل حذف سجل المتابعة');
      }
    } catch (err) {
      console.error(err);
      alert('خطأ في الاتصال بالخادم');
    }
  };

  const handlePrintReferralLetter = (act) => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>خطاب إحالة طبية - قطاع الأمن المركزي</title>
        <style>
          @page { size: A4 portrait; margin: 20mm; }
          body { font-family: 'Cairo', 'Arial', sans-serif; direction: rtl; color: #000; line-height: 1.6; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 25px; }
          .logo { width: 80px; height: 80px; object-fit: contain; }
          .title { text-align: center; font-size: 22px; font-weight: 900; margin-bottom: 20px; text-decoration: underline; }
          .box { border: 1.5px solid #000; padding: 15px; margin-bottom: 20px; border-radius: 4px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 16px; }
          .label { font-weight: bold; }
          .footer { margin-top: 50px; display: flex; justify-content: space-between; text-align: center; }
          .sig-box { width: 220px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div><strong>وزارة الداخلية</strong></div>
            <div><strong>قطاع الأمن المركزي</strong></div>
            <div><strong>منطقة وسط الدلتا</strong></div>
            <div><strong>وحدة الأمن والتحريات</strong></div>
          </div>
          <img src="/central_security_logo.png" class="logo" />
          <div style="text-align: left;">
            <div><strong>التاريخ:</strong> ${new Date().toLocaleDateString('ar-EG')}</div>
            <div><strong>سري للغاية</strong></div>
          </div>
        </div>

        <div class="title">خطاب تحويل وإحالة لمستشفى الشرطة</div>

        <p style="font-size: 17px;">
          <strong>السيد الأستاذ الدكتور / مدير ${act.destination || 'مستشفى الشرطة'}</strong><br/>
          تحية طيبة وبعد ،،،
        </p>
        <p style="font-size: 16px; text-indent: 30px;">
          برجاء التكرم بتوقيع الكشف الطبي العاجل والفحوصات اللازمة على المجند الموضح بياناته أدناه، وموافاتنا بالتقرير الطبي والقرار اللازم فور الانتهاء:
        </p>

        <div class="box">
          <div class="row">
            <div><span class="label">اسم المجند:</span> ${recruit.name}</div>
            <div><span class="label">رقم الشرطة:</span> ${recruit.police_number || '---'}</div>
          </div>
          <div class="row">
            <div><span class="label">السرية:</span> ${recruit.company || 'غير محدد'}</div>
            <div><span class="label">الرقم القومي:</span> ${recruit.national_id || '---'}</div>
          </div>
          <div class="row">
            <div><span class="label">تاريخ وساعة القيام:</span> ${act.departure_date}</div>
            <div><span class="label">المؤهل الدراسي:</span> ${recruit.qualification}</div>
          </div>
          <div class="row">
            <div><span class="label">سبب الإحالة / الشكوى الطبية:</span> ${act.notes || 'كشف طبي وفحص شامل'}</div>
          </div>
        </div>

        <div class="box" style="min-height: 120px;">
          <div class="label" style="border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 10px;">
            خاص بالطبيب المعالج بمستشفى الشرطة (التشخيص والقرار):
          </div>
          <p style="color: #666; font-size: 14px;">(يُحرر بواسطة الطبيب المختص موضحاً التشخيص، الراحات الممنوحة، أو قرار الحجز)</p>
        </div>

        <div class="footer">
          <div class="sig-box">
            <div><strong>مندوب التحركات / المستشفى</strong></div>
            <div style="margin-top: 40px;">...................................</div>
          </div>
          <div class="sig-box">
            <div><strong>ضابط أمن المعسكر</strong></div>
            <div style="margin-top: 40px;">...................................</div>
          </div>
          <div class="sig-box">
            <div><strong>يعتمد، قائد المنطقة</strong></div>
            <div style="margin-top: 40px;">...................................</div>
          </div>
        </div>
      </body>
      </html>
    `);
    printWin.document.close();
    setTimeout(() => {
      printWin.print();
    }, 300);
  };

  const getActivityBadge = (type) => {
    switch (type) {
      case 'medical_referral':
        return { label: 'إحالة لمستشفى الشرطة', bg: 'bg-red-500/10 border-red-500/30 text-red-400', icon: Stethoscope };
      case 'hospital_return':
        return { label: 'عودة من المستشفى', bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', icon: CheckCircle2 };
      case 'mission':
        return { label: 'مأمورية رسمية', bg: 'bg-blue-500/10 border-blue-500/30 text-blue-400', icon: MapPin };
      default:
        return { label: 'إجراء إداري / أمني', bg: 'bg-gray-500/10 border-gray-500/30 text-gray-300', icon: Activity };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      {/* Carbon Window Tile */}
      <div className="bg-[#161616] border border-[#393939] w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl rounded-none text-gray-100">
        
        {/* Header - IBM Carbon style bar */}
        <div className="px-6 py-4 border-b border-[#393939] flex items-center justify-between bg-[#262626]">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-[#0f62fe]/10 border border-[#0f62fe]/30 text-[#0f62fe]">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold tracking-wide">سجل التحركات والمتابعة الطبية</h2>
                <span className="text-xs px-2.5 py-0.5 border font-mono" style={{ backgroundColor: companyStyle.bg, color: companyStyle.text, borderColor: companyStyle.border }}>
                  {activeRecruit.company || 'بدون سرية'}
                </span>
                {activeRecruit.active_activity === 'medical_referral' && (
                  <span className="text-xs px-2.5 py-0.5 bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse font-bold">
                    🏥 حالياً بمستشفى الشرطة
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400 mt-0.5">
                المجند: <strong className="text-white">{activeRecruit.name}</strong> — رقم الشرطة: <strong className="text-white font-mono">{activeRecruit.police_number || '---'}</strong> — الرقم القومي: <span className="font-mono text-gray-300">{activeRecruit.national_id || '---'}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[#393939] text-gray-400 hover:text-white transition-colors"
            title="إغلاق (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-6 py-3 bg-[#1e1e1e] border-b border-[#333333] flex items-center justify-between">
          <div className="text-xs text-gray-400 flex items-center gap-2">
            <span>إجمالي القيود المسجلة:</span>
            <span className="font-mono font-bold text-white bg-[#262626] px-2 py-0.5 border border-[#393939]">
              {activities.length}
            </span>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-1.5 text-sm font-semibold bg-[#0f62fe] hover:bg-[#0353e9] text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            {showAddForm ? 'إلغاء الإدخال' : 'تسجيل قيام لمستشفى الشرطة / تحرك'}
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Add Form (Collapsible) */}
          {showAddForm && (
            <form onSubmit={handleCreateActivity} className="p-5 bg-[#262626] border border-[#0f62fe]/40 space-y-4">
              <div className="flex items-center justify-between border-b border-[#393939] pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-[#0f62fe]" />
                  بيانات الإحالة أو التحرك الجديد
                </h3>
                <span className="text-xs text-gray-400">تُسجل تلقائياً في ملف المجند وخطاب المستشفى</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">نوع التحرك *</label>
                  <select
                    value={formData.activity_type}
                    onChange={(e) => setFormData({ ...formData, activity_type: e.target.value })}
                    className="w-full bg-[#161616] border border-[#525252] text-white text-sm px-3 py-2 focus:border-[#0f62fe] focus:outline-none"
                    required
                  >
                    <option value="medical_referral">إحالة لمستشفى الشرطة (كشف/طوارئ)</option>
                    <option value="hospital_return">تسجيل عودة من المستشفى</option>
                    <option value="mission">مأمورية رسمية</option>
                    <option value="administrative">إجراء إداري أو أمني</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">الجهة / المستشفى *</label>
                  <input
                    type="text"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    placeholder="مثال: مستشفى الشرطة بطنطا / مدينة نصر / العيادة"
                    className="w-full bg-[#161616] border border-[#525252] text-white text-sm px-3 py-2 focus:border-[#0f62fe] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">تاريخ وساعة القيام *</label>
                  <input
                    type="datetime-local"
                    value={formData.departure_date}
                    onChange={(e) => setFormData({ ...formData, departure_date: e.target.value })}
                    className="w-full bg-[#161616] border border-[#525252] text-white text-sm px-3 py-2 focus:border-[#0f62fe] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">التشخيص الطبي المبدئي / الشكوى المرضية</label>
                  <input
                    type="text"
                    value={formData.diagnosis}
                    onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                    placeholder="مثال: اشتباه كسر بالقدم، مغص كلوي حاد، نزلة شعبية..."
                    className="w-full bg-[#161616] border border-[#525252] text-white text-sm px-3 py-2 focus:border-[#0f62fe] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">القرار الطبي المتوقع / الفوري</label>
                  <select
                    value={formData.medical_decision}
                    onChange={(e) => setFormData({ ...formData, medical_decision: e.target.value })}
                    className="w-full bg-[#161616] border border-[#525252] text-white text-sm px-3 py-2 focus:border-[#0f62fe] focus:outline-none"
                  >
                    <option value="">(لم يتقرر بعد / قيد الكشف)</option>
                    <option value="حجز بمستشفى الشرطة">حجز بمستشفى الشرطة</option>
                    <option value="راحة طبية داخلية">راحة طبية داخلية بالمعسكر</option>
                    <option value="لائق واستكمال التدريب">لائق واستكمال التدريب</option>
                    <option value="إعادة عرض بتاريخ لاحق">إعادة عرض بتاريخ لاحق</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">ملاحظات التحرك / اسم المندوب المرافق</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="ملاحظات إضافية..."
                    className="w-full bg-[#161616] border border-[#525252] text-white text-sm px-3 py-2 focus:border-[#0f62fe] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">رتبة واسم القائم بالقيد</label>
                  <input
                    type="text"
                    value={formData.officer_name}
                    onChange={(e) => setFormData({ ...formData, officer_name: e.target.value })}
                    placeholder="مثال: نقيب / أحمد السيد"
                    className="w-full bg-[#161616] border border-[#525252] text-white text-sm px-3 py-2 focus:border-[#0f62fe] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-[#393939] text-gray-300 hover:bg-[#4c4c4c] text-sm"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#0f62fe] hover:bg-[#0353e9] text-white text-sm font-semibold"
                >
                  {submitting ? 'جاري الحفظ...' : 'حفظ وقيد في السجل'}
                </button>
              </div>
            </form>
          )}

          {/* Return Date & Diagnosis Dialog */}
          {returnDialogActivity && (
            <div className="p-4 bg-[#1f2937] border border-emerald-500/50 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  تسجيل عودة المجند من المستشفى وإثبات التشخيص والقرار
                </h4>
                <button onClick={() => setReturnDialogActivity(null)} className="text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-300 mb-1">تاريخ وساعة العودة *</label>
                  <input
                    type="datetime-local"
                    value={returnDateInput}
                    onChange={(e) => setReturnDateInput(e.target.value)}
                    className="w-full bg-[#111827] border border-gray-600 text-white text-sm px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-300 mb-1">التشخيص الطبي الصادر من المستشفى</label>
                  <input
                    type="text"
                    value={returnDiagnosisInput}
                    onChange={(e) => setReturnDiagnosisInput(e.target.value)}
                    placeholder="التشخيص النهائي بعد الكشف"
                    className="w-full bg-[#111827] border border-gray-600 text-white text-sm px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-300 mb-1">القرار الطبي النهائي</label>
                  <select
                    value={returnDecisionInput}
                    onChange={(e) => setReturnDecisionInput(e.target.value)}
                    className="w-full bg-[#111827] border border-gray-600 text-white text-sm px-3 py-1.5"
                  >
                    <option value="لائق واستكمال التدريب">لائق واستكمال التدريب</option>
                    <option value="راحة طبية داخلية (٣ أيام)">راحة طبية داخلية (٣ أيام)</option>
                    <option value="راحة طبية داخلية (أسبوع)">راحة طبية داخلية (أسبوع)</option>
                    <option value="حجز بالمستشفى لمزيد من الفحوصات">حجز بالمستشفى لمزيد من الفحوصات</option>
                    <option value="إعادة عرض بتاريخ لاحق">إعادة عرض بتاريخ لاحق</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setReturnDialogActivity(null)}
                  className="px-3 py-1 bg-gray-700 text-sm text-gray-300"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => handleRecordReturn(returnDialogActivity.id)}
                  className="px-4 py-1 bg-emerald-600 hover:bg-emerald-500 text-sm text-white font-bold"
                >
                  تأكيد تسجيل العودة والتشخيص
                </button>
              </div>
            </div>
          )}

          {/* Activities Timeline / Cards */}
          {loading ? (
            <div className="py-12 text-center text-gray-400">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-[#0f62fe] mb-2"></div>
              <p className="text-sm">جاري تحميل سجل التحركات والمتابعة...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-[#393939] bg-[#1a1a1a]">
              <Stethoscope className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-base font-semibold text-gray-300">لا توجد قيود متابعة أو تحركات مسجلة لهذا المجند حتى الآن</p>
              <p className="text-xs text-gray-500 mt-1">يمكنك استخدام زر "تسجيل قيام لمستشفى الشرطة" بالأعلى لقيد أي تحرك رسمي أو حالة مرضية</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((act) => {
                const badge = getActivityBadge(act.activity_type);
                const Icon = badge.icon;
                const isCurrentlyOut = act.activity_type === 'medical_referral' && (!act.return_date || act.return_date === '');

                return (
                  <div 
                    key={act.id} 
                    className={`border p-4 transition-all ${
                      isCurrentlyOut 
                        ? 'bg-[#1e1414] border-red-500/50 shadow-lg' 
                        : 'bg-[#1f1f1f] border-[#393939] hover:border-[#525252]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 border ${badge.bg}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 font-bold border ${badge.bg}`}>
                              {badge.label}
                            </span>
                            <span className="text-sm font-bold text-white flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-gray-400" />
                              {act.destination || 'غير محدد'}
                            </span>
                            {isCurrentlyOut && (
                              <span className="text-xs bg-red-600 text-white font-bold px-2 py-0.5 animate-pulse">
                                قيد التواجد بالمستشفى
                              </span>
                            )}
                          </div>

                          <div className="mt-2 text-xs text-gray-400 flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-gray-500" />
                              <span>تاريخ وساعة القيام:</span>
                              <strong className="text-gray-200 font-mono">{act.departure_date}</strong>
                            </div>

                            {act.return_date ? (
                              <div className="flex items-center gap-1 text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>تاريخ العودة:</span>
                                <strong className="font-mono">{act.return_date}</strong>
                              </div>
                            ) : (
                              <span className="text-amber-400 font-semibold">(لم تُسجل عودة بعد)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right controls */}
                      <div className="flex items-center gap-2">
                        {isCurrentlyOut && (
                          <>
                            <button
                              onClick={() => handleCancelActivity(act.id)}
                              className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/35 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1 transition-all"
                              title="إلغاء الإحالة فوراً وإنهاء وضع المجند (بالمستشفى)"
                            >
                              <X className="w-3.5 h-3.5 text-amber-400" />
                              <span>إلغاء المتابعة</span>
                            </button>

                            <button
                              onClick={() => {
                                setReturnDialogActivity(act);
                                setReturnDiagnosisInput(act.diagnosis || '');
                                setReturnDecisionInput(act.medical_decision || 'لائق واستكمال التدريب');
                              }}
                              className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              تسجيل العودة
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handlePrintReferralLetter(act)}
                          className="p-1.5 bg-[#2a2a2a] hover:bg-[#383838] text-gray-300 hover:text-white border border-[#444444]"
                          title="طباعة خطاب تحويل رسمي لمستشفى الشرطة"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteActivity(act.id)}
                          className="p-1.5 bg-[#2a2a2a] hover:bg-red-950/60 text-gray-400 hover:text-red-400 border border-[#444444]"
                          title="حذف القيد"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Diagnosis and Medical Decision Tile */}
                    {(act.diagnosis || act.medical_decision || act.notes) && (
                      <div className="mt-3 pt-3 border-t border-[#333333] grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        {act.diagnosis && (
                          <div className="bg-[#141414] p-2 border border-[#2a2a2a]">
                            <span className="text-gray-400 block mb-0.5">التشخيص الطبي:</span>
                            <span className="text-amber-300 font-semibold">{act.diagnosis}</span>
                          </div>
                        )}

                        {act.medical_decision && (
                          <div className="bg-[#141414] p-2 border border-[#2a2a2a]">
                            <span className="text-gray-400 block mb-0.5">القرار الطبي الصادر:</span>
                            <span className="text-blue-300 font-bold">{act.medical_decision}</span>
                          </div>
                        )}

                        {act.notes && (
                          <div className="bg-[#141414] p-2 border border-[#2a2a2a]">
                            <span className="text-gray-400 block mb-0.5">ملاحظات:</span>
                            <span className="text-gray-200">{act.notes}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Attached Medical Report Photo */}
                    {act.report_photo_path && (
                      <div className="mt-2.5 pt-2 border-t border-[#333333] flex items-center justify-between bg-blue-950/20 p-2 border border-blue-800/40">
                        <div className="flex items-center gap-2 text-blue-300 text-xs font-bold">
                          <FileText className="w-4 h-4 text-blue-400" />
                          <span>يوجد تقرير طبي رسمي مرفق مع هذا القيد</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPreviewReportPhotoUrl(act.report_photo_path)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>معاينة التقرير الطبي</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#1e1e1e] border-t border-[#393939] flex items-center justify-between">
          <div className="text-xs text-gray-400 flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#0f62fe]" />
            <span>منظومة إدارة وتحريات المجندين — منطقة وسط الدلتا</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-[#393939] hover:bg-[#4c4c4c] text-white text-sm font-semibold"
          >
            إغلاق النافذة
          </button>
        </div>

      </div>

      {/* Return Dialog Modal with Medical Report Camera/Upload */}
      {returnDialogActivity && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-emerald-500/50 max-w-lg w-full p-6 shadow-2xl space-y-4" dir="rtl">
            <div className="flex items-center justify-between border-b border-[#333333] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>تسجيل عودة من المستشفى / العيادة</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setReturnDialogActivity(null);
                  setReturnReportPhotoBase64('');
                  setReturnReportPhotoPreview(null);
                }}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">تاريخ وساعة العودة:</label>
                <input
                  type="datetime-local"
                  value={returnDateInput}
                  onChange={(e) => setReturnDateInput(e.target.value)}
                  className="w-full bg-[#262626] border border-[#525252] text-white text-xs px-3 py-2 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">التشخيص الطبي الصادر:</label>
                <input
                  type="text"
                  placeholder="مثال: فحص قاع عين سليم / كسر بالذراع الأيمن تم تجبيره"
                  value={returnDiagnosisInput}
                  onChange={(e) => setReturnDiagnosisInput(e.target.value)}
                  className="w-full bg-[#262626] border border-[#525252] text-white text-xs px-3 py-2 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">القرار الطبي:</label>
                <select
                  value={returnDecisionInput}
                  onChange={(e) => setReturnDecisionInput(e.target.value)}
                  className="w-full bg-[#262626] border border-[#525252] text-white text-xs px-3 py-2 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="لائق واستكمال التدريب">لائق واستكمال التدريب</option>
                  <option value="راحة طبية 24 ساعة">راحة طبية 24 ساعة</option>
                  <option value="راحة طبية 48 ساعة">راحة طبية 48 ساعة</option>
                  <option value="راحة طبية 72 ساعة">راحة طبية 72 ساعة</option>
                  <option value="حجز بمستشفى الشرطة">حجز بمستشفى الشرطة</option>
                  <option value="إعادة عرض بعد أسبوع">إعادة عرض بعد أسبوع</option>
                  <option value="عرض على اللجنة الطبية العليا">عرض على اللجنة الطبية العليا</option>
                </select>
              </div>

              {/* Attach / Photograph Medical Report */}
              <div className="pt-2 border-t border-[#333333]">
                <label className="block text-xs font-bold text-amber-300 mb-1.5 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-amber-400" />
                  <span>تصوير أو إرفاق صورة التقرير الطبي الرسمي:</span>
                </label>

                <input
                  ref={reportPhotoInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleReportPhotoSelect}
                  className="hidden"
                />

                {returnReportPhotoPreview ? (
                  <div className="relative border border-emerald-500/50 bg-[#111] p-2 flex items-center gap-3">
                    <img
                      src={returnReportPhotoPreview}
                      alt="تقرير طبي"
                      className="w-20 h-20 object-cover border border-slate-700 rounded"
                    />
                    <div className="flex-1 text-xs text-gray-300">
                      <div className="text-emerald-400 font-bold mb-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>تم التقاط / إرفاق التقرير بنجاح</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setReturnReportPhotoBase64('');
                          setReturnReportPhotoPreview(null);
                        }}
                        className="text-xs text-rose-400 hover:text-rose-300 underline"
                      >
                        حذف وإعادة التصوير
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => reportPhotoInputRef.current?.click()}
                      className="flex-1 py-2.5 px-3 bg-[#262626] hover:bg-[#333333] border border-dashed border-[#525252] text-xs font-bold text-gray-200 hover:text-white flex items-center justify-center gap-2 transition-colors"
                    >
                      <Camera className="w-4 h-4 text-emerald-400" />
                      <span>فتح الكاميرا لتصوير التقرير</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#333333]">
              <button
                type="button"
                onClick={() => {
                  setReturnDialogActivity(null);
                  setReturnReportPhotoBase64('');
                  setReturnReportPhotoPreview(null);
                }}
                className="px-4 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-300 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => handleRecordReturn(returnDialogActivity.id)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تأكيد تسجيل العودة والتقرير</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for previewing attached medical report */}
      {previewReportPhotoUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={() => setPreviewReportPhotoUrl(null)}
        >
          <div className="max-w-4xl w-full max-h-[90vh] flex flex-col items-center relative" onClick={(e) => e.stopPropagation()}>
            <div className="w-full flex items-center justify-between pb-3 text-white border-b border-slate-700 mb-3">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>التقرير الطبي الرسمي المرفق</span>
              </h4>
              <button
                type="button"
                onClick={() => setPreviewReportPhotoUrl(null)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={previewReportPhotoUrl}
              alt="التقرير الطبي المرفق"
              className="max-h-[75vh] w-auto max-w-full object-contain border-2 border-slate-700 rounded shadow-2xl"
            />
            <div className="mt-3 flex items-center gap-3">
              <a
                href={previewReportPhotoUrl}
                download="تقرير_طبي.jpg"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5 rotate-180" />
                <span>تحميل الصورة</span>
              </a>
              <button
                type="button"
                onClick={() => setPreviewReportPhotoUrl(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
