import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { initDb, query, get, run } from './db.js';
import { getLocalIpAddresses } from './network.js';
import { requireAuth, handleLogin } from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Setup directories for uploads
const uploadsDir = path.join(__dirname, '..', 'uploads');
const photosDir = path.join(uploadsDir, 'photos');
const videosDir = path.join(uploadsDir, 'videos');
const docsDir = path.join(uploadsDir, 'documents');

[uploadsDir, photosDir, videosDir, docsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Middlewares
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve uploaded media files statically with security headers
app.use('/uploads', (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; media-src 'self'");
  next();
}, express.static(uploadsDir));

// Multer config — type allowlist + random filenames
const ALLOWED_PHOTO_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_MIME = ['video/webm', 'video/mp4'];
const ALLOWED_DOC_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'photo') {
      cb(null, photosDir);
    } else if (file.fieldname === 'video') {
      cb(null, videosDir);
    } else if (file.fieldname === 'document' || file.fieldname === 'doc_file') {
      cb(null, docsDir);
    } else {
      cb(null, uploadsDir);
    }
  },
  filename: (req, file, cb) => {
    const origExt = path.extname(file.originalname).toLowerCase() || (file.fieldname === 'photo' ? '.jpg' : file.fieldname === 'video' ? '.webm' : '.jpg');
    cb(null, `${file.fieldname}_${Date.now()}_${crypto.randomUUID()}${origExt}`);
  },
});

const fileFilter = (req, file, cb) => {
  const isPhoto = file.fieldname === 'photo' && ALLOWED_PHOTO_MIME.includes(file.mimetype);
  const isVideo = file.fieldname === 'video' && ALLOWED_VIDEO_MIME.includes(file.mimetype);
  const isDoc = (file.fieldname === 'document' || file.fieldname === 'doc_file') && ALLOWED_DOC_MIME.includes(file.mimetype);
  if (isPhoto || isVideo || isDoc) {
    cb(null, true);
  } else {
    cb(new Error('نوع الملف غير مسموح - يُسمح بالصور JPG/PNG/WebP وملفات PDF للمستندات والوثائق'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 30 * 1024 * 1024 } // 30MB
});

// Initialize database
await initDb();

// Validate required environment variables
if (!process.env.JWT_SECRET || !process.env.ADMIN_PASSWORD_HASH) {
  console.warn('⚠️ تحذير: متغيرات البيئة JWT_SECRET أو ADMIN_PASSWORD_HASH غير محددة.');
  console.warn('⚠️ سيتم استخدام قيم افتراضية للتطوير. لا تستخدم هذا في بيئة الإنتاج!');
  if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'dev-secret-change-me-in-production-' + crypto.randomUUID();
  if (!process.env.ADMIN_PASSWORD_HASH) {
    // Default password: admin123 (bcrypt hash)
    process.env.ADMIN_PASSWORD_HASH = '$2b$10$xJ8Ks7Y.mTgZQlMqR7x4QOjWz0q9H4yz3EYxVJx1X2Ib8YMlR4vmu';
  }
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// 0. Auth — Login (public)
app.post('/api/auth/login', handleLogin);

// 1. Network Information (public — kiosk needs LAN info)
app.get('/api/network-info', (req, res) => {
  const ips = getLocalIpAddresses();
  const primaryIp = ips.length > 0 ? ips[0].ip : 'localhost';
  res.json({
    port: PORT,
    primaryIp,
    addresses: ips,
    localUrl: `http://localhost:${PORT}`,
    networkUrl: `http://${primaryIp}:${PORT}`,
  });
});

// 1.1 Company Colors Settings (GET public so Kiosk & Dashboard can read; POST requires auth)
app.get('/api/settings/company-colors', async (req, res) => {
  try {
    const row = await get(`SELECT value FROM settings WHERE key = 'company_colors'`);
    if (row && row.value) {
      return res.json(JSON.parse(row.value));
    }
    const defaultColors = [
      { id: 'c1', match: 'الأولى', name: 'السرية الأولى ( ١ )', color: '#16a34a', textColor: '#ffffff' },
      { id: 'c2', match: 'الثانية', name: 'السرية الثانية ( ٢ )', color: '#dc2626', textColor: '#ffffff' },
      { id: 'c3', match: 'الثالثة', name: 'السرية الثالثة ( ٣ )', color: '#2563eb', textColor: '#ffffff' },
      { id: 'c4', match: 'الرابعة', name: 'السرية الرابعة ( ٤ )', color: '#ffffff', textColor: '#000000' },
      { id: 'c5', match: 'الخامسة', name: 'السرية الخامسة ( ٥ )', color: '#f97316', textColor: '#000000' },
      { id: 'c6', match: 'السادسة', name: 'السرية السادسة ( ٦ )', color: '#38bdf8', textColor: '#000000' }
    ];
    res.json(defaultColors);
  } catch (err) {
    console.error('Error fetching company colors:', err);
    res.status(500).json({ error: 'خطأ في جلب ألوان السرايا' });
  }
});

app.post('/api/settings/company-colors', requireAuth, async (req, res) => {
  try {
    const colors = req.body;
    if (!Array.isArray(colors)) {
      return res.status(400).json({ error: 'البيانات المرسلة يجب أن تكون مصفوفة' });
    }
    const jsonStr = JSON.stringify(colors);
    await run(
      `INSERT INTO settings (key, value, updated_at) VALUES ('company_colors', ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      [jsonStr]
    );
    res.json({ message: 'تم حفظ ألوان السرايا بنجاح', colors });
  } catch (err) {
    console.error('Error saving company colors:', err);
    res.status(500).json({ error: 'خطأ في حفظ ألوان السرايا' });
  }
});

// 2. Dashboard Statistics (protected)
app.get('/api/stats', requireAuth, async (req, res) => {
  try {
    const activeBatch = await get(`SELECT * FROM batches WHERE active = 1 LIMIT 1`);
    const totalRecruitsRow = await get(`SELECT COUNT(*) as count FROM recruits`);
    const today = new Date().toISOString().split('T')[0];
    const todayRecruitsRow = await get(
      `SELECT COUNT(*) as count FROM recruits WHERE attendance_date = ? OR DATE(created_at) = ?`,
      [today, today]
    );

    let activeBatchCount = 0;
    if (activeBatch) {
      const activeCountRow = await get(
        `SELECT COUNT(*) as count FROM recruits WHERE batch_id = ?`,
        [activeBatch.id]
      );
      activeBatchCount = activeCountRow ? activeCountRow.count : 0;
    }

    const withPhotoRow = await get(`SELECT COUNT(*) as count FROM recruits WHERE photo_path IS NOT NULL AND photo_path != ''`);
    const withVideoRow = await get(`SELECT COUNT(*) as count FROM recruits WHERE video_path IS NOT NULL AND video_path != ''`);

    res.json({
      totalRecruits: totalRecruitsRow.count,
      todayRecruits: todayRecruitsRow.count,
      activeBatch: activeBatch || null,
      activeBatchRecruits: activeBatchCount,
      withPhoto: withPhotoRow.count,
      withVideo: withVideoRow.count,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'خطأ في جلب الإحصائيات' });
  }
});

// 2.1 Aggregated Data Analytics Endpoint (protected)
app.get('/api/analytics', requireAuth, async (req, res) => {
  try {
    const qualRows = await query(`
      SELECT qualification, COUNT(*) as count 
      FROM recruits 
      GROUP BY qualification 
      ORDER BY count DESC
    `);

    const batchRows = await query(`
      SELECT b.id, b.name, b.month, b.year, COUNT(r.id) as count
      FROM batches b
      LEFT JOIN recruits r ON b.id = r.batch_id
      GROUP BY b.id
      ORDER BY b.year ASC, b.month ASC
    `);

    const medicalTotal = await get(`SELECT COUNT(*) as total FROM recruits`);
    const healthyCount = await get(`
      SELECT COUNT(*) as count 
      FROM recruits 
      WHERE medical_status LIKE '%لائق%' OR medical_status LIKE '%سليم%'
    `);

    const jobsRows = await query(`
      SELECT current_job, COUNT(*) as count
      FROM recruits
      WHERE current_job IS NOT NULL AND current_job != ''
      GROUP BY current_job
      ORDER BY count DESC
      LIMIT 8
    `);

    // Extract governorates
    const recruits = await query(`SELECT address FROM recruits`);
    const govCounts = {};
    const knownGovs = ['الغربية', 'المنوفية', 'كفر الشيخ', 'الدقهلية', 'البحيرة', 'القاهرة', 'الجيزة', 'الإسكندرية', 'الشرقية', 'القليوبية'];
    for (const r of recruits) {
      let matched = false;
      if (r.address) {
        for (const g of knownGovs) {
          if (r.address.includes(g)) {
            govCounts[g] = (govCounts[g] || 0) + 1;
            matched = true;
            break;
          }
        }
      }
      if (!matched) govCounts['أخرى / لم تحدد'] = (govCounts['أخرى / لم تحدد'] || 0) + 1;
    }

    const governorates = Object.keys(govCounts).map(k => ({ name: k, count: govCounts[k] }));

    res.json({
      qualifications: qualRows,
      batches: batchRows,
      medical: {
        total: medicalTotal?.total || 0,
        healthy: healthyCount?.count || 0,
        withNotes: Math.max(0, (medicalTotal?.total || 0) - (healthyCount?.count || 0))
      },
      jobs: jobsRows,
      governorates
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ error: 'خطأ في جلب بيانات التحليلات' });
  }
});

// 2.2 AI Data Assistant Chat Endpoint (protected)
app.post('/api/chat', requireAuth, async (req, res) => {
  const { message, history } = req.body;
  if (!message) return res.status(400).json({ error: 'نص الاستفسار مطلوب' });

  // Initialize SSE streaming headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (type, content) => {
    res.write(`data: ${JSON.stringify({ type, content })}\n\n`);
  };

  try {
    // 1. Initial Thought: Query Analysis
    sendEvent('THOUGHT', 'تحليل السؤال واستخراج الكيانات والكلمات المفتاحية الأمنية والإدارية...');
    await new Promise(r => setTimeout(r, 200));

    const q = message.toLowerCase().trim();
    let responseText = '';
    let suggestions = [];

    // Query 1: Qualification inquiries
    if (q.includes('مؤهل') || q.includes('شهادة') || q.includes('عالي') || q.includes('متوسط') || q.includes('جامع') || q.includes('محو أمية')) {
      sendEvent('THOUGHT', 'تنفيذ استعلام إحصائي لحصر وتوزيع المؤهلات الدراسية عبر كافة الدفوع...');
      await new Promise(r => setTimeout(r, 250));

      const qualStats = await query(`
        SELECT qualification, COUNT(*) as count 
        FROM recruits 
        GROUP BY qualification 
        ORDER BY count DESC
      `);

      const total = qualStats.reduce((sum, item) => sum + item.count, 0);

      responseText = `### 📊 تقرير حصر وتوزيع المؤهلات الدراسية للمجندين\n\n`;
      responseText += `إجمالي عدد المجندين الذين تم حصر مؤهلاتهم هو **${total} مجند**، وجاء التوزيع التفصيلي كالتالي:\n\n`;
      responseText += `| المؤهل الدراسي | عدد المجندين | النسبة المئوية |\n`;
      responseText += `| :--- | :---: | :---: |\n`;
      for (const item of qualStats) {
        const pct = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0';
        responseText += `| **${item.qualification}** | ${item.count} | ${pct}% |\n`;
      }

      suggestions = ['حصر أصحاب الحرف والمهن', 'توزيع المجندين حسب المحافظات', 'مقارنة أعداد الدفوع التجنيدية'];
    }
    // Query 2: Batch inquiries
    else if (q.includes('دفع') || q.includes('يناير') || q.includes('أبريل') || q.includes('يوليو') || q.includes('أكتوبر') || q.includes('دفعة')) {
      sendEvent('THOUGHT', 'استعلام جدول الدفوع التجنيدية batches وحساب المجندين المسجلين في كل دفع...');
      await new Promise(r => setTimeout(r, 250));

      const batchStats = await query(`
        SELECT b.name, b.month, b.year, b.active, COUNT(r.id) as count
        FROM batches b
        LEFT JOIN recruits r ON b.id = r.batch_id
        GROUP BY b.id
        ORDER BY b.year ASC, b.month ASC
      `);

      responseText = `### 🎖️ حصر أعداد المجندين المقيدين بالدفوع التجنيدية\n\n`;
      responseText += `يتم تنظيم قيد واستقبال المجندين على **4 دفوع تجنيدية سنوية**:\n\n`;
      for (const b of batchStats) {
        const activeBadge = b.active ? '⭐ **(الدفع النشط حالياً)**' : '';
        responseText += `* **${b.name}**: مسجل به **${b.count} مجند** ${activeBadge}\n`;
      }

      suggestions = ['حصر المؤهلات بالدفع الحالي', 'من هم المجندين اللائقين طبياً؟', 'استخراج أسماء الحرفيين'];
    }
    // Query 3: Professions / Trades
    else if (q.includes('مهن') || q.includes('حرف') || q.includes('كهربائي') || q.includes('سائق') || q.includes('نجار') || q.includes('سباك') || q.includes('حداد') || q.includes('ميكانيكي') || q.includes('صنعة') || q.includes('شغل')) {
      sendEvent('THOUGHT', 'البحث في حقلي (current_job) و (other_jobs) لاستخراج أصحاب الحرف والمهن الفنية...');
      await new Promise(r => setTimeout(r, 250));

      const trades = await query(`
        SELECT name, national_id, current_job, other_jobs, address
        FROM recruits
        WHERE other_jobs NOT LIKE '%لا يوجد%' OR current_job NOT LIKE '%بدون%'
        LIMIT 10
      `);

      responseText = `### 🛠️ بيان أصحاب الحرف والمهن الفنية من واقع استمارات الفحص\n\n`;
      if (trades.length === 0) {
        responseText += `لم يتم رصد مجندين بحرف خاصة مسجلين حتى الآن، يمكنك مراجعة حقول الاستمارة.\n`;
      } else {
        responseText += `تم حصر **${trades.length} مجند** يمتلكون حرفاً ومهناً فنية يمكن الاستفادة منهم في مهام المركز:\n\n`;
        responseText += `| اسم المجند | المهنة الحالية | مهن وحرف أخرى | محل الإقامة |\n`;
        responseText += `| :--- | :--- | :--- | :--- |\n`;
        for (const t of trades) {
          responseText += `| **${t.name}** | ${t.current_job || 'ـ'} | ${t.other_jobs || 'ـ'} | ${t.address || 'ـ'} |\n`;
        }
      }

      suggestions = ['كم عدد الحاصلين على مؤهل عالي؟', 'حصر مجندي محافظة الغربية', 'مقارنة الدفوع التجنيدية'];
    }
    // Query 4: Governorates / Geographic Distribution
    else if (q.includes('محافظ') || q.includes('غربية') || q.includes('منوفية') || q.includes('طنطا') || q.includes('كفر الشيخ') || q.includes('دقهلية') || q.includes('عنوان') || q.includes('سكن')) {
      sendEvent('THOUGHT', 'تحليل عناوين السكن والرقم القومي للمجندين لحساب التوزيع الجغرافي...');
      await new Promise(r => setTimeout(r, 250));

      const allRecruits = await query(`SELECT name, address, national_id FROM recruits`);
      const govMap = {};
      for (const r of allRecruits) {
        let matched = 'أخرى';
        ['الغربية', 'المنوفية', 'كفر الشيخ', 'الدقهلية', 'البحيرة', 'القاهرة', 'الجيزة', 'الإسكندرية'].forEach(g => {
          if (r.address && r.address.includes(g)) matched = g;
        });
        govMap[matched] = (govMap[matched] || 0) + 1;
      }

      responseText = `### 📍 التوزيع الجغرافي لمجندي منطقة وسط الدلتا والمناطق المجاورة\n\n`;
      responseText += `| المحافظة | عدد المجندين المسجلين |\n`;
      responseText += `| :--- | :---: |\n`;
      for (const g of Object.keys(govMap)) {
        responseText += `| **محافظة ${g}** | ${govMap[g]} مجند |\n`;
      }

      suggestions = ['توزيع المؤهلات الدراسية', 'فحص الملاحظات الطبية', 'حصر الحرفيين بالمنطقة'];
    }
    // Query 5: Medical and Inspection
    else if (q.includes('طب') || q.includes('مرض') || q.includes('لائق') || q.includes('عملية') || q.includes('مناظرة') || q.includes('وشم') || q.includes('علام') || q.includes('صحي')) {
      sendEvent('THOUGHT', 'فحص سجلات المناظرة الأمنية (inspection) والحالة المرضية (medical_status)...');
      await new Promise(r => setTimeout(r, 250));

      const totalRec = await get(`SELECT COUNT(*) as count FROM recruits`);
      const healthyRec = await get(`SELECT COUNT(*) as count FROM recruits WHERE medical_status LIKE '%لائق%' OR medical_status LIKE '%سليم%'`);

      responseText = `### 🩺 تقرير المناظرة الأمنية واللياقة الطبية للمجندين\n\n`;
      responseText += `* **إجمالي المجندين الذين خضعوا للفحص:** ${totalRec.count} مجند\n`;
      responseText += `* **اللائقون طبياً وسليمو المظهر:** ${healthyRec.count} مجند\n`;
      responseText += `* **ملاحظات طبية أو عمليات مسجلة:** ${Math.max(0, totalRec.count - healthyRec.count)} مجند\n\n`;
      responseText += `> [!NOTE]\n> كافة النتائج مستخرجة مباشرة من واقع مناظرة وحدة الأمن والتحريات بمركز تدريب المجندين.\n`;

      suggestions = ['استخراج قائمة المؤهلات العليا', 'حصر الدفوع التجنيدية', 'من هم أصحاب الحرف والمهن؟'];
    }
    // Query 6: Specific Recruit Search by name or National ID
    else if (q.includes('ابحث') || q.includes('مجند') || q.includes('اسم') || q.includes('بطاقة') || q.includes('رقم قومي')) {
      sendEvent('THOUGHT', 'إجراء بحث فوري ومطابقة الاسم أو الرقم القومي في قاعدة البيانات...');
      await new Promise(r => setTimeout(r, 250));

      // Extract the actual search term from the message
      const searchTerm = message.trim()
        .replace(/ابحث عن|ابحث|مجند|اسم|بطاقة|رقم قومي|المجند/g, '')
        .trim();

      let results;
      if (searchTerm && searchTerm.length > 0) {
        results = await query(`
          SELECT r.name, r.national_id, r.qualification, r.current_job, r.address, b.name as batch_name
          FROM recruits r
          JOIN batches b ON r.batch_id = b.id
          WHERE r.name LIKE ? OR r.national_id LIKE ?
          ORDER BY r.id DESC
          LIMIT 10
        `, [`%${searchTerm}%`, `%${searchTerm}%`]);
      } else {
        results = await query(`
          SELECT r.name, r.national_id, r.qualification, r.current_job, r.address, b.name as batch_name
          FROM recruits r
          JOIN batches b ON r.batch_id = b.id
          ORDER BY r.id DESC
          LIMIT 5
        `);
      }

      responseText = `### 🔍 نتائج البحث في قاعدة بيانات المجندين\n\n`;
      if (results.length === 0) {
        responseText += `لا توجد نتائج مطابقة لبحثك في السجلات الحالية.\n`;
      } else {
        responseText += `إليك أحدث السجلات المسجلة بالمنظومة:\n\n`;
        for (const r of results) {
          responseText += `* **${r.name}** — الرقم القومي: \`${r.national_id}\` — ${r.batch_name} (${r.qualification})\n`;
        }
      }

      suggestions = ['حصر أعداد الدفوع', 'توزيع المؤهلات الدراسية', 'أصحاب المهن والحرف'];
    }
    // Default Overview
    else {
      sendEvent('THOUGHT', 'إعداد ملخص عام وشامل لكافة مؤشرات منظومة المجندين...');
      await new Promise(r => setTimeout(r, 250));

      const stats = await get(`SELECT COUNT(*) as count FROM recruits`);
      const activeBatch = await get(`SELECT name FROM batches WHERE active = 1 LIMIT 1`);

      responseText = `أهلاً بك! أنا **المساعد الذكي لمنظومة فحص وتسجيل المجندين** لوحدة الأمن والتحريات.\n\n`;
      responseText += `* **إجمالي المجندين المسجلين حالياً:** **${stats.count} مجند**.\n`;
      responseText += `* **الدفع التجنيدي النشط:** **${activeBatch ? activeBatch.name : 'غير محدد'}**.\n\n`;
      responseText += `يمكنك سؤالي باللغة العربية عن أي استفسار يتعلق بـ:\n`;
      responseText += `1. **إحصائيات المؤهلات الدراسية** (نسبة المؤهل العالي، المتوسط، إلخ).\n`;
      responseText += `2. **حصر أصحاب الحرف والمهن** (كهربائيين، سائقين، سباكين للاستفادة منهم).\n`;
      responseText += `3. **الانتشار الجغرافي** وتوزيع المحافظات والمراكز.\n`;
      responseText += `4. **مقارنة أعداد الدفوع التجنيدية** الأربعة.\n`;
      responseText += `5. **مؤشرات المناظرة واللياقة الطبية**.\n`;

      suggestions = ['توزيع المؤهلات العلمية', 'حصر أصحاب الحرف والمهن', 'مقارنة أعداد الدفوع التجنيدية', 'التوزيع الجغرافي للمجندين'];
    }

    // Stream the final response chunk by chunk for smooth animation
    sendEvent('THOUGHT', 'اكتمال معالجة البيانات وصياغة التقرير الإحصائي النهائي.');
    await new Promise(r => setTimeout(r, 150));

    // Stream in natural paragraphs
    const chunks = responseText.split('\n');
    for (let i = 0; i < chunks.length; i++) {
      const piece = (i > 0 ? '\n' : '') + chunks[i];
      sendEvent('FINAL_RESPONSE', piece);
      await new Promise(r => setTimeout(r, 20));
    }

    // Send suggestions at the end
    for (const s of suggestions) {
      sendEvent('SUGGESTION', s);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Chat error:', err);
    sendEvent('FINAL_RESPONSE', `عذراً، حدث خطأ أثناء معالجة الاستفسار: ${err.message}`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// 3. Batches Management (public GET for kiosk, protected POST/PUT)
app.get('/api/batches', async (req, res) => {
  try {
    const batches = await query(`
      SELECT b.*, COUNT(r.id) as recruits_count
      FROM batches b
      LEFT JOIN recruits r ON b.id = r.batch_id
      GROUP BY b.id
      ORDER BY b.year DESC, b.month DESC
    `);
    res.json(batches);
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ error: 'خطأ في جلب الدفوع التجنيدية' });
  }
});

app.post('/api/batches', requireAuth, async (req, res) => {
  try {
    const { name, year, month, active, notes } = req.body;
    if (!name || !year || !month) {
      return res.status(400).json({ error: 'اسم الدفع والسنة والشهر مطلوبة' });
    }

    if (active) {
      await run(`UPDATE batches SET active = 0`);
    }

    const result = await run(
      `INSERT INTO batches (name, year, month, active, notes) VALUES (?, ?, ?, ?, ?)`,
      [name, year, month, active ? 1 : 0, notes || '']
    );

    const created = await get(`SELECT * FROM batches WHERE id = ?`, [result.lastID]);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating batch:', error);
    res.status(500).json({ error: 'خطأ في إضافة الدفع التجنيدي' });
  }
});

app.put('/api/batches/:id/set-active', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await run(`UPDATE batches SET active = 0`);
    await run(`UPDATE batches SET active = 1 WHERE id = ?`, [id]);
    const updated = await get(`SELECT * FROM batches WHERE id = ?`, [id]);
    res.json(updated);
  } catch (error) {
    console.error('Error activating batch:', error);
    res.status(500).json({ error: 'خطأ في تفعيل الدفع التجنيدي' });
  }
});

// 4. Recruits List & Advanced Search (protected)
app.get('/api/recruits', requireAuth, async (req, res) => {
  try {
    const { search, batch_id, qualification, company, attendance_date, page = 1, limit = 50 } = req.query;
    const isUnlimited = limit === 'all' || parseInt(limit) >= 5000;
    const safeLimit = isUnlimited ? 10000 : Math.min(Math.max(parseInt(limit) || 50, 1), 500);
    const safePage = Math.max(parseInt(page) || 1, 1);
    let whereClauses = [];
    let params = [];

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      whereClauses.push(`(r.name LIKE ? OR r.national_id LIKE ? OR r.address LIKE ? OR r.current_job LIKE ? OR r.police_number LIKE ?)`);
      params.push(s, s, s, s, s);
    }

    if (batch_id && batch_id !== 'all') {
      whereClauses.push(`r.batch_id = ?`);
      params.push(batch_id);
    }

    if (qualification && qualification !== 'all') {
      whereClauses.push(`r.qualification = ?`);
      params.push(qualification);
    }

    if (company && company !== 'all') {
      whereClauses.push(`(r.company = ? OR r.company LIKE ?)`);
      params.push(company, `%${company}%`);
    }

    if (attendance_date && attendance_date !== 'all') {
      whereClauses.push(`r.attendance_date = ?`);
      params.push(attendance_date);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const offset = isUnlimited ? 0 : (safePage - 1) * safeLimit;

    const countRow = await get(`SELECT COUNT(*) as count FROM recruits r ${whereSql}`, params);
    const total = countRow ? countRow.count : 0;

    const listSql = `
      SELECT r.*, b.name as batch_name, b.year as batch_year, b.month as batch_month,
        (SELECT activity_type FROM recruit_activities WHERE recruit_id = r.id AND (return_date IS NULL OR return_date = '') ORDER BY id DESC LIMIT 1) as active_activity,
        (SELECT destination FROM recruit_activities WHERE recruit_id = r.id AND (return_date IS NULL OR return_date = '') ORDER BY id DESC LIMIT 1) as active_destination,
        (SELECT diagnosis FROM recruit_activities WHERE recruit_id = r.id ORDER BY id DESC LIMIT 1) as latest_diagnosis,
        (SELECT COUNT(*) FROM recruit_activities WHERE recruit_id = r.id) as activities_count
      FROM recruits r
      JOIN batches b ON r.batch_id = b.id
      ${whereSql}
      ORDER BY r.id DESC
      LIMIT ? OFFSET ?
    `;
    const recruits = await query(listSql, [...params, safeLimit, offset]);

    res.json({
      recruits,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: isUnlimited ? 1 : Math.ceil(total / safeLimit)
    });
  } catch (error) {
    console.error('Error fetching recruits:', error);
    res.status(500).json({ error: 'خطأ في جلب بيانات المجندين' });
  }
});

// 4.1 Filter options for bulk export and advanced filters
app.get('/api/recruits/filter-options', requireAuth, async (req, res) => {
  try {
    const companies = await query(`
      SELECT DISTINCT company FROM recruits 
      WHERE company IS NOT NULL AND company != '' 
      ORDER BY company ASC
    `);
    const dates = await query(`
      SELECT DISTINCT attendance_date FROM recruits 
      WHERE attendance_date IS NOT NULL AND attendance_date != '' 
      ORDER BY attendance_date DESC
    `);
    res.json({
      companies: companies.map(c => c.company),
      attendance_dates: dates.map(d => d.attendance_date)
    });
  } catch (err) {
    console.error('Error fetching filter options:', err);
    res.status(500).json({ error: 'خطأ في جلب خيارات التصفية' });
  }
});

// 5. Get Single Recruit Dossier (protected)
app.get('/api/recruits/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const recruit = await get(`
      SELECT r.*, b.name as batch_name, b.year as batch_year, b.month as batch_month,
        (SELECT activity_type FROM recruit_activities WHERE recruit_id = r.id AND (return_date IS NULL OR return_date = '') ORDER BY id DESC LIMIT 1) as active_activity,
        (SELECT destination FROM recruit_activities WHERE recruit_id = r.id AND (return_date IS NULL OR return_date = '') ORDER BY id DESC LIMIT 1) as active_destination,
        (SELECT diagnosis FROM recruit_activities WHERE recruit_id = r.id ORDER BY id DESC LIMIT 1) as latest_diagnosis,
        (SELECT COUNT(*) FROM recruit_activities WHERE recruit_id = r.id) as activities_count
      FROM recruits r
      JOIN batches b ON r.batch_id = b.id
      WHERE r.id = ?
    `, [id]);

    if (!recruit) {
      return res.status(404).json({ error: 'لم يتم العثور على المجند' });
    }
    res.json(recruit);
  } catch (error) {
    console.error('Error fetching recruit:', error);
    res.status(500).json({ error: 'خطأ في جلب ملف المجند' });
  }
});

// Helper: clean up uploaded files on error
const cleanupUploadedFiles = (req) => {
  if (req.files) {
    Object.values(req.files).flat().forEach(f => {
      try { fs.unlinkSync(f.path); } catch(e) {}
    });
  }
};

// 6. Create Recruit with Multipart Photo and Video Upload
app.post('/api/recruits', upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  try {
    const data = req.body;

    // Validate required fields
    if (!data.name || !data.batch_id) {
      cleanupUploadedFiles(req);
      return res.status(400).json({ error: 'اسم المجند والدفع التجنيدي مطلوبان' });
    }

    // Validate national_id format (14 digits)
    const nationalId = (data.national_id || '').trim();
    if (nationalId && !/^\d{14}$/.test(nationalId)) {
      cleanupUploadedFiles(req);
      return res.status(400).json({ error: 'الرقم القومي يجب أن يكون 14 رقماً' });
    }

    let photoPath = '';
    let videoPath = '';

    // If uploaded as files via multer
    if (req.files) {
      if (req.files.photo && req.files.photo[0]) {
        photoPath = `/uploads/photos/${req.files.photo[0].filename}`;
      }
      if (req.files.video && req.files.video[0]) {
        videoPath = `/uploads/videos/${req.files.video[0].filename}`;
      }
    }

    // Support base64 photo if provided in body (validated)
    if (!photoPath && data.photo_base64) {
      const matches = data.photo_base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        const ALLOWED_BASE64_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
        if (ALLOWED_BASE64_TYPES.includes(mimeType)) {
          const buffer = Buffer.from(matches[2], 'base64');
          if (buffer.length <= 5 * 1024 * 1024) {
            const filename = `photo_${Date.now()}_${crypto.randomUUID()}.jpg`;
            const filePath = path.join(photosDir, filename);
            await fs.promises.writeFile(filePath, buffer);
            photoPath = `/uploads/photos/${filename}`;
          }
        }
      }
    }

    const attendanceDate = data.attendance_date || new Date().toISOString().split('T')[0];

    const sql = `
      INSERT INTO recruits (
        batch_id, attendance_date, name, religion, qualification,
        birth_date, wife, national_id, address, current_job,
        other_jobs, travel_abroad, literacy, inspection, medical_status,
        father_name, father_job, mother_name, mother_job, siblings_check,
        family_social_status, family_security_status, photo_path, video_path,
        police_number, company, notes
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?
      )
    `;

    const params = [
      data.batch_id,
      attendanceDate,
      data.name.trim(),
      data.religion || 'مسلم',
      data.qualification || 'متوسط',
      data.birth_date || '',
      data.wife || 'أعزب',
      nationalId || null,
      data.address || '',
      data.current_job || '',
      data.other_jobs || '',
      data.travel_abroad || 'لم يسافر',
      data.literacy || 'يجيد',
      data.inspection || '',
      data.medical_status || 'لائق طبياً وسليم',
      data.father_name || '',
      data.father_job || '',
      data.mother_name || '',
      data.mother_job || '',
      data.siblings_check || '',
      data.family_social_status || 'مستقرة',
      data.family_security_status || 'خالية من السوابق والشبهات',
      photoPath,
      videoPath,
      data.police_number || '',
      data.company || '',
      data.notes || ''
    ];

    const result = await run(sql, params);
    const created = await get(`SELECT * FROM recruits WHERE id = ?`, [result.lastID]);

    console.log(`✅ تم تسجيل مجند جديد بنجاح: ${created.name} (ID: ${created.id})`);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error saving recruit:', error);
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'الرقم القومي مسجل مسبقاً' });
    }
    res.status(500).json({ error: 'خطأ في حفظ بيانات المجند' });
  }
});

// 7. Update Recruit Details (protected)
app.put('/api/recruits/:id', requireAuth, upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = await get(`SELECT * FROM recruits WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ error: 'المجند غير موجود' });
    }

    // Validate national_id format if provided
    if (data.national_id !== undefined && data.national_id !== null) {
      const nid = String(data.national_id).trim();
      if (nid && !/^\d{14}$/.test(nid)) {
        return res.status(400).json({ error: 'الرقم القومي يجب أن يكون 14 رقماً' });
      }
      data.national_id = nid || null;
    }

    let photoPath = existing.photo_path;
    let videoPath = existing.video_path;

    if (req.files) {
      if (req.files.photo && req.files.photo[0]) {
        photoPath = `/uploads/photos/${req.files.photo[0].filename}`;
      }
      if (req.files.video && req.files.video[0]) {
        videoPath = `/uploads/videos/${req.files.video[0].filename}`;
      }
    }

    if (data.photo_base64) {
      const matches = data.photo_base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        const ALLOWED_BASE64_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
        if (ALLOWED_BASE64_TYPES.includes(mimeType)) {
          const buffer = Buffer.from(matches[2], 'base64');
          if (buffer.length <= 5 * 1024 * 1024) {
            const filename = `photo_${Date.now()}_${crypto.randomUUID()}.jpg`;
            await fs.promises.writeFile(path.join(photosDir, filename), buffer);
            photoPath = `/uploads/photos/${filename}`;
          }
        }
      }
    }

    const sql = `
      UPDATE recruits SET
        batch_id = ?, attendance_date = ?, name = ?, religion = ?, qualification = ?,
        birth_date = ?, wife = ?, national_id = ?, address = ?, current_job = ?,
        other_jobs = ?, travel_abroad = ?, literacy = ?, inspection = ?, medical_status = ?,
        father_name = ?, father_job = ?, mother_name = ?, mother_job = ?, siblings_check = ?,
        family_social_status = ?, family_security_status = ?, photo_path = ?, video_path = ?,
        police_number = ?, company = ?, notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const params = [
      data.batch_id || existing.batch_id,
      data.attendance_date || existing.attendance_date,
      data.name ? data.name.trim() : existing.name,
      data.religion || existing.religion,
      data.qualification || existing.qualification,
      data.birth_date ?? existing.birth_date,
      data.wife ?? existing.wife,
      data.national_id ?? existing.national_id,
      data.address ?? existing.address,
      data.current_job ?? existing.current_job,
      data.other_jobs ?? existing.other_jobs,
      data.travel_abroad ?? existing.travel_abroad,
      data.literacy ?? existing.literacy,
      data.inspection ?? existing.inspection,
      data.medical_status ?? existing.medical_status,
      data.father_name ?? existing.father_name,
      data.father_job ?? existing.father_job,
      data.mother_name ?? existing.mother_name,
      data.mother_job ?? existing.mother_job,
      data.siblings_check ?? existing.siblings_check,
      data.family_social_status ?? existing.family_social_status,
      data.family_security_status ?? existing.family_security_status,
      photoPath,
      videoPath,
      data.police_number ?? existing.police_number ?? '',
      data.company ?? existing.company ?? '',
      data.notes ?? existing.notes,
      id
    ];

    await run(sql, params);
    const updated = await get(`SELECT * FROM recruits WHERE id = ?`, [id]);
    res.json(updated);
  } catch (error) {
    console.error('Error updating recruit:', error);
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'الرقم القومي مسجل مسبقاً' });
    }
    res.status(500).json({ error: 'خطأ في تعديل بيانات المجند' });
  }
});

// 8. Delete Recruit (protected)
app.delete('/api/recruits/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await get(`SELECT * FROM recruits WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ error: 'المجند غير موجود' });
    }

    await run(`DELETE FROM recruits WHERE id = ?`, [id]);

    // Cleanup media files if exist
    if (existing.photo_path) {
      const p = path.join(__dirname, '..', existing.photo_path);
      if (fs.existsSync(p)) try { fs.unlinkSync(p); } catch (e) { }
    }
    if (existing.video_path) {
      const v = path.join(__dirname, '..', existing.video_path);
      if (fs.existsSync(v)) try { fs.unlinkSync(v); } catch (e) { }
    }

    res.json({ message: 'تم حذف ملف المجند بنجاح' });
  } catch (error) {
    console.error('Error deleting recruit:', error);
    res.status(500).json({ error: 'خطأ في حذف المجند' });
  }
});

// -------------------------------------------------------------
// 9. Recruit Activities & Medical Tracking (المتابعة والتحركات الطبية)
// -------------------------------------------------------------

// جلب سجل تحركات ومتابعة مجند معين
app.get('/api/recruits/:id/activities', async (req, res) => {
  try {
    const { id } = req.params;
    const activities = await query(
      `SELECT * FROM recruit_activities WHERE recruit_id = ? ORDER BY departure_date DESC, id DESC`,
      [id]
    );
    res.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'خطأ في استرجاع سجل المتابعة' });
  }
});

// تسجيل حركة / متابعة جديدة لمجند (مستشفى الشرطة، عيادة، مأمورية، إلخ)
app.post('/api/recruits/:id/activities', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      activity_type,
      destination,
      departure_date,
      return_date,
      diagnosis,
      medical_decision,
      notes,
      officer_name
    } = req.body;

    if (!activity_type || !departure_date) {
      return res.status(400).json({ error: 'نوع الحركة وتاريخ القيام مطلوبان' });
    }

    const result = await run(
      `INSERT INTO recruit_activities 
        (recruit_id, activity_type, destination, departure_date, return_date, diagnosis, medical_decision, notes, officer_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        activity_type,
        destination || '',
        departure_date,
        return_date || null,
        diagnosis || '',
        medical_decision || '',
        notes || '',
        officer_name || ''
      ]
    );

    // إذا كان هناك قرار طبي، يمكن تحديث ملاحظات المجند أو حالته تلقائياً إذا لزم الأمر
    const newActivity = await get(`SELECT * FROM recruit_activities WHERE id = ?`, [result.lastID]);
    res.status(201).json(newActivity);
  } catch (error) {
    console.error('Error adding activity:', error);
    res.status(500).json({ error: 'خطأ في تسجيل حركة المتابعة' });
  }
});

// تحديث حركة متابعة (تسجيل عودة، إضافة تشخيص، إلخ)
app.put('/api/activities/:activityId', requireAuth, async (req, res) => {
  try {
    const { activityId } = req.params;
    const {
      activity_type,
      destination,
      departure_date,
      return_date,
      diagnosis,
      medical_decision,
      notes,
      officer_name
    } = req.body;

    const existing = await get(`SELECT * FROM recruit_activities WHERE id = ?`, [activityId]);
    if (!existing) {
      return res.status(404).json({ error: 'سجل المتابعة غير موجود' });
    }

    await run(
      `UPDATE recruit_activities SET
        activity_type = COALESCE(?, activity_type),
        destination = COALESCE(?, destination),
        departure_date = COALESCE(?, departure_date),
        return_date = ?,
        diagnosis = COALESCE(?, diagnosis),
        medical_decision = COALESCE(?, medical_decision),
        notes = COALESCE(?, notes),
        officer_name = COALESCE(?, officer_name),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        activity_type,
        destination,
        departure_date,
        return_date !== undefined ? return_date : existing.return_date,
        diagnosis,
        medical_decision,
        notes,
        officer_name,
        activityId
      ]
    );

    const updated = await get(`SELECT * FROM recruit_activities WHERE id = ?`, [activityId]);
    res.json(updated);
  } catch (error) {
    console.error('Error updating activity:', error);
    res.status(500).json({ error: 'خطأ في تحديث سجل المتابعة' });
  }
});

// حذف حركة متابعة
app.delete('/api/activities/:activityId', requireAuth, async (req, res) => {
  try {
    const { activityId } = req.params;
    const existing = await get(`SELECT * FROM recruit_activities WHERE id = ?`, [activityId]);
    if (!existing) {
      return res.status(404).json({ error: 'سجل المتابعة غير موجود' });
    }

    await run(`DELETE FROM recruit_activities WHERE id = ?`, [activityId]);
    res.json({ message: 'تم حذف قيد المتابعة بنجاح' });
  } catch (error) {
    console.error('Error deleting activity:', error);
    res.status(500).json({ error: 'خطأ في حذف قيد المتابعة' });
  }
});

// -------------------------------------------------------------
// 10. Analytics & Telemetry Overview (إحصائيات الإنفوجرافيك التفاعلية)
// -------------------------------------------------------------
app.get('/api/analytics/overview', async (req, res) => {
  try {
    const { batch_id } = req.query;
    let batchFilter = '';
    const params = [];

    if (batch_id && batch_id !== 'all') {
      batchFilter = 'WHERE batch_id = ?';
      params.push(batch_id);
    }

    // 1. الإحصائيات الأساسية
    const totalRecruits = await get(`SELECT COUNT(*) as count FROM recruits ${batchFilter}`, params);
    
    // عدد الحالات ذات الملاحظات الأمنية
    const flaggedRecruits = await get(
      `SELECT COUNT(*) as count FROM recruits 
       ${batchFilter ? batchFilter + ' AND' : 'WHERE'} 
       (inspection LIKE '%ملاحظ%' OR inspection LIKE '%تحفظ%' OR family_security_status LIKE '%ملاحظ%' OR family_security_status LIKE '%تحفظ%')`,
      params
    );

    // 2. توزيع السرايا
    const companyDistribution = await query(
      `SELECT company, COUNT(*) as count 
       FROM recruits 
       ${batchFilter}
       GROUP BY company 
       ORDER BY count DESC`,
      params
    );

    // 3. الموقف الطبي وحالات مستشفى الشرطة الحالية
    // حالات خرجت لمستشفى الشرطة ولم تعد حتى الآن (return_date IS NULL OR return_date = '')
    const inHospitalNow = await get(
      `SELECT COUNT(DISTINCT r.id) as count 
       FROM recruit_activities a
       JOIN recruits r ON a.recruit_id = r.id
       ${batchFilter ? 'WHERE r.batch_id = ? AND' : 'WHERE'}
       a.activity_type = 'medical_referral' 
       AND (a.return_date IS NULL OR a.return_date = '')`,
      params
    );

    // قرارات طبية (حجز، راحة طبية، لائق)
    const medicalDecisions = await query(
      `SELECT a.medical_decision, COUNT(*) as count 
       FROM recruit_activities a
       JOIN recruits r ON a.recruit_id = r.id
       ${batchFilter ? 'WHERE r.batch_id = ? AND' : 'WHERE'}
       a.medical_decision != '' AND a.medical_decision IS NOT NULL
       GROUP BY a.medical_decision`,
      params
    );

    // 4. الحضور حسب التاريخ (آخر 7 تواريخ تسجيل)
    const attendanceTrends = await query(
      `SELECT attendance_date, COUNT(*) as count 
       FROM recruits 
       ${batchFilter}
       GROUP BY attendance_date 
       ORDER BY attendance_date DESC 
       LIMIT 7`,
      params
    );

    // 5. المؤهلات الدراسية
    const qualificationStats = await query(
      `SELECT qualification, COUNT(*) as count 
       FROM recruits 
       ${batchFilter}
       GROUP BY qualification 
       ORDER BY count DESC 
       LIMIT 5`,
      params
    );

    res.json({
      total: totalRecruits.count,
      flagged: flaggedRecruits.count,
      clean: Math.max(0, totalRecruits.count - flaggedRecruits.count),
      inHospitalNow: inHospitalNow.count,
      companyDistribution,
      medicalDecisions,
      attendanceTrends: attendanceTrends.reverse(),
      qualificationStats
    });
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    res.status(500).json({ error: 'خطأ في جلب تحليلات المنظومة' });
  }
});

// -------------------------------------------------------------
// 11. Recruit Scanned Documents (وثيقة التعارف والسجل العسكري)
// -------------------------------------------------------------

// جلب مستندات المجند الممسوحة ضوئياً
app.get('/api/recruits/:id/documents', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const docs = await query(
      `SELECT * FROM recruit_documents WHERE recruit_id = ? ORDER BY id ASC`,
      [id]
    );

    const recruit = await get(
      `SELECT id, name, id_doc_front_path, id_doc_back_path, military_record_path FROM recruits WHERE id = ?`,
      [id]
    );

    res.json({
      documents: docs,
      quickPaths: {
        id_doc_front: recruit?.id_doc_front_path || null,
        id_doc_back: recruit?.id_doc_back_path || null,
        military_record: recruit?.military_record_path || null
      }
    });
  } catch (error) {
    console.error('Error fetching recruit documents:', error);
    res.status(500).json({ error: 'خطأ في استرجاع الوثائق الممسوحة' });
  }
});

// رفع أو مسح وثيقة للمجند (يدعم ملف من الجهاز أو ماسح ضوئي Base64)
app.post('/api/recruits/:id/documents', requireAuth, upload.single('document'), async (req, res) => {
  try {
    const { id } = req.params;
    const { doc_type, title, notes, base64_data } = req.body;

    const existingRecruit = await get(`SELECT id FROM recruits WHERE id = ?`, [id]);
    if (!existingRecruit) {
      return res.status(404).json({ error: 'المجند غير موجود' });
    }

    let filePath = '';
    let fileName = '';
    let fileSize = 0;
    let mimeType = 'image/jpeg';

    if (req.file) {
      filePath = `uploads/documents/${req.file.filename}`;
      fileName = req.file.originalname;
      fileSize = req.file.size;
      mimeType = req.file.mimetype;
    } else if (base64_data) {
      // Direct Scanner / WebCam Base64 payload
      const matches = base64_data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: 'صيغة بيانات الصورة غير صحيحة' });
      }
      mimeType = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      const ext = mimeType.includes('png') ? '.png' : mimeType.includes('pdf') ? '.pdf' : '.jpg';
      const uniqueName = `scan_${Date.now()}_${crypto.randomUUID()}${ext}`;
      const fullPath = path.join(docsDir, uniqueName);
      fs.writeFileSync(fullPath, buffer);

      filePath = `uploads/documents/${uniqueName}`;
      fileName = title || `مسح_ضوئي_${Date.now()}${ext}`;
      fileSize = buffer.length;
    } else {
      return res.status(400).json({ error: 'يجب إرفاق ملف أو إرسال صورة ممسوحة' });
    }

    const docTitle = title || (
      doc_type === 'id_doc_front' ? 'وثيقة تعارف (الوجه الأول)' :
      doc_type === 'id_doc_back' ? 'وثيقة تعارف (الوجه الثاني)' :
      doc_type === 'military_record' ? 'أصل السجل العسكري' : 'مستند ضوئي'
    );

    // Save in recruit_documents table
    const result = await run(
      `INSERT INTO recruit_documents (recruit_id, doc_type, title, file_path, file_name, file_size, mime_type, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, doc_type || 'other', docTitle, filePath, fileName, fileSize, mimeType, notes || '']
    );

    // Update quick lookup columns in recruits table if applicable
    if (doc_type === 'id_doc_front') {
      await run(`UPDATE recruits SET id_doc_front_path = ? WHERE id = ?`, [filePath, id]);
    } else if (doc_type === 'id_doc_back') {
      await run(`UPDATE recruits SET id_doc_back_path = ? WHERE id = ?`, [filePath, id]);
    } else if (doc_type === 'military_record') {
      await run(`UPDATE recruits SET military_record_path = ? WHERE id = ?`, [filePath, id]);
    }

    const savedDoc = await get(`SELECT * FROM recruit_documents WHERE id = ?`, [result.lastID]);
    res.status(201).json(savedDoc);
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'خطأ في حفظ المستند الممسوح ضوئياً' });
  }
});

// حذف مستند
app.delete('/api/documents/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await get(`SELECT * FROM recruit_documents WHERE id = ?`, [id]);
    if (!doc) {
      return res.status(404).json({ error: 'المستند غير موجود' });
    }

    await run(`DELETE FROM recruit_documents WHERE id = ?`, [id]);

    // Clean up physical file
    if (doc.file_path) {
      const fullPath = path.join(__dirname, '..', doc.file_path);
      if (fs.existsSync(fullPath)) {
        try { fs.unlinkSync(fullPath); } catch (e) {}
      }
    }

    // Reset quick column in recruits table if matched
    if (doc.doc_type === 'id_doc_front') {
      await run(`UPDATE recruits SET id_doc_front_path = '' WHERE id = ? AND id_doc_front_path = ?`, [doc.recruit_id, doc.file_path]);
    } else if (doc.doc_type === 'id_doc_back') {
      await run(`UPDATE recruits SET id_doc_back_path = '' WHERE id = ? AND id_doc_back_path = ?`, [doc.recruit_id, doc.file_path]);
    } else if (doc.doc_type === 'military_record') {
      await run(`UPDATE recruits SET military_record_path = '' WHERE id = ? AND military_record_path = ?`, [doc.recruit_id, doc.file_path]);
    }

    res.json({ message: 'تم حذف المستند بنجاح' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'خطأ في حذف المستند' });
  }
});

// Serve frontend static build if it exists (in production / packaged Electron app)
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Global error handler for multer and other errors
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'حجم الملف يتجاوز الحد الأقصى المسموح (20 ميجابايت)' });
    }
    return res.status(400).json({ error: 'خطأ في رفع الملف: ' + err.message });
  }
  if (err.message === 'نوع الملف غير مسموح') {
    return res.status(415).json({ error: 'نوع الملف غير مسموح - يُسمح فقط بـ JPEG/PNG/WebP للصور و WebM/MP4 للفيديو' });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'خطأ داخلي في الخادم' });
});

// Start Server on 0.0.0.0 so local network / Wi-Fi devices can connect
app.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIpAddresses();
  console.log(`=======================================================`);
  console.log(`🚀 خادم منظومة فحص المجندين يعمل الآن بنجاح على المنفذ: ${PORT}`);
  console.log(`💻 الرابط المحلي على هذا الجهاز: http://localhost:${PORT}`);
  if (ips.length > 0) {
    console.log(`📶 رابط الربط الشبكي عبر الواي فاي للأجهزة الأخرى:`);
    ips.forEach(i => console.log(`   👉 http://${i.ip}:${PORT} (${i.interfaceName})`));
  }
  console.log(`=======================================================`);
});
