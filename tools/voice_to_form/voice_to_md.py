#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AMN-Eye Offline Voice-to-Form Module
------------------------------------
Standalone AI helper tool that runs 100% offline on CPU.
Transcribes audio interviews via Faster-Whisper and exports structured recruit dossiers
in standardized Markdown (.md) format for ingestion into SecurityEye.
"""

import os
import sys
import re
import json
from datetime import datetime

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output_forms")
os.makedirs(OUTPUT_DIR, exist_ok=True)

TEMPLATE_MD = """---
name: "{name}"
national_id: "{national_id}"
police_number: "{police_number}"
qualification: "{qualification}"
company: "{company}"
birth_date: "{birth_date}"
attendance_date: "{attendance_date}"
religion: "{religion}"
governorate: "{governorate}"
address: "{address}"
current_job: "{current_job}"
other_jobs: "{other_jobs}"
travel_abroad: "{travel_abroad}"
literacy: "{literacy}"
father_name: "{father_name}"
father_job: "{father_job}"
mother_name: "{mother_name}"
mother_job: "{mother_job}"
wife: "{wife}"
siblings_check: "{siblings_check}"
medical_status: "{medical_status}"
inspection: "{inspection}"
is_psychological_case: {is_psychological_case}
psychological_notes: "{psychological_notes}"
---

# تقرير المقابلة والاستجواب الصوتي (تفريغ آلي)
{transcription}
"""

def extract_entities_from_text(text: str) -> dict:
    """
    Extracts structured fields from raw interview transcript using pattern recognition.
    """
    data = {
        "name": "",
        "national_id": "",
        "police_number": "",
        "qualification": "متوسط",
        "company": "السرية الأولى ( ١ )",
        "birth_date": "",
        "attendance_date": datetime.now().strftime("%Y-%m-%d"),
        "religion": "مسلم",
        "governorate": "الغربية",
        "address": "",
        "current_job": "",
        "other_jobs": "",
        "travel_abroad": "لم يسافر",
        "literacy": "يجيد",
        "father_name": "",
        "father_job": "",
        "mother_name": "",
        "mother_job": "",
        "wife": "أعزب",
        "siblings_check": "",
        "medical_status": "لائق طبياً وسليم",
        "inspection": "سليم",
        "is_psychological_case": 0,
        "psychological_notes": "",
    }

    # National ID (14 consecutive digits)
    nid_match = re.search(r'\b(2|3)\d{13}\b', text)
    if nid_match:
        data["national_id"] = nid_match.group(0)

    # Qualification
    if re.search(r'(جامع|بكالوريوس|ليسانس|عالي|مهندس|طبيب|حقوق|تجارة|تربية)', text):
        data["qualification"] = "عليا"
    elif re.search(r'(دبلوم|صنايع|تجارة|زراعة|متوسط|ثانوي)', text):
        data["qualification"] = "متوسط"
    elif re.search(r'(فوق متوسط|معهد سنتين)', text):
        data["qualification"] = "فوق متوسط"
    elif re.search(r'(إعدادي|ابتدائي|أمي|محو أمية)', text):
        data["qualification"] = "عادة"

    # Religion
    if re.search(r'(مسيحي|قبطي|جرجس|مينا|بولس)', text):
        data["religion"] = "مسيحي"

    # Name pattern
    name_match = re.search(r'(اسمي|اسمه|المجند)\s+([^\n\.,]+)', text)
    if name_match:
        cand = name_match.group(2).strip()
        words = cand.split()
        if len(words) >= 3:
            data["name"] = " ".join(words[:4])

    return data

def save_recruit_md(recruit_data: dict, transcription: str) -> str:
    """
    Saves recruit dossier to .md file in OUTPUT_DIR.
    """
    clean_name = re.sub(r'[^\w\s-]', '', recruit_data.get("name", "recruit")).strip().replace(" ", "_")
    if not clean_name:
        clean_name = f"recruit_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    filename = f"{clean_name}.md"
    file_path = os.path.join(OUTPUT_DIR, filename)

    content = TEMPLATE_MD.format(
        name=recruit_data.get("name", ""),
        national_id=recruit_data.get("national_id", ""),
        police_number=recruit_data.get("police_number", ""),
        qualification=recruit_data.get("qualification", "متوسط"),
        company=recruit_data.get("company", "السرية الأولى ( ١ )"),
        birth_date=recruit_data.get("birth_date", ""),
        attendance_date=recruit_data.get("attendance_date", datetime.now().strftime("%Y-%m-%d")),
        religion=recruit_data.get("religion", "مسلم"),
        governorate=recruit_data.get("governorate", "الغربية"),
        address=recruit_data.get("address", ""),
        current_job=recruit_data.get("current_job", ""),
        other_jobs=recruit_data.get("other_jobs", ""),
        travel_abroad=recruit_data.get("travel_abroad", "لم يسافر"),
        literacy=recruit_data.get("literacy", "يجيد"),
        father_name=recruit_data.get("father_name", ""),
        father_job=recruit_data.get("father_job", ""),
        mother_name=recruit_data.get("mother_name", ""),
        mother_job=recruit_data.get("mother_job", ""),
        wife=recruit_data.get("wife", "أعزب"),
        siblings_check=recruit_data.get("siblings_check", ""),
        medical_status=recruit_data.get("medical_status", "لائق طبياً وسليم"),
        inspection=recruit_data.get("inspection", "سليم"),
        is_psychological_case=recruit_data.get("is_psychological_case", 0),
        psychological_notes=recruit_data.get("psychological_notes", ""),
        transcription=transcription.strip() or "تم إنشاء الملف عبر المعالجة الآلية للمقابلة."
    )

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

    return file_path

def main():
    print("=" * 60)
    print("   منظومة تفريغ المقابلات الصوتية واستخراج استمارات المجندين")
    print("   AMN-Eye Offline Voice-to-Form Helper (v2.3 Standalone)")
    print("=" * 60)

    audio_file = None
    if len(sys.argv) > 1:
        audio_file = sys.argv[1]

    if audio_file and os.path.isfile(audio_file):
        print(f"\n[+] جارٍ معالجة ملف الصوت: {audio_file}")
        try:
            from faster_whisper import WhisperModel
            print("[+] تحميل نموذج Faster-Whisper (CPU - int8)...")
            model = WhisperModel("base", device="cpu", compute_type="int8")
            segments, info = model.transcribe(audio_file, language="ar", beam_size=3)
            transcription = " ".join([seg.text for seg in segments])
            print(f"[+] تم التفريغ بنجاح ({len(transcription)} حرف)")
        except ImportError:
            print("[!] مكتبة faster-whisper غير مثبتة. يرجى تثبيتها: pip install faster-whisper")
            transcription = input("\nيرجى إدخال نص المقابلة يدوياً للمتابعة:\n> ")
    else:
        print("\n[i] لم يتم تحديد ملف صوتي أو تشغيل التسجيل.")
        print("يمكنك تشغيل: python voice_to_md.py <audio_file.wav>")
        print("أو إدخال بيانات تجريبية الآن:\n")
        name = input("اسم المجند: ").strip() or "محمد عبد الله حسن"
        nid = input("الرقم القومي (14 رقم): ").strip() or "29901011600000"
        qual = input("المؤهل: ").strip() or "متوسط - دبلوم"
        company = input("السرية: ").strip() or "السرية الأولى ( ١ )"
        transcription = input("ملاحظات المقابلة: ").strip() or "المجند حسن السير والسلوك، لائق للمهام."

        data = {
            "name": name,
            "national_id": nid,
            "qualification": qual,
            "company": company,
        }
        saved_file = save_recruit_md(data, transcription)
        print(f"\n[✅] تم تصدير ملف الاستمارة بنجاح إلى:\n    {saved_file}")
        print("\nيمكنك الآن سحب هذا الملف وإفلاته داخل برنامج SecurityEye لاستيراده فوراً!")
        return

    extracted = extract_entities_from_text(transcription)
    saved_file = save_recruit_md(extracted, transcription)
    print(f"\n[✅] تم إنشاء ملف الاستمارة القياسي (.md) بنجاح:\n    {saved_file}")

if __name__ == "__main__":
    main()
