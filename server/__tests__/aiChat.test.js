import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { routeUserQuery } from '../ai/intentRouter.js';
import { validateIntent, ALLOWED_INTENT_IDS } from '../ai/intentSchema.js';
import { modelManager } from '../ai/modelManager.js';
import { run, query } from '../db.js';
import { ensureFtsTable } from '../search/ftsMigration.js';

describe('Hybrid AI & Search Intent Routing (Synthetic Queries)', () => {
  let testBatchId;

  beforeAll(async () => {
    await ensureFtsTable();

    // Create synthetic test batch
    const b = await run(`
      INSERT INTO batches (name, year, month, active, notes)
      VALUES ('دفع اختبار الشات 2026', 2026, 1, 1, 'دفعة تجارب ذكية')
    `);
    testBatchId = b.lastID;

    // Insert synthetic records for test assertions
    await run(`
      INSERT INTO recruits (
        batch_id, attendance_date, name, religion, qualification,
        national_id, recruit_code, current_job, other_jobs, address,
        company, medical_status, is_psychological_case, psychological_notes
      ) VALUES (
        ?, '2026-01-15', 'خالد عبد الرحمن حسن', 'مسلم', 'مؤهل عالي',
        '29905051609995', 'CHAT-01', 'كهربائي منازل', 'سائق خاص', 'طنطا',
        'سرية الأمن', 'لائق طبياً وسليم', 0, ''
      )
    `, [testBatchId]);

    await run(`
      INSERT INTO recruits (
        batch_id, attendance_date, name, religion, qualification,
        national_id, recruit_code, current_job, other_jobs, address,
        company, medical_status, is_psychological_case, psychological_notes
      ) VALUES (
        ?, '2026-01-15', 'يوسف عماد فريد', 'مسيحي', 'متوسط',
        '29906061609996', 'CHAT-02', 'نجار موبيليا', '', 'المحلة',
        'السرية الثانية', 'غير لائق طبياً', 1, 'حالة عصبية تحت الملاحظة'
      )
    `, [testBatchId]);
  });

  afterAll(async () => {
    if (testBatchId) {
      await run(`DELETE FROM recruits WHERE batch_id = ?`, [testBatchId]);
      await run(`DELETE FROM batches WHERE id = ?`, [testBatchId]);
    }
  });

  it('should route exact 14-digit National ID directly and return grounded result', async () => {
    const res = await routeUserQuery('استعلام عن الرقم 29905051609995');
    expect(res.intent).toBe('get_recruit_by_national_id');
    expect(res.mode).toBe('deterministic');
    expect(res.responseText).toContain('خالد عبد الرحمن');
    expect(res.matchCount).toBe(1);
  });

  it('should route vocational trade query to list_trades_and_crafts', async () => {
    const res = await routeUserQuery('من هم أصحاب المهن والحرف الكهربائية؟');
    expect(res.intent).toBe('list_trades_and_crafts');
    expect(res.mode).toBe('deterministic');
    expect(res.responseText).toContain('الحرف والمهن الفنية');
    expect(res.suggestions.length).toBeGreaterThan(0);
  });

  it('should route medical status query with strict non-overlapping counts', async () => {
    const res = await routeUserQuery('تقرير اللياقة الطبية والمناظرة');
    expect(res.intent).toBe('stats_by_medical_status');
    expect(res.responseText).toContain('اللائقون طبياً');
    expect(res.responseText).toContain('غير لائقين طبياً');
  });

  it('should route psychological cases query to list_psychological_cases', async () => {
    const res = await routeUserQuery('حصر الحالات غير المتزنة نفسياً وعصبياً');
    expect(res.intent).toBe('list_psychological_cases');
    expect(res.responseText).toContain('يوسف عماد فريد');
  });

  it('should route force distribution to stats_by_company', async () => {
    const res = await routeUserQuery('قوة السرايا وتوزيع سرية الأمن');
    expect(res.intent).toBe('stats_by_company');
    expect(res.responseText).toContain('توزيع قوة المجندين');
  });

  it('should route general greeting or empty prompt to overview_kpi_summary', async () => {
    const res = await routeUserQuery('');
    expect(res.intent).toBe('overview_kpi_summary');
    expect(res.responseText).toContain('المؤشرات العامة');
  });

  it('should validate and sanitize schema intents strictly', () => {
    // Valid intent
    const valid = validateIntent({
      intent: 'stats_by_qualification',
      params: { batchId: '5' },
      explanation: 'تحليل المؤهلات'
    });
    expect(valid).not.toBeNull();
    expect(valid.intent).toBe('stats_by_qualification');
    expect(valid.params.batchId).toBe(5);

    // Malicious or hallucinated intent
    const invalid = validateIntent({
      intent: 'EXECUTE_ARBITRARY_SQL_DROP_TABLE',
      params: { sql: 'DROP TABLE recruits' }
    });
    expect(invalid).toBeNull();
  });

  it('should report model status via modelManager', () => {
    const status = modelManager.getStatus();
    expect(status.enabled).toBeDefined();
    expect(status.engine).toBe('llama.cpp');
    expect(status.loopbackOnly).toBe(true);
    expect(status.hardwareLimits.threads).toBeGreaterThanOrEqual(1);
    expect(status.hardwareLimits.contextTokens).toBeGreaterThanOrEqual(1024);
  });
});
