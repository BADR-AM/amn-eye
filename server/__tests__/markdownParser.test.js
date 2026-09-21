import { describe, it, expect } from 'vitest';
import { parseRecruitMarkdown } from '../markdownParser.js';

describe('Markdown Dossier Parser', () => {
  it('should parse standard YAML frontmatter with English keys', () => {
    const md = `---
name: "محمود حسن السيد إبراهيم"
national_id: "29810151609999"
police_number: "4321"
qualification: "عالي - ليسانس حقوق"
company: "السرية الثانية ( ٢ )"
birth_date: "1998-10-15"
attendance_date: "2026-09-22"
religion: "مسلم"
governorate: "الغربية"
address: "طنطا - شارع النحاس"
current_job: "محام حر"
father_name: "حسن السيد إبراهيم"
father_job: "معلم بالمعاش"
mother_name: "زينب محمود علي"
mother_job: "ربة منزل"
wife: "أعزب"
medical_status: "لائق أ"
inspection: "سليم"
is_psychological_case: 0
psychological_notes: "هادئ ومتزن"
---

# تقرير الاستجواب الأمني
- لا توجد سوابق جنائية للمجند.
- أفاد المجند بأنه لم يسافر للخارج إطلاقاً.
`;

    const result = parseRecruitMarkdown(md, 'recruit_01.md');
    expect(result.success).toBe(true);
    expect(result.error).toBe('');
    expect(result.data.name).toBe('محمود حسن السيد إبراهيم');
    expect(result.data.national_id).toBe('29810151609999');
    expect(result.data.police_number).toBe('4321');
    expect(result.data.qualification).toBe('عالي - ليسانس حقوق');
    expect(result.data.company).toBe('السرية الثانية ( ٢ )');
    expect(result.data.is_psychological_case).toBe(0);
    expect(result.data.notes).toContain('تقرير الاستجواب الأمني');
    expect(result.data.notes).toContain('لا توجد سوابق جنائية');
  });

  it('should parse Arabic keys and normalize Arabic-Indic digits', () => {
    const md = `---
الاسم: أحمد مصطفى كمال
الرقم القومي: ٢٩٩٠٥١٥١٦٠١٢٣٤
رقم الشرطة: ٩٨٧٦
السرية: السرية الثالثة ( ٣ )
المؤهل: متوسط
المهنة: فني تبريد وتكييف
الحالة النفسية: نعم
ملاحظات نفسية: يعاني من توتر ملحوظ وقلق دائم
---
ملاحظات إضافية: تم التوصية بالعرض على الطبيب النفسي.
`;

    const result = parseRecruitMarkdown(md, 'recruit_ar.md');
    expect(result.success).toBe(true);
    expect(result.data.name).toBe('أحمد مصطفى كمال');
    expect(result.data.national_id).toBe('29905151601234');
    expect(result.data.police_number).toBe('9876');
    expect(result.data.company).toBe('السرية الثالثة ( ٣ )');
    expect(result.data.is_psychological_case).toBe(1);
    expect(result.data.psychological_notes).toBe('يعاني من توتر ملحوظ وقلق دائم');
    expect(result.data.notes).toContain('تم التوصية بالعرض على الطبيب النفسي');
  });

  it('should reject invalid files missing name or with corrupted national ID', () => {
    const emptyMd = `---
qualification: عالي
---`;
    const res1 = parseRecruitMarkdown(emptyMd);
    expect(res1.success).toBe(false);
    expect(res1.error).toContain('اسم المجند مفقود');

    const badNidMd = `---
name: علي إبراهيم محمد
national_id: 12345
---`;
    const res2 = parseRecruitMarkdown(badNidMd);
    expect(res2.success).toBe(false);
    expect(res2.error).toContain('14 رقماً');
  });
});
