/**
 * Grounded Arabic Result Formatter
 *
 * Turns deterministic SQL query outputs into structured Arabic responses
 * with verified ground-truth counts, record citations, and follow-up suggestions.
 * Never invents records, statistics, or risk scores.
 */

export function formatQueryResult(intent, data, context = {}) {
  let responseText = '';
  let suggestions = [];
  let matchCount = 0;

  switch (intent) {
    case 'overview_kpi_summary': {
      responseText = `### 🛡️ المؤشرات العامة لمنظومة فحص وتسجيل المجندين\n\n`;
      responseText += `* **إجمالي المقيدين بالمنظومة:** **${data.total_recruits} مجند**\n`;
      responseText += `* **الدفع التجنيدي النشط:** **${data.active_batch}**\n`;
      responseText += `* **قوة سرية الأمن:** **${data.security_company_force} مجند** | **القوة الأساسية:** **${data.base_force} فرد**\n`;
      responseText += `* **اللائقون طبياً وسليمو المظهر:** **${data.medically_fit} مجند**\n`;
      responseText += `* **غير لائقين طبياً:** **${data.medically_unfit} مجند**\n`;
      responseText += `* **تيكتات الاشتباه المفتوحة:** **${data.open_tickets} تيكت**\n`;
      responseText += `* **الحالات النفسية قيد المتابعة:** **${data.psych_cases} حالة**\n\n`;
      responseText += `> [!NOTE]\n> كافة المؤشرات مستخرجة لحظياً من قاعدة البيانات المعتمدة لوحدة الأمن والتحريات.\n`;

      suggestions = ['حصر أفراد سرية الأمن', 'توزيع المؤهلات الدراسية', 'تيكتات الاشتباه الأمني'];
      matchCount = data.total_recruits;
      break;
    }

    case 'stats_by_batch': {
      responseText = `### 🎖️ حصر أعداد المجندين المقيدين بالدفوع التجنيدية\n\n`;
      if (Array.isArray(data) && data.length > 0) {
        responseText += `| الدفع التجنيدي | عدد المجندين | الحالة |\n`;
        responseText += `| :--- | :---: | :---: |\n`;
        for (const b of data) {
          const statusBadge = b.active ? '⭐ **نشط**' : 'سابق';
          responseText += `| **${b.name}** | ${b.recruit_count} مجند | ${statusBadge} |\n`;
        }
        matchCount = data.reduce((sum, b) => sum + (b.recruit_count || 0), 0);
      } else {
        responseText += `لا توجد دفوع تجنيدية مسجلة حالياً.\n`;
      }
      suggestions = ['توزيع السرايا', 'حصر المؤهلات الدراسية', 'أصحاب المهن والحرف'];
      break;
    }

    case 'stats_by_qualification': {
      responseText = `### 📊 تقرير حصر وتوزيع المؤهلات الدراسية\n\n`;
      if (Array.isArray(data) && data.length > 0) {
        const total = data.reduce((sum, item) => sum + item.count, 0);
        responseText += `إجمالي المجندين المحصورين: **${total} مجند**\n\n`;
        responseText += `| المؤهل الدراسي | عدد المجندين | النسبة المئوية |\n`;
        responseText += `| :--- | :---: | :---: |\n`;
        for (const q of data) {
          const pct = total > 0 ? ((q.count / total) * 100).toFixed(1) : '0';
          responseText += `| **${q.qualification}** | ${q.count} | ${pct}% |\n`;
        }
        matchCount = total;
      } else {
        responseText += `لم يتم رصد مؤهلات مسجلة بعد.\n`;
      }
      suggestions = ['أصحاب الحرف والمهن', 'توزيع السرايا', 'المجندين المتزوجين'];
      break;
    }

    case 'stats_by_company': {
      responseText = `### 🛡️ توزيع قوة المجندين على السرايا والوحدات\n\n`;
      if (Array.isArray(data) && data.length > 0) {
        responseText += `| السرية / الوحدة | إجمالي القوة المقيدة |\n`;
        responseText += `| :--- | :---: |\n`;
        for (const c of data) {
          responseText += `| **${c.company}** | ${c.count} مجند |\n`;
        }
        matchCount = data.reduce((sum, c) => sum + (c.count || 0), 0);
      } else {
        responseText += `لا توجد سرايا مسجلة.\n`;
      }
      suggestions = ['حصر سرية الأمن', 'المؤهلات العلمية', 'الحالات غير المتزنة نفسياً'];
      break;
    }

    case 'stats_by_medical_status': {
      responseText = `### 🩺 تقرير المناظرة الطبية ومستويات اللياقة\n\n`;
      responseText += `* **اللائقون طبياً وسليمو المظهر:** **${data.fit} مجند**\n`;
      responseText += `* **غير لائقين طبياً (قرارات طبية أو استبعاد):** **${data.unfit} مجند**\n`;
      responseText += `* **حالات قيد الفحص والمناظرة الطبية:** **${data.undetermined} مجند**\n`;
      responseText += `* **إحالات نشطة لمستشفيات الشرطة:** **${data.active_referrals} مجند**\n\n`;
      responseText += `> [!NOTE]\n> تم فصل حالات (غير لائق) تماماً لمنع أي تداخل إحصائي مع اللائقين.\n`;
      suggestions = ['تحركات مستشفيات الشرطة', 'الحالات غير المتزنة نفسياً', 'تيكتات الاشتباه الأمني'];
      matchCount = (data.fit || 0) + (data.unfit || 0) + (data.undetermined || 0);
      break;
    }

    case 'list_security_tickets': {
      responseText = `### ⚠️ تيكتات الاشتباه الأمني والمتابعة\n\n`;
      if (Array.isArray(data) && data.length > 0) {
        responseText += `تم رصد **${data.length} تيكت** مسجل بالمنظومة:\n\n`;
        for (const t of data) {
          responseText += `* **[تيكت #${t.id}] ${t.title || 'اشتباه'}** — المجند: **${t.recruit_name}** (\`${t.national_id || 'ـ'}\`) — السرية: \`${t.company || 'ـ'}\` — النوع: \`${t.ticket_type}\`\n`;
          if (t.description) responseText += `  * *ملاحظات:* ${t.description}\n`;
        }
        matchCount = data.length;
      } else {
        responseText += `لا توجد تيكتات اشتباه مفتوحة حالياً في السجلات.\n`;
      }
      suggestions = ['الحالات غير المتزنة نفسياً', 'حصر سرية الأمن', 'تحركات المستشفيات'];
      break;
    }

    case 'list_psychological_cases': {
      responseText = `### 🧠 بيان الحالات غير المتزنة نفسياً وعصبياً\n\n`;
      if (Array.isArray(data) && data.length > 0) {
        responseText += `تم حصر **${data.length} مجند** مقيدين كحالات تستوجب المتابعة الدورية:\n\n`;
        for (const p of data) {
          responseText += `* **${p.name}** — السرية: \`${p.company || 'ـ'}\` — الرقم القومي: \`${p.national_id || 'ـ'}\`\n`;
          if (p.psychological_notes) responseText += `  * *الملاحظة النفسية:* ${p.psychological_notes}\n`;
        }
        matchCount = data.length;
      } else {
        responseText += `لا توجد حالات نفسية أو عصبية مقيدة قيد الملاحظة حالياً.\n`;
      }
      suggestions = ['تحركات مستشفيات الشرطة', 'تيكتات الاشتباه الأمني', 'بيان اللياقة الطبية'];
      break;
    }

    case 'list_hospital_movements': {
      responseText = `### 🏥 بيان تحركات وإحالات مستشفيات الشرطة\n\n`;
      if (Array.isArray(data) && data.length > 0) {
        responseText += `تم حصر **${data.length} حركة إحالة طبية**:\n\n`;
        for (const a of data) {
          const retStatus = a.return_date ? `(عاد بتاريخ ${a.return_date})` : '⚠️ **(قيد التواجد بالمستشفى)**';
          responseText += `* **${a.recruit_name}** — الوجهة: \`${a.destination || 'مستشفى الشرطة'}\` — المغادرة: \`${a.departure_date || 'ـ'}\` ${retStatus}\n`;
        }
        matchCount = data.length;
      } else {
        responseText += `لا توجد حركات إحالة لمستشفيات الشرطة مسجلة.\n`;
      }
      suggestions = ['اللياقة الطبية للمجندين', 'الحالات غير المتزنة نفسياً', 'حصر أصحاب الحرف'];
      break;
    }

    case 'list_trades_and_crafts': {
      responseText = `### 🛠️ بيان أصحاب الحرف والمهن الفنية\n\n`;
      if (Array.isArray(data) && data.length > 0) {
        responseText += `تم حصر **${data.length} مجند** يمتلكون مهناً وحرفاً خاصة:\n\n`;
        responseText += `| اسم المجند | المهنة الحالية | السرية | محل الإقامة |\n`;
        responseText += `| :--- | :--- | :---: | :--- |\n`;
        for (const t of data) {
          responseText += `| **${t.name}** | ${t.current_job || 'ـ'} | ${t.company || 'ـ'} | ${t.address || 'ـ'} |\n`;
        }
        matchCount = data.length;
      } else {
        responseText += `لم يتم رصد حرفيين مسجلين حالياً.\n`;
      }
      suggestions = ['توزيع المؤهلات العلمية', 'حصر السرايا', 'بيان المتزوجين'];
      break;
    }

    case 'list_travel_cases': {
      responseText = `### ✈️ بيان المجندين الذين سبق لهم السفر خارج مصر\n\n`;
      if (Array.isArray(data) && data.length > 0) {
        responseText += `تم رصد **${data.length} مجند** مسجل لهم سابقة سفر للخارج:\n\n`;
        for (const tr of data) {
          responseText += `* **${tr.name}** — السرية: \`${tr.company || 'ـ'}\` — السفر: \`${tr.travel_abroad}\` — العنوان: \`${tr.address || 'ـ'}\`\n`;
        }
        matchCount = data.length;
      } else {
        responseText += `لا يوجد مجندين مسجل لهم سابقة سفر للخارج في السجلات الحالية.\n`;
      }
      suggestions = ['تيكتات الاشتباه الأمني', 'توزيع المحافظات', 'أصحاب المهن'];
      break;
    }

    case 'stats_by_marital_status': {
      responseText = `### 💍 تقرير الحالة الاجتماعية للمجندين\n\n`;
      responseText += `* **المتزوجون:** **${data.married} مجند**\n`;
      responseText += `* **العزاب:** **${data.single} مجند**\n`;
      responseText += `* **إجمالي القوة:** **${data.total} مجند**\n\n`;
      suggestions = ['توزيع المؤهلات العلمية', 'توزيع الديانة', 'حصر الحرفيين'];
      matchCount = data.total;
      break;
    }

    case 'stats_by_religion': {
      responseText = `### 🕌✝️ تقرير توزيع الديانة للمجندين\n\n`;
      if (Array.isArray(data) && data.length > 0) {
        for (const r of data) {
          responseText += `* **${r.religion}:** **${r.count} مجند**\n`;
        }
        matchCount = data.reduce((s, r) => s + r.count, 0);
      }
      suggestions = ['الحالة الاجتماعية', 'توزيع السرايا', 'المؤهلات العلمية'];
      break;
    }

    case 'get_recruit_by_national_id': {
      if (data) {
        responseText = `### 👤 بيانات استعلام المجند:\n\n`;
        responseText += `* **الاسم:** **${data.name}**\n`;
        responseText += `* **الرقم القومي:** \`${data.national_id}\`\n`;
        responseText += `* **كود المجند:** \`${data.recruit_code || 'غير محدد'}\`\n`;
        responseText += `* **الدفع:** ${data.batch_name || 'ـ'}\n`;
        responseText += `* **السرية:** \`${data.company || 'ـ'}\`\n`;
        responseText += `* **المؤهل:** ${data.qualification || 'ـ'}\n`;
        responseText += `* **المهنة:** ${data.current_job || 'بدون'}\n`;
        responseText += `* **الموقف الطبي:** ${data.medical_status || 'ـ'}\n`;
        matchCount = 1;
        suggestions = [`فحص سجلات سرية ${data.company || ''}`, 'تيكتات اشتباه المجند', 'المؤهلات العلمية'];
      } else {
        responseText = `لم يتم العثور على أي مجند مسجل بهذا الرقم القومي في قاعدة البيانات.\n`;
      }
      break;
    }

    case 'search_recruits':
    default: {
      const searchRes = data || { results: [], total: 0 };
      const items = searchRes.results || [];
      matchCount = searchRes.total || items.length;

      responseText = `### 🔍 نتائج البحث في قاعدة بيانات المجندين\n\n`;
      if (items.length === 0) {
        responseText += `لا توجد نتائج مطابقة لبحثك في السجلات الحالية.\n`;
        suggestions = ['عرض المؤشرات العامة', 'حصر الدفوع التجنيدية', 'أصحاب المهن والحرف'];
      } else {
        responseText += `تم العثور على **${matchCount} سجل** مطابق:\n\n`;
        for (const r of items) {
          responseText += `* **${r.name}** — السرية: \`${r.company || 'ـ'}\` — الرقم القومي: \`${r.national_id || 'ـ'}\` — ${r.batch_name || ''} (${r.qualification || 'ـ'})\n`;
        }
        suggestions = ['حصر أفراد سرية هذا المجند', 'الموقف الطبي والمناظرة', 'توزيع المؤهلات الدراسية'];
      }
      break;
    }
  }

  return {
    responseText,
    suggestions,
    matchCount
  };
}
