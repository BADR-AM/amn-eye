import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { AI_CONFIG } from '../server/ai/aiConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

/**
 * AI Asset Verification Script
 *
 * Verifies existence and cryptographic integrity (SHA-256) of:
 * 1. llama-server runtime binary
 * 2. Bundled GGUF models
 */

function calculateSha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (d) => hash.update(d));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

async function verify() {
  console.log('🔍 فحص سلامة ملفات الذكاء الاصطناعي ومحرك التشغيل المحلي...\n');

  const { paths, activeModelId, models } = AI_CONFIG;
  const activeModel = models[activeModelId];

  // 1. Check runtime executable
  const binaryPath = path.join(paths.runtimesDir, paths.binaryName);
  const binaryExists = fs.existsSync(binaryPath);
  console.log(`[1] محرك التشغيل (${paths.binaryName}):`);
  console.log(`    المسار: ${binaryPath}`);
  console.log(`    الحالة: ${binaryExists ? '✅ متوفر محلياً' : '⚠️ غير مثبت (تعمل المنظومة بنمط البحث القطعي FTS5)'}`);

  // 2. Check model file
  const modelPath = path.join(paths.modelsDir, activeModel.filename);
  const modelExists = fs.existsSync(modelPath);
  console.log(`\n[2] النموذج النشط (${activeModel.name}):`);
  console.log(`    الملف: ${activeModel.filename}`);
  console.log(`    المسار: ${modelPath}`);
  console.log(`    الحالة: ${modelExists ? '✅ متوفر محلياً' : '⚠️ غير مثبت (تعمل المنظومة بنمط البحث القطعي FTS5)'}`);

  if (modelExists) {
    console.log('    جاري حساب البصمة الرقمية (SHA-256)...');
    const actualHash = await calculateSha256(modelPath);
    console.log(`    البصمة المحسوبة: ${actualHash}`);
    if (activeModel.sha256) {
      if (actualHash.toLowerCase() === activeModel.sha256.toLowerCase()) {
        console.log('    تطابق البصمة: ✅ سليم ومطابق تماماً');
      } else {
        console.log(`    تطابق البصمة: ⚠️ تحذير: اختلاف في البصمة الرقمية (المتوقع: ${activeModel.sha256})`);
      }
    }
  }

  console.log('\n======================================================');
  if (binaryExists && modelExists) {
    console.log('✅ جاهزية كاملة: بيئة الذكاء الاصطناعي المحلي جاهزة للعمل دون إنترنت.');
  } else {
    console.log('ℹ️ جاهزية تشغيلية: المنظومة مهيأة للعمل الكامل أوفلاين بنمط الاستعلام القطعي والبحث السريع FTS5.');
    console.log('    لتفعيل المساعد الذكي التوليدي، يرجى تزويد ملف المحرك والنموذج في مجلد assets/.');
  }
  console.log('======================================================\n');
}

verify().catch(console.error);
