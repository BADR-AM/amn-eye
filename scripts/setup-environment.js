import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AI_CONFIG } from '../server/ai/aiConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

console.log('======================================================================');
console.log('       منظومة فحص وتسجيل المجندين - فحص وتهيئة بيئة التشغيل');
console.log('======================================================================\n');

// 1. Check Node.js Version
const nodeVersion = process.version;
console.log(`[1] بيئة Node.js الحالية: ${nodeVersion}`);
const major = parseInt(nodeVersion.replace(/^v/, '').split('.')[0], 10);
if (major < 18) {
  console.warn('⚠️ تحذير: يوصى باستخدام Node.js إصدار 18 أو 20 أو 22 (LTS) لتجنب تضارب الحزم.\n');
} else {
  console.log('   ✅ إصدار Node.js متوافق وجاهز.\n');
}

// 2. Ensure Required Directories Exist
console.log('[2] فحص المجلدات الأساسية للمنظومة:');
const requiredDirs = [
  path.join(projectRoot, 'data'),
  path.join(projectRoot, 'uploads'),
  path.join(projectRoot, 'uploads', 'photos'),
  path.join(projectRoot, 'uploads', 'videos'),
  path.join(projectRoot, 'uploads', 'documents'),
  path.join(projectRoot, 'assets'),
  path.join(projectRoot, 'assets', 'ai'),
  path.join(projectRoot, 'assets', 'runtimes')
];

requiredDirs.forEach(dir => {
  const relative = path.relative(projectRoot, dir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`   ➕ تم إنشاء المجلد: ${relative}`);
  } else {
    console.log(`   ✅ المجلد موجود: ${relative}`);
  }
});

// 3. Database status
console.log('\n[3] فحص قاعدة البيانات المحلية:');
const dbFile = path.join(projectRoot, 'data', 'recruits.db');
if (fs.existsSync(dbFile)) {
  const stats = fs.statSync(dbFile);
  console.log(`   ✅ ملف قاعدة البيانات موجود (${(stats.size / 1024).toFixed(1)} KB)`);
} else {
  console.log('   ℹ️ ملف قاعدة البيانات data/recruits.db غير موجود حالياً.');
  console.log('   💡 سيتم إنشاؤه وتهيئة الجداول والمستخدم الافتراضي تلقائياً عند أول تشغيل للخادم.');
}

// 4. AI Assets status
console.log('\n[4] فحص ملفات الذكاء الاصطناعي أوفلاين:');
const { paths, activeModelId, models } = AI_CONFIG;
const activeModel = models[activeModelId];
const binaryPath = path.join(paths.runtimesDir, paths.binaryName);
const modelPath = path.join(paths.modelsDir, activeModel.filename);

const binaryOk = fs.existsSync(binaryPath);
const modelOk = fs.existsSync(modelPath);

console.log(`   * محرك llama-server (${paths.binaryName}): ${binaryOk ? '✅ متوفر محلياً' : '⚠️ غير موجود في assets/runtimes/'}`);
console.log(`   * نموذج الذكاء الاصطناعي (${activeModel.filename}): ${modelOk ? '✅ متوفر محلياً' : '⚠️ غير موجود في assets/ai/'}`);

if (!binaryOk || !modelOk) {
  console.log('\n----------------------------------------------------------------------');
  console.log('💡 ملاحظة هامة حول ملفات الذكاء الاصطناعي (حجمها الإجمالي ~540 ميجابايت):');
  console.log('   نظراً لأن GitHub يمنع رفع الملفات الكبيرة (أكثر من 100 ميجابايت)،');
  console.log('   فإن ملفات الذكاء الاصطناعي لا تُرفع على الريبو مباشرة.');
  console.log('   الخيارات المتاحة:');
  console.log('   1. نقل مجلد assets/ كاملاً من جهازك الآخر عبر فلاشة USB إلى هذا المجلد:');
  console.log(`      ${path.join(projectRoot, 'assets')}`);
  console.log('   2. المنظومة تعمل بشكل طبيعي 100% بنمط البحث القطعي FTS5 حتى بدون هذه الملفات.');
  console.log('----------------------------------------------------------------------');
} else {
  console.log('   ✅ جميع ملفات الذكاء الاصطناعي متوفرة والمساعد الذكي جاهز للاستدلال المحلي.');
}

console.log('\n======================================================================');
console.log('✅ تم الانتهاء من فحص البيئة وتجهيز البنية بنجاح.');
console.log('▶️ لتشغيل المنظومة: اضغط دبل كليك على RUN_SYSTEM.bat');
console.log('🔨 لبناء ملف التثبيت المستقل (.exe): نفذ npm run dist');
console.log('======================================================================\n');
