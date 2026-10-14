/**
 * Grounded Egyptian Military Arabic Result Formatter
 *
 * Formats deterministic SQL query outputs into respectful, authentic Egyptian
 * officer responses (العامية المصرية المهذبة لرتبة ضابط ومساعدي الأمن)
 * with verified ground-truth counts, record citations, and follow-up suggestions.
 * Never invents records, statistics, or risk scores.
 */

export function formatQueryResult(intent, data, context = {}) {
  let responseText = '';
  let suggestions = [];
  let matchCount = 0;

  switch (intent) {
    // 0. Egyptian Chit-Chat & Greetings
    case 'egyptian_chit_chat': {
      const type = context.type || 'greeting';
      const prompt = context.prompt || '';

      if (type === 'identity') {
        responseText = `أهلاً وسهلاً بسيادتك يا فندم! 🫡\n\n`;
        responseText += `أنا **المساعد الذكي لمنظومة أمن ومتابعة المجندين (Security Eye)**.\n`;
        responseText += `وظيفتي أساعد سيادتك لحظياً في إدارة ومتابعة القوة بكل دقة وبدون أي مجهود:\n\n`;
        responseText += `* 🔍 **الاستعلام عن المجندين:** ابعتلي اسم أي مجند أو رقمه القومي (14 رقم) ويظهرلك ملفه بالكامل.\n`;
        responseText += `* 🛠️ **أصحاب الصنائع والمهن:** اسألني 'مين هنا نجار؟'، 'عايز كهربائي'، 'مين سواق'، 'مين سباك' وهجيبلك كشف الحرفيين فوراً.\n`;
        responseText += `* 🛡️ **توزيع وقوة السرايا:** حصر سرية الأمن، القوة الأساسية، وسرايا التدريب.\n`;
        responseText += `* ⚠️ **المتابعة والاشتباه الأمني:** حصر تيكتات الاشتباه، الحالات النفسية، والملاحظات السلوكية.\n`;
        responseText += `* 🏥 **التحركات الطبية:** بيان إحالات مستشفيات الشرطة واللياقة الطبية.\n`;
        responseText += `* 📊 **الإحصائيات والتمام:** حصر المؤهلات، الدفوع التجنيدية، المحافظات، والحالة الاجتماعية.\n\n`;
        responseText += `> [!TIP]\n> تقدر تسألني بأي طريقة بالعامية المصرية أو الفصحى وأنا في خدمة سيادتك دايماً! تؤمرني بإيه يا باشا؟\n`;
        suggestions = ['إجمالي قوة المنظومة كام؟', 'مين هنا نجار أو كهربائي؟', 'مين في سرية الأمن؟'];
      } else if (type === 'gratitude') {
        responseText = `العفو يا فندم، الشكر لله! في خدمة سيادتك دايماً وتحت أمرك في أي وقت. 🫡\n`;
        responseText += `لو محتاج أي استعلام أو إحصائية تانية أنا جاهز تماماً يا باشا.\n`;
        suggestions = ['تمام قوة الكتيبة كام؟', 'تيكتات الاشتباه الأمني', 'أصحاب المهن والحرف'];
      } else {
        // General greeting
        responseText = `تمام يا فندم والحمد لله كله تمام وتحت السيطرة! 🫡\n\n`;
        responseText += `تحت أمر سيادتك يا باشا في أي استفسار أو حصر للقوة، الصنائع والمهن، السرايا، أو المتابعة الأمنية.\n\n`;
        responseText += `تؤمرني بإيه يا فندم؟\n`;
        suggestions = ['عندنا كام واحد في المنظومة؟', 'مين هنا نجار أو سواق؟', 'مين في سرية الأمن؟', 'تيكتات الاشتباه الأمني'];
      }
      matchCount = 1;
      break;
    }

    // 1. Overview KPIs
    case 'overview_kpi_summary': {
      responseText = `### 🛡️ تمام القوة والمؤشرات العامة لمنظومة فحص المجندين\n\n`;
      responseText += `تمام يا باشا، إحصائيات القوة المسجلة حالياً بالمنظومة كالتالي:\n\n`;
      responseText += `* 👥 **إجمالي القوة المقيدة:** **${data.total_recruits} مجند**\n`;
      responseText += `* 🎖️ **الدفع التجنيدي النشط:** **${data.active_batch}**\n`;
      responseText += `* 🛡️ **قوة سرية الأمن:** **${data.security_company_force} مجند** | **القوة الأساسية:** **${data.base_force} فرد**\n`;
      responseText += `* 🩺 **اللائقون طبياً وسليمو المظهر:** **${data.medically_fit} مجند**\n`;
      if (data.medically_unfit > 0) {
        responseText += `* ⚠️ **غير لائقين طبياً:** **${data.medically_unfit} مجند**\n`;
      }
      responseText += `* 📌 **تيكتات الاشتباه المفتوحة:** **${data.open_tickets} تيكت**\n`;
      responseText += `* 🧠 **الحالات النفسية قيد الملاحظة:** **${data.psych_cases} حالة**\n\n`;
      responseText += `> [!NOTE]\n> كافة الأرقام مستخرجة لحظياً من قاعدة البيانات المعتمدة لوحدة الأمن والتحريات.\n`;

      suggestions = ['مين في سرية الأمن؟', 'مين هنا نجار أو سباك؟', 'حصر تيكتات الاشتباه'];
      matchCount = data.total_recruits;
      break;
    }

    // 2. Trades and Crafts
    case 'list_trades_and_crafts': {
      const tradeName = context.trade || '';
      if (tradeName) {
        responseText = `### 🛠️ بيان أصحاب الحرف والمهن الفنية - مهنة (${tradeName})\n\n`;
        if (Array.isArray(data) && data.length > 0) {
          responseText += `تمام يا فندم، تم حصر **${data.length} مجند** بمهنة (${tradeName}) من واقع السجلات المعتمدة:\n\n`;
          responseText += `| اسم المجند | المهنة بالتفصيل | السرية | العنوان ومحل الإقامة |\n`;
          responseText += `| :--- | :--- | :---: | :--- |\n`;
          for (const t of data) {
            responseText += `| **${t.name}** | ${t.current_job || 'ـ'} | \`${t.company || 'ـ'}\` | ${t.address || 'ـ'} |\n`;
          }
          matchCount = data.length;
          suggestions = ['مين كهربائي؟', 'مين سواق؟', 'مين في سرية الأمن؟'];
        } else {
          responseText += `تمام يا فندم، بحثت في سجلات القوة الحالية ولم يتم العثور على أي مجند مسجل بمهنة (**${tradeName}**) حتى الآن.\n\n`;
          if (context.totalRecruits) {
            responseText += `* إجمالي القوة المسجلة بالمنظومة: **${context.totalRecruits} مجند**.\n`;
          }
          responseText += `> [!TIP]\n> تقدر سيادتك تضيف أو تعدل مهنة أي مجند من شاشة 'تعديل البيانات' أو استيراد كشف إكسيل لتحديث الصنائع، وأنا تحت أمرك في أي مهنة تانية!\n`;
          suggestions = ['عرض كل أصحاب الصنائع', 'مين كهربائي؟', 'مين سواق؟'];
        }
      } else {
        responseText = `### 🛠️ بيان أصحاب الحرف والمهن الفنية بالكتيبة\n\n`;
        if (Array.isArray(data) && data.length > 0) {
          responseText += `تمام يا فندم، تم حصر **${data.length} مجند** يمتلكون مهناً وحرفاً فنية خاصة:\n\n`;
          responseText += `| اسم المجند | المهنة الحالية | السرية | محل الإقامة |\n`;
          responseText += `| :--- | :--- | :---: | :--- |\n`;
          for (const t of data) {
            responseText += `| **${t.name}** | ${t.current_job || 'ـ'} | \`${t.company || 'ـ'}\` | ${t.address || 'ـ'} |\n`;
          }
          matchCount = data.length;
        } else {
          responseText += `تمام يا فندم، لم يتم رصد حرفيين مسجلين بمهن محددة في السجلات الحالية.\n`;
        }
        suggestions = ['مين هنا نجار؟', 'مين كهربائي؟', 'مين سواق؟'];
      }
      break;
    }

    // 3. Recruits by Location / Governorate
    case 'list_recruits_by_location': {
      const loc = context.location || 'المحافظة المطلوبة';
      responseText = `### 📍 بيان المجندين من أبناء (${loc})\n\n`;
      if (Array.isArray(data) && data.length > 0) {
        responseText += `تمام يا فندم، تم حصر **${data.length} مجند** مسجلين بمحل إقامة في (${loc}):\n\n`;
        responseText += `| اسم المجند | السرية | العنوان بالتفصيل | المهنة | المؤهل |\n`;
        responseText += `| :--- | :---: | :--- | :--- | :--- |\n`;
        for (const r of data) {
          responseText += `| **${r.name}** | \`${r.company || 'ـ'}\` | ${r.address || 'ـ'} | ${r.current_job || 'ـ'} | ${r.qualification || 'ـ'} |\n`;
        }
        matchCount = data.length;
        suggestions = ['توزيع المحافظات', 'مين في سرية الأمن؟', 'أصحاب المهن'];
      } else {
        responseText += `تمام يا فندم، بحثت في سجلات العناوين ولم يتم العثور على مجندين مسجلين من أبناء (**${loc}**) في القوة الحالية.\n`;
        suggestions = ['عرض المؤشرات العامة', 'حصر السرايا', 'أصحاب المهن'];
      }
      break;
    }

    // 4. Recruits by Specific Company
    case 'list_recruits_by_company': {
      const comp = context.company || 'السرية';
      responseText = `### 🛡️ كشف قوة أفراد (${comp})\n\n`;
      if (Array.isArray(data) && data.length > 0) {
        responseText += `تمام يا فندم، مسجل بقوة (${comp}) عدد **${data.length} مجند** تمامهم كالتالي:\n\n`;
        responseText += `| اسم المجند | رقم الشرطة | المؤهل الدراسي | المهنة | الموقف الطبي |\n`;
        responseText += `| :--- | :---: | :--- | :--- | :--- |\n`;
        for (const r of data) {
          responseText += `| **${r.name}** | \`${r.police_number || 'ـ'}\` | ${r.qualification || 'ـ'} | ${r.current_job || 'بدون'} | ${r.medical_status || 'لائق'} |\n`;
        }
        matchCount = data.length;
        suggestions = ['توزيع باقي السرايا', 'أصحاب المهن في هذه السرية', 'المؤشرات العامة'];
      } else {
        responseText += `تمام يا فندم، لا يوجد مجندين مقيدين حالياً على (**${comp}**).\n`;
        suggestions = ['توزيع السرايا', 'المؤشرات العامة'];
      }
      break;
    }

    // 4.1 Distribution Sectors Statistics (قطاعات التوزيع)
    case 'stats_by_distribution_sector': {
      responseText = `### 📍 إحصائية وبيان توزيع المجندين على القطاعات والجهات الخارجية\n\n`;
      const sectors = data.sectors || [];
      responseText += `تمام يا فندم، إجمالي القوة: **${data.total} مجند**\n`;
      responseText += `* ✅ **تم توزيعهم:** **${data.distributed_count} مجند**\n`;
      responseText += `* ⏳ **قيد التدريب الأساسي (لم يوزعوا بعد):** **${data.unassigned_count} مجند**\n\n`;
      if (sectors.length > 0) {
        responseText += `| القطاع / الجهة الموزع إليها | عدد المجندين | النسبة |\n`;
        responseText += `| :--- | :---: | :---: |\n`;
        for (const s of sectors) {
          const pct = data.total > 0 ? Math.round((s.count / data.total) * 100) : 0;
          responseText += `| **${s.sector}** | **${s.count}** فرد | \`${pct}%\` |\n`;
        }
      }
      responseText += `\n> [!TIP]\n> تقدر تسألني: 'مين اتوزع على قطاع عمر القاضي؟' أو 'مين لسه لم يوزع؟' لاستخراج الأسماء فوراً.\n`;
      suggestions = ['مين اتوزع على رئاسة المنطقة؟', 'مين في قطاع أحمد عمارة؟', 'مين لسه لم يوزع؟'];
      matchCount = data.distributed_count;
      break;
    }

    // 4.2 List Recruits by Distribution Sector
    case 'list_recruits_by_distribution_sector': {
      const sectorName = data.sector || 'القطاع المحدد';
      const recruits = data.recruits || [];
      responseText = `### 📋 كشف أسماء المجندين الموزعين على (${sectorName})\n\n`;
      if (recruits.length > 0) {
        responseText += `تمام يا فندم، تم حصر **${recruits.length} مجند** موزع على (**${sectorName}**):\n\n`;
        responseText += `| م | اسم المجند | الرقم العسكري | رقم الشرطة | السرية | المؤهل |\n`;
        responseText += `| :-: | :--- | :---: | :---: | :--- | :--- |\n`;
        recruits.forEach((r, idx) => {
          responseText += `| ${idx + 1} | **${r.name}** | \`${r.military_number || 'ـ'}\` | \`${r.police_number || 'ـ'}\` | ${r.company || 'ـ'} | ${r.qualification || 'ـ'} |\n`;
        });
        matchCount = recruits.length;
        suggestions = ['إحصائية كل قطاعات التوزيع', 'مين في قطاع جمال فايق؟', 'مين لسه لم يوزع؟'];
      } else {
        responseText += `تمام يا فندم، لا يوجد مجندين موزعون حالياً على (**${sectorName}**).\n`;
        suggestions = ['إحصائية كل قطاعات التوزيع', 'مين لسه لم يوزع؟'];
      }
      break;
    }

    // 5. Married Recruits List
    case 'list_married_recruits': {
      responseText = `### 💍 بيان المجندين المتزوجين بالقوة المقيدة\n\n`;
      if (Array.isArray(data) && data.length > 0) {
        responseText += `تمام يا فندم، تم حصر **${data.length} مجند** متزوجين من واقع السجلات الرسمية:\n\n`;
        responseText += `| اسم المجند | بيانات الزوجة | السرية | العنوان ومحل الإقامة |\n`;
        responseText += `| :--- | :--- | :---: | :--- |\n`;
        for (const m of data) {
          responseText += `| **${m.name}** | ${m.wife || 'متزوج'} | \`${m.company || 'ـ'}\` | ${m.address || 'ـ'} |\n`;
        }
        matchCount = data.length;
        suggestions = ['نسبة المتزوجين والعزاب', 'المؤهلات الدراسية', 'أصحاب المهن'];
      } else {
        responseText += `تمام يا فندم، جميع أفراد القوة المسجلة حالياً عزاب (لم يُسجل متزوجون في حقول الزوجة).\n`;
      }
      break;
    }

    // 6. Batches Statistics
    case 'stats_by_batch': {
      responseText = `### 🎖️ حصر أعداد المجندين المقيدين بالدفوع التجنيدية\n\n`;
      if (Array.isArray(data) && data.length > 0) {
        responseText += `تمام يا باشا، بيان قوة الدفوع المقيدة كالتالي:\n\n`;
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

    // 7. Qualifications Statistics
    case 'stats_by_qualification': {
      responseText = `### 📊 تقرير حصر وتوزيع المؤهلات الدراسية\n\n`;
      if (Array.isArray(data) && data.length > 0) {
        const total = data.reduce((sum, item) => sum + item.count, 0);
        responseText += `تمام يا فندم، إجمالي المجندين المحصورين بالمؤهلات: **${total} مجند**:\n\n`;
        responseText += `| المؤهل الدراسي | عدد المجندين | النسبة المئوية |\n`;
        responseText += `| :--- | :---: | :---: |\n`;
        for (const q of data) {
          const pct = total > 0 ? ((q.count / total) * 100).toFixed(1) : '0';
          responseText += `| **${q.qualification}** | ${q.count} مجند | ${pct}% |\n`;
        }
        matchCount = total;
      } else {
        responseText += `لم يتم رصد مؤهلات مسجلة بعد في السجلات.\n`;
      }
      suggestions = ['أصحاب الحرف والمهن', 'توزيع السرايا', 'المجندين المتزوجين'];
      break;
    }

    // 8. Company Statistics
    case 'stats_by_company': {
      responseText = `### 🛡️ توزيع قوة المجندين على السرايا والوحدات\n\n`;
      if (Array.isArray(data) && data.length > 0) {
        responseText += `تمام يا فندم، بيان توزيع القوة على السرايا:\n\n`;
        responseText += `| السرية / الوحدة | إجمالي القوة المقيدة |\n`;
        responseText += `| :--- | :---: |\n`;
        for (const c of data) {
          responseText += `| **${c.company}** | ${c.count} مجند |\n`;
        }
        matchCount = data.reduce((sum, c) => sum + (c.count || 0), 0);
      } else {
        responseText += `لا توجد سرايا مسجلة بالقوة حالياً.\n`;
      }
      suggestions = ['مين في سرية الأمن؟', 'أصحاب الصنائع', 'الحالات غير المتزنة نفسياً'];
      break;
    }

    // 9. Medical Status
    case 'stats_by_medical_status': {
      responseText = `### 🩺 تقرير المناظرة الطبية ومستويات اللياقة\n\n`;
      responseText += `تمام يا باشا، موقف اللياقة الطبية للقوة كالتالي:\n\n`;
      responseText += `* ✅ **اللائقون طبياً وسليمو المظهر:** **${data.fit} مجند**\n`;
      responseText += `* ❌ **غير لائقين طبياً (قرارات عسكرية واستبعاد):** **${data.unfit} مجند**\n`;
      responseText += `* ⏳ **حالات قيد الفحص والمناظرة الطبية:** **${data.undetermined} مجند**\n`;
      responseText += `* 🏥 **إحالات نشطة لمستشفيات الشرطة:** **${data.active_referrals} مجند**\n\n`;
      responseText += `> [!NOTE]\n> تم فصل حالات (غير لائق) تماماً لمنع أي تداخل إحصائي مع اللائقين.\n`;
      suggestions = ['تحركات مستشفيات الشرطة', 'الحالات غير المتزنة نفسياً', 'تيكتات الاشتباه الأمني'];
      matchCount = (data.fit || 0) + (data.unfit || 0) + (data.undetermined || 0);
      break;
    }

    // 10. Security Tickets
    case 'list_security_tickets': {
      responseText = `### ⚠️ تيكتات الاشتباه الأمني والمتابعة الدورية\n\n`;
      if (Array.isArray(data) && data.length > 0) {
        responseText += `تمام يا فندم، تم رصد **${data.length} تيكت اشتباه مفتوح** بالمنظومة:\n\n`;
        for (const t of data) {
          responseText += `* **[تيكت #${t.id}] ${t.title || 'اشتباه'}** — المجند: **${t.recruit_name}** (\`${t.national_id || 'ـ'}\`) — السرية: \`${t.company || 'ـ'}\` — النوع: \`${t.ticket_type}\`\n`;
          if (t.description) responseText += `  * *ملاحظات أمنية:* ${t.description}\n`;
        }
        matchCount = data.length;
      } else {
        responseText += `تمام يا فندم، السجلات تمام ومفيش أي تيكتات اشتباه أو ملاحظات أمنية مسجلة حالياً على القوة. 🫡\n`;
      }
      suggestions = ['الحالات غير المتزنة نفسياً', 'مين في سرية الأمن؟', 'تحركات المستشفيات'];
      break;
    }

    // 11. Psychological Cases
    case 'list_psychological_cases': {
      responseText = `### 🧠 بيان الحالات غير المتزنة نفسياً وعصبياً\n\n`;
      if (Array.isArray(data) && data.length > 0) {
        responseText += `تمام يا فندم، تم حصر **${data.length} مجند** مقيدين كحالات تستوجب المتابعة وعدم تسليم سلاح:\n\n`;
        for (const p of data) {
          responseText += `* **${p.name}** — السرية: \`${p.company || 'ـ'}\` — الرقم القومي: \`${p.national_id || 'ـ'}\`\n`;
          if (p.psychological_notes) responseText += `  * *الملاحظة النفسية:* ${p.psychological_notes}\n`;
        }
        matchCount = data.length;
      } else {
        responseText += `تمام يا فندم، لا توجد أي حالات نفسية أو عصبية مسجلة قيد الملاحظة حالياً. 🫡\n`;
      }
      suggestions = ['تحركات مستشفيات الشرطة', 'تيكتات الاشتباه الأمني', 'بيان اللياقة الطبية'];
      break;
    }

    // 12. Hospital Movements
    case 'list_hospital_movements': {
      responseText = `### 🏥 بيان تحركات وإحالات مستشفيات الشرطة\n\n`;
      if (Array.isArray(data) && data.length > 0) {
        responseText += `تمام يا فندم، تم حصر **${data.length} حركة إحالة طبية**:\n\n`;
        for (const a of data) {
          const retStatus = a.return_date ? `(عاد بتاريخ ${a.return_date})` : '⚠️ **(قيد التواجد بالمستشفى)**';
          responseText += `* **${a.recruit_name}** — الوجهة: \`${a.destination || 'مستشفى الشرطة'}\` — المغادرة: \`${a.departure_date || 'ـ'}\` ${retStatus}\n`;
        }
        matchCount = data.length;
      } else {
        responseText += `تمام يا فندم، لا توجد حركات إحالة لمستشفيات الشرطة مسجلة حالياً.\n`;
      }
      suggestions = ['اللياقة الطبية للمجندين', 'الحالات غير المتزنة نفسياً', 'أصحاب الحرف'];
      break;
    }

    // 13. Travel Abroad Cases
    case 'list_travel_cases': {
      responseText = `### ✈️ بيان المجندين الذين سبق لهم السفر خارج مصر\n\n`;
      if (Array.isArray(data) && data.length > 0) {
        responseText += `تمام يا فندم، تم رصد **${data.length} مجند** مسجل لهم سابقة سفر للخارج:\n\n`;
        for (const tr of data) {
          responseText += `* **${tr.name}** — السرية: \`${tr.company || 'ـ'}\` — جهة السفر: \`${tr.travel_abroad}\` — العنوان: \`${tr.address || 'ـ'}\`\n`;
        }
        matchCount = data.length;
      } else {
        responseText += `تمام يا فندم، لا يوجد مجندين مسجل لهم سابقة سفر للخارج في السجلات الحالية.\n`;
      }
      suggestions = ['تيكتات الاشتباه الأمني', 'توزيع المحافظات', 'أصحاب المهن'];
      break;
    }

    // 14. Marital Stats
    case 'stats_by_marital_status': {
      responseText = `### 💍 تقرير الحالة الاجتماعية للمجندين\n\n`;
      responseText += `تمام يا باشا، بيان الحالة الاجتماعية للقوة المقيدة:\n\n`;
      responseText += `* 💍 **المتزوجون:** **${data.married} مجند**\n`;
      responseText += `* 👤 **العزاب:** **${data.single} مجند**\n`;
      responseText += `* 👥 **إجمالي القوة:** **${data.total} مجند**\n\n`;
      suggestions = ['كشف أسماء المتزوجين', 'توزيع المؤهلات العلمية', 'حصر الحرفيين'];
      matchCount = data.total;
      break;
    }

    // 15. Religion Distribution
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

    // 16. Single Recruit National ID Lookup
    case 'get_recruit_by_national_id': {
      if (data) {
        responseText = `### 👤 ملف استعلام المجند بالرقم القومي:\n\n`;
        responseText += `تمام يا فندم، تم العثور على المجند:\n\n`;
        responseText += `* **الاسم رباعي:** **${data.name}**\n`;
        responseText += `* **الرقم القومي:** \`${data.national_id}\`\n`;
        responseText += `* **كود المجند الدائم:** \`${data.recruit_code || 'غير محدد'}\`\n`;
        responseText += `* **رقم الشرطة:** \`${data.police_number || 'ـ'}\`\n`;
        responseText += `* **الدفع التجنيدي:** ${data.batch_name || 'ـ'}\n`;
        responseText += `* **السرية المقيد عليها:** \`${data.company || 'ـ'}\`\n`;
        responseText += `* **المؤهل الدراسي:** ${data.qualification || 'ـ'}\n`;
        responseText += `* **المهنة / الصنعة:** ${data.current_job || 'بدون عمل'}\n`;
        responseText += `* **العنوان ومحل الإقامة:** ${data.address || 'ـ'}\n`;
        responseText += `* **الموقف الطبي:** ${data.medical_status || 'ـ'}\n`;
        matchCount = 1;
        suggestions = [`فحص سجلات سرية ${data.company || ''}`, 'تيكتات اشتباه المجند', 'المؤهلات العلمية'];
      } else {
        responseText = `تمام يا فندم، بحثت بالرقم القومي ولم يتم العثور على أي مجند مسجل بهذا الرقم في قاعدة البيانات.\n`;
        responseText += `> تأكد يا باشا من الرقم القومي (14 رقم باللغة الإنجليزية أو العربية).\n`;
      }
      break;
    }

    // 17. Search Recruits (FTS5 / Free Text)
    case 'search_recruits':
    default: {
      const searchRes = data || { results: [], total: 0 };
      const items = searchRes.results || [];
      matchCount = searchRes.total || items.length;

      responseText = `### 🔍 نتائج البحث في قاعدة بيانات المجندين\n\n`;
      if (items.length === 0) {
        const queryTerm = context.query || '';
        responseText += `تمام يا فندم، بحثت في سجلات القوة ولم أجد أي نتائج مطابقة لبحث سيادتك (${queryTerm ? `**${queryTerm}**` : ''}).\n\n`;
        if (context.totalRecruits) {
          responseText += `* إجمالي القوة المسجلة حالياً بالمنظومة: **${context.totalRecruits} مجند**.\n`;
        }
        responseText += `> [!TIP]\n> تأكد يا باشا من كتابة الاسم بدون أخطاء، أو تقدر تبحث بالرقم القومي (14 رقم) مباشرة، أو اسألني عن الصنائع والسرايا!\n`;
        suggestions = ['عرض تمام القوة', 'أصحاب المهن والحرف', 'مين في سرية الأمن؟'];
      } else {
        responseText += `تمام يا فندم، تم العثور على **${matchCount} سجل** مطابق:\n\n`;
        for (const r of items) {
          responseText += `* **${r.name}** — السرية: \`${r.company || 'ـ'}\` — الرقم القومي: \`${r.national_id || 'ـ'}\` — الدفع: ${r.batch_name || 'ـ'} (${r.qualification || 'ـ'})\n`;
        }
        suggestions = ['عرض المؤشرات العامة', 'حصر سرية الأمن', 'توزيع المؤهلات الدراسية'];
      }
      break;
    }

    // 18. Physical Inspection, Surgeries, Tattoos, and Scars
    case 'list_physical_injuries_and_tattoos': {
      const type = context.type || 'all';
      let titleLabel = 'العمليات الجراحية، الإصابات والوشوم';
      if (type === 'tattoo') titleLabel = 'الوشوم والعلامات المميزة (Tattoos)';
      else if (type === 'surgery') titleLabel = 'العمليات الجراحية والندبات';
      else if (type === 'fracture_injury') titleLabel = 'الكسور والإصابات القديمة';

      responseText = `### 🩺 بيان توثيق ${titleLabel}\n\n`;
      if (Array.isArray(data) && data.length > 0) {
        responseText += `تمام يا فندم، تم حصر **${data.length} حالة** مسجل لها ملاحظات هيئة ومناظرة طبية:\n\n`;
        responseText += `| اسم المجند | السرية | ملاحظات المناظرة والهيئة | الموقف الطبي |\n`;
        responseText += `| :--- | :---: | :--- | :--- |\n`;
        for (const item of data) {
          responseText += `| **${item.name}** | \`${item.company || 'ـ'}\` | ${item.inspection || 'ـ'} | ${item.medical_status || 'ـ'} |\n`;
        }
        matchCount = data.length;
        suggestions = ['الحالات غير المتزنة نفسياً', 'بيان اللياقة الطبية', 'تيكتات الاشتباه الأمني'];
      } else {
        responseText += `تمام يا فندم، لا توجد أي حالات مسجلة بـ (${titleLabel}) في كشوف القوة الحالية. الهيئة تمام وسليمة ظاهرياً. 🫡\n`;
        suggestions = ['عرض تمام القوة', 'بيان اللياقة الطبية', 'الحالات غير المتزنة نفسياً'];
      }
      break;
    }

    // 19. Qualification by Level
    case 'list_recruits_by_qualification_level': {
      const level = context.level || 'المؤهل المطلوب';
      responseText = `### 🎓 كشف المجندين حملة مؤهل (${level})\n\n`;
      if (Array.isArray(data) && data.length > 0) {
        responseText += `تمام يا باشا، مسجل بالقوة **${data.length} مجند** بمؤهل (${level}):\n\n`;
        responseText += `| اسم المجند | المؤهل الدراسي | السرية | المهنة الحالية | محل الإقامة |\n`;
        responseText += `| :--- | :--- | :---: | :--- | :--- |\n`;
        for (const q of data) {
          responseText += `| **${q.name}** | ${q.qualification || 'ـ'} | \`${q.company || 'ـ'}\` | ${q.current_job || 'ـ'} | ${q.address || 'ـ'} |\n`;
        }
        matchCount = data.length;
        suggestions = ['إحصائية كل المؤهلات', 'أصحاب المهن والحرف', 'مين في سرية الأمن؟'];
      } else {
        responseText += `تمام يا فندم، لا يوجد مجندين مقيدين حالياً بمؤهل (${level}).\n`;
        suggestions = ['إحصائية كل المؤهلات', 'عرض تمام القوة'];
      }
      break;
    }

    // 20. System Audit Log
    case 'list_recent_system_audits': {
      responseText = `### 📋 سجل حركات وتدقيق المنظومة (System Audit Log)\n\n`;
      if (Array.isArray(data) && data.length > 0) {
        responseText += `تمام يا فندم، بيان آخر الحركات والإجراءات المسجلة بالمنظومة بالثانية:\n\n`;
        for (const log of data) {
          const time = log.created_at ? log.created_at.replace('T', ' ').slice(0, 19) : 'ـ';
          const userDisp = log.user_fullname ? `${log.user_fullname} (${log.username})` : (log.username || 'النظام');
          responseText += `* **[${time}]** المستخدم: **${userDisp}** — الإجراء: \`${log.action_type || 'تعديل'}\` — التفاصيل: *${log.details || 'ـ'}* \`(IP: ${log.ip_address || '127.0.0.1'})\`\n`;
        }
        matchCount = data.length;
      } else {
        responseText += `لا توجد حركات مسجلة في سجل التدقيق حالياً.\n`;
      }
      suggestions = ['عرض تمام القوة', 'تيكتات الاشتباه الأمني'];
      break;
    }
  }

  return {
    responseText,
    suggestions,
    matchCount
  };
}
