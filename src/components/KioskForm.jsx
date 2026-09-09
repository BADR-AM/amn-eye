import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  CornerDownLeft, 
  ShieldAlert, 
  Sparkles,
  Camera,
  X,
  Calendar,
  CreditCard,
  User,
  Heart,
  Home,
  Briefcase,
  Globe,
  BookOpen,
  Eye,
  Activity,
  Users
} from 'lucide-react';
import { parseEgyptianNationalId } from '../utils/nationalId';

export default function KioskForm({ activeBatch, onComplete, onCancel, initialData }) {
  const [currentStep, setCurrentStep] = useState(0);
  const inputRef = useRef(null);

  // Form state holding all 20 official fields
  const [formData, setFormData] = useState(initialData || {
    batch_id: activeBatch ? activeBatch.id : 1,
    attendance_date: new Date().toISOString().split('T')[0],
    name: '',
    religion: 'مسلم',
    qualification: 'متوسط',
    national_id: '',
    birth_date: '',
    wife: 'أعزب',
    address: '',
    current_job: 'بدون عمل',
    other_jobs: 'لا يوجد',
    travel_abroad: 'لم يسافر خارج البلاد',
    literacy: 'يجيد القراءة والكتابة',
    inspection: 'بنية جيدة - لا توجد علامات مميزة أو وشم - سلوك معتدل',
    medical_status: 'لائق طبياً وسليم ظاهرياً',
    father_name: '',
    father_job: 'عامل',
    mother_name: '',
    mother_job: 'ربة منزل',
    siblings_check: 'لا توجد ملاحظات أمنية على الأشقاء',
    family_social_status: 'الأسرة مستقرة والوالدان على قيد الحياة',
    family_security_status: 'العائلة خالية من السوابق والشبهات الجنائية والسياسية',
    police_number: '',
    company: 'السرية الثالثة ( ٣ )'
  });

  // Questions configuration
  const questions = [
    {
      id: 'name',
      title: 'الاسم الرباعي للمجند',
      subtitle: 'اكتب الاسم الرباعي بالكامل كما هو مدون ببطاقة الرقم القومي',
      icon: User,
      type: 'text',
      placeholder: 'مثال: أحمد محمد علي إبراهيم',
      required: true,
    },
    {
      id: 'religion',
      title: 'الديانة',
      subtitle: 'اختر ديانة المجند (اضغط 1 أو 2 ثم Enter)',
      icon: Heart,
      type: 'choice',
      options: ['مسلم', 'مسيحي'],
    },
    {
      id: 'qualification',
      title: 'المؤهل الدراسي',
      subtitle: 'اختر المؤهل الدراسي أو اكتب التخصص',
      icon: BookOpen,
      type: 'choice_or_text',
      options: ['عالي', 'فوق متوسط', 'متوسط', 'عادة', 'محو أمية'],
      placeholder: 'أو اكتب المؤهل بالتفصيل...',
    },
    {
      id: 'national_id',
      title: 'رقم البطاقة (الرقم القومي)',
      subtitle: 'أدخل الـ 14 رقماً للبطاقة القومية (سيتم استخراج الميلاد والمحافظة تلقائياً)',
      icon: CreditCard,
      type: 'national_id',
      placeholder: 'مثال: 30105151601234',
      required: true,
    },
    {
      id: 'birth_date',
      title: 'تاريخ الميلاد',
      subtitle: 'تاريخ ميلاد المجند (تم استخراجه تلقائياً ويمكن تعديله)',
      icon: Calendar,
      type: 'date',
    },
    {
      id: 'wife',
      title: 'الحالة الاجتماعية / الزوجة',
      subtitle: 'اختر الحالة الاجتماعية للمجند أو اكتب اسم الزوجة إذا كان متزوجاً',
      icon: Users,
      type: 'choice_or_text',
      options: ['أعزب', 'متزوج', 'مطلق'],
      placeholder: 'أو اكتب: متزوج من...',
    },
    {
      id: 'address',
      title: 'عنوان السكن بالتفصيل',
      subtitle: 'المحافظة / المركز أو القسم / القرية أو الشارع ورقم المنزل',
      icon: Home,
      type: 'text',
      placeholder: 'مثال: الغربية - طنطا - ش الجيش',
    },
    {
      id: 'current_job',
      title: 'المهنة الحالية',
      subtitle: 'المهنة الفعلية التي كان يعمل بها المجند قبل تجنيده',
      icon: Briefcase,
      type: 'choice_or_text',
      options: ['عامل', 'سائق', 'نجار', 'حداد', 'محاسب', 'مدرس', 'طالب', 'بدون عمل'],
      placeholder: 'أو اكتب المهنة...',
    },
    {
      id: 'other_jobs',
      title: 'مهن وحرف أخرى',
      subtitle: 'أي حرف أو مهارات إضافية يجيدها المجند (صيانة، سباكة، كهرباء، إلخ)',
      icon: Briefcase,
      type: 'choice_or_text',
      options: ['لا يوجد', 'كهربائي', 'سباك', 'مبلط', 'ميكانيكي', 'نقاش'],
      placeholder: 'أو اكتب الحرفة...',
    },
    {
      id: 'travel_abroad',
      title: 'السفر خارج البلاد',
      subtitle: 'هل سافر المجند خارج مصر؟',
      icon: Globe,
      type: 'choice_or_text',
      options: ['لم يسافر خارج البلاد', 'سافر للعمل بالخارج', 'سافر للسياحة'],
      placeholder: 'أو اذكر الدولة والغرض...',
    },
    {
      id: 'literacy',
      title: 'إجادة القراءة والكتابة',
      subtitle: 'مستوى القراءة والكتابة الفعلي للمجند',
      icon: BookOpen,
      type: 'choice',
      options: ['يجيد القراءة والكتابة', 'يقرأ ويكتب بصعوبة', 'لا يجيد (أمي)'],
    },
    {
      id: 'inspection',
      title: 'مناظرة المجند',
      subtitle: 'المظهر الخارجي، الطول، البنية الجسدية، أي وشم أو علامات مميزة، السلوك',
      icon: Eye,
      type: 'textarea',
      options: [
        'بنية جيدة - لا توجد علامات مميزة أو وشم - سلوك معتدل',
        'بنية نحيفة - خالي من الوشم والعلامات - سليم المظهر',
        'يوجد جرح قديم سطحي - سليم المظهر'
      ],
    },
    {
      id: 'medical_status',
      title: 'الحالة المرضية للمجند',
      subtitle: 'هل يعاني من أي أمراض مزمنة أو خضع لعمليات جراحية؟',
      icon: Activity,
      type: 'textarea',
      options: [
        'لائق طبياً وسليم ظاهرياً',
        'أجرى عملية استئصال زائدة دودية قديمة',
        'يعاني من حساسية صدرية خفيفة'
      ],
    },
    {
      id: 'father_name',
      title: 'اسم الوالد',
      subtitle: 'الاسم الثلاثي أو الرباعي لوالد المجند',
      icon: User,
      type: 'text',
      placeholder: 'اسم الوالد...',
    },
    {
      id: 'father_job',
      title: 'مهنة الوالد',
      subtitle: 'وظيفة أو مهنة الوالد الحالية أو السابقة',
      icon: Briefcase,
      type: 'choice_or_text',
      options: ['على المعاش', 'عامل', 'مزارع', 'موظف حكومي', 'سائق', 'تاجر', 'متوفى'],
      placeholder: 'أو اكتب مهنة الوالد...',
    },
    {
      id: 'mother_name',
      title: 'اسم الأم',
      subtitle: 'الاسم الثلاثي لوالدة المجند',
      icon: User,
      type: 'text',
      placeholder: 'اسم الأم...',
    },
    {
      id: 'mother_job',
      title: 'مهنة الأم',
      subtitle: 'وظيفة أو عمل والدة المجند',
      icon: Briefcase,
      type: 'choice_or_text',
      options: ['ربة منزل', 'موظفة', 'معلمة', 'متوفاة'],
      placeholder: 'أو اكتب مهنة الأم...',
    },
    {
      id: 'siblings_check',
      title: 'فحص الإخوة',
      subtitle: 'عدد الأشقاء (ذكور وإناث) وملاحظات الفحص الأمني عليهم',
      icon: Users,
      type: 'textarea',
      options: [
        'لا توجد ملاحظات أمنية على الأشقاء',
        'له 2 أشقاء ذكور و 1 إناث - لا توجد ملاحظات',
        'الابن الوحيد لوالديه'
      ],
    },
    {
      id: 'family_social_status',
      title: 'الحالة الاجتماعية للعائلة',
      subtitle: 'مدى استقرار الأسرة والعلاقات الأسرية',
      icon: Home,
      type: 'choice_or_text',
      options: [
        'الأسرة مستقرة والوالدان على قيد الحياة',
        'الوالد متوفى والأسرة مستقرة',
        'الوالدان منفصلان',
        'كلا الوالدين متوفى'
      ],
      placeholder: 'أو اكتب تفاصيل إضافية...',
    },
    {
      id: 'family_security_status',
      title: 'الحالة السياسية والجنائية للعائلة',
      subtitle: 'موقف العائلة من السوابق والقضايا أو الشبهات الأمنية والسياسية',
      icon: ShieldAlert,
      type: 'textarea',
      options: [
        'العائلة خالية من السوابق والشبهات الجنائية والسياسية',
        'موقف أمني نظيف تماماً بالتحريات',
        'يوجد سابقة جنائية مشاجرة قديمة لأحد الأقارب'
      ],
    },
    {
      id: 'police_number',
      title: 'رقم الشرطة (رقم السلاح / القيد)',
      subtitle: 'أدخل رقم الشرطة الخاص بالمجند المطبوع على كارت الدولاب (اختياري)',
      icon: CreditCard,
      type: 'text',
      placeholder: 'مثال: ١٢٤٩٢٣ أو 124923',
    },
    {
      id: 'company',
      title: 'السرية / الكتيبة',
      subtitle: 'اختر أو اكتب السرية التابع لها المجند لتظهر على كارت الدولاب',
      icon: ShieldAlert,
      type: 'choice_or_text',
      options: [
        'السرية الأولى ( ١ )',
        'السرية الثانية ( ٢ )',
        'السرية الثالثة ( ٣ )',
        'السرية الرابعة ( ٤ )',
        'السرية الخامسة ( ٥ )',
        'السرية السادسة ( ٦ )'
      ],
      placeholder: 'أو اكتب السرية...',
    }
  ];

  const currentQ = questions[currentStep];

  // Auto focus input when step changes
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current.select) {
        inputRef.current.select();
      }
    }
  }, [currentStep]);

  // If father's name is empty, auto-suggest from recruit's full name
  useEffect(() => {
    if (currentQ.id === 'father_name' && !formData.father_name && formData.name) {
      const parts = formData.name.trim().split(/\s+/);
      if (parts.length >= 2) {
        const derivedFather = parts.slice(1).join(' ');
        setFormData(prev => ({ ...prev, father_name: derivedFather }));
      }
    }
  }, [currentStep]);

  // Handle value change
  const handleChange = (val) => {
    setFormData(prev => {
      const updated = { ...prev, [currentQ.id]: val };

      // Auto-extract birth date & governorate when national ID is typed
      if (currentQ.id === 'national_id' && val.trim().length === 14) {
        const parsed = parseEgyptianNationalId(val);
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

  // Next step handler
  const handleNext = () => {
    // Basic validation for required fields
    if (currentQ.required && (!formData[currentQ.id] || !formData[currentQ.id].trim())) {
      alert(`يرجى ملء حقل "${currentQ.title}" للمتابعة.`);
      return;
    }

    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Completed all 20 questions -> Proceed to Camera & Media Capture
      onComplete(formData);
    }
  };

  // Previous step handler
  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Global key listener for Enter and Shift+Enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // If it's a textarea, allow Shift+Enter for new line, normal Enter for Next
      if (e.target.tagName !== 'TEXTAREA' || e.ctrlKey || !e.shiftKey) {
        e.preventDefault();
        handleNext();
      }
    } else if (e.key === 'ArrowUp' && e.altKey) {
      e.preventDefault();
      handlePrev();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const progressPercent = Math.round(((currentStep + 1) / questions.length) * 100);
  const IconComp = currentQ.icon || User;

  return (
    <div 
      className="fixed inset-0 z-50 bg-darkslate-950/95 backdrop-blur-md flex flex-col justify-between p-6 sm:p-10 select-none overflow-y-auto"
      onKeyDown={handleKeyDown}
    >
      {/* Top Header & Progress */}
      <div className="max-w-4xl w-full mx-auto">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <IconComp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-emerald-400">
                نمط الإدخال السريع (Kiosk POS Mode)
              </span>
              <h2 className="text-sm font-bold text-slate-300">
                {activeBatch ? activeBatch.name : 'الدفع التجنيدي المعتمد'}
              </h2>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700 text-xs transition-colors"
            title="إلغاء والعودة للداشبورد (Esc)"
          >
            <X className="w-4 h-4" />
            <span>خروج (Esc)</span>
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-800/80 h-2.5 rounded-full overflow-hidden border border-slate-700/50 p-0.5">
          <div 
            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1.5 font-medium">
          <span>السؤال {currentStep + 1} من {questions.length}</span>
          <span className="text-emerald-400 font-bold">{progressPercent}% مكتمل</span>
        </div>
      </div>

      {/* Main Focus Question Container */}
      <div className="max-w-3xl w-full mx-auto my-auto py-8">
        
        {/* Question Title & Subtitle */}
        <div className="mb-6 text-center sm:text-right">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
            البند رقم {currentStep + 1}
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            {currentQ.title}
          </h1>
          <p className="text-slate-400 text-sm sm:text-base mt-2">
            {currentQ.subtitle}
          </p>
        </div>

        {/* Input Area */}
        <div className="space-y-4">
          
          {/* Quick Choice Buttons for choice-based questions */}
          {currentQ.options && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {currentQ.options.map((opt, idx) => {
                const isSelected = formData[currentQ.id] === opt;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      handleChange(opt);
                      // Auto advance on single choice click
                      setTimeout(handleNext, 150);
                    }}
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-sm font-bold transition-all ${
                      isSelected
                        ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-950/50 scale-[1.02]'
                        : 'bg-darkslate-850 hover:bg-slate-800 border-slate-700/80 text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    <span className="truncate">{opt}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                      {idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Text / Date / Textarea Field */}
          {currentQ.type === 'textarea' ? (
            <textarea
              ref={inputRef}
              rows={3}
              value={formData[currentQ.id] || ''}
              onChange={(e) => handleChange(e.target.value)}
              className="w-full bg-darkslate-900 border-2 border-slate-700 focus:border-emerald-500 rounded-2xl p-4 text-lg sm:text-xl font-medium text-white focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all placeholder:text-slate-600"
              placeholder={currentQ.placeholder || 'اكتب هنا واضغط Enter...'}
            />
          ) : currentQ.type === 'date' ? (
            <input
              ref={inputRef}
              type="date"
              value={formData[currentQ.id] || ''}
              onChange={(e) => handleChange(e.target.value)}
              className="w-full bg-darkslate-900 border-2 border-slate-700 focus:border-emerald-500 rounded-2xl p-4 text-xl sm:text-2xl font-bold text-white focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all"
            />
          ) : currentQ.type !== 'choice' ? (
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={formData[currentQ.id] || ''}
                onChange={(e) => handleChange(e.target.value)}
                maxLength={currentQ.id === 'national_id' ? 14 : undefined}
                className="w-full bg-darkslate-900 border-2 border-slate-700 focus:border-emerald-500 rounded-2xl p-4 pr-5 text-xl sm:text-2xl font-bold text-white focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all placeholder:text-slate-600"
                placeholder={currentQ.placeholder || 'اكتب هنا واضغط Enter...'}
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-slate-500 text-xs bg-slate-800/80 px-2 py-1 rounded-md border border-slate-700">
                <span>اضغط Enter</span>
                <CornerDownLeft className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            </div>
          ) : null}

          {/* National ID live badge detection feedback */}
          {currentQ.id === 'national_id' && formData.national_id && formData.national_id.length === 14 && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                رقم قومي صحيح - تم استخراج تاريخ الميلاد والمحافظة تلقائياً
              </span>
              <span className="font-bold">{formData.birth_date}</span>
            </div>
          )}

        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="max-w-4xl w-full mx-auto pt-4 border-t border-slate-800 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentStep === 0}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-sm transition-all"
        >
          <ArrowRight className="w-4 h-4" />
          <span>السابق</span>
        </button>

        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400">
          <span>التنقل السريع:</span>
          <kbd className="px-2 py-1 bg-slate-800 rounded text-slate-300 font-mono border border-slate-700">Enter التالي</kbd>
          <kbd className="px-2 py-1 bg-slate-800 rounded text-slate-300 font-mono border border-slate-700">Alt + ↑ السابق</kbd>
        </div>

        <button
          type="button"
          onClick={handleNext}
          className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-950/60 transform hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <span>{currentStep === questions.length - 1 ? 'الانتقال لمحطة الكاميرا' : 'التالي'}</span>
          {currentStep === questions.length - 1 ? (
            <Camera className="w-4 h-4 text-white animate-pulse" />
          ) : (
            <ArrowLeft className="w-4 h-4" />
          )}
        </button>
      </div>

    </div>
  );
}
