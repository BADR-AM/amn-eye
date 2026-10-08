import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { run, query, get } from '../db.js';
import { ensureFtsTable, rebuildFtsIndex } from '../search/ftsMigration.js';
import { searchRecruits } from '../search/ftsQueries.js';
import { executeQuery, QUERY_CATALOG } from '../ai/queryCatalog.js';

describe('FTS5 Migration, Trigger Synchronization & Search', () => {
  let testBatchId;

  beforeAll(async () => {
    // Drop and re-ensure FTS table and triggers to test fresh schema migration
    await run(`DROP TABLE IF EXISTS recruits_fts;`);
    await ensureFtsTable();

    // Create a synthetic test batch
    const batchRes = await run(`
      INSERT INTO batches (name, year, month, active, notes)
      VALUES ('دفع اختبار FTS 2026', 2026, 1, 0, 'دفعة اختبارات آلية synthetic')
    `);
    testBatchId = batchRes.lastID;

    // Insert synthetic test recruit records (no real personnel data)
    await run(`
      INSERT INTO recruits (
        batch_id, attendance_date, name, religion, qualification,
        national_id, recruit_code, current_job, other_jobs, address,
        company, medical_status, notes, inspection
      ) VALUES (
        ?, '2026-01-10', 'أحمد محمود إبراهيم السيد', 'مسلم', 'مؤهل عالي - بكالوريوس هندسة',
        '29901011609991', 'SYNTH-001', 'مهندس برمجيات', 'كهربائي سيارات', 'طنطا - الغربية',
        'سرية الأمن', 'لائق طبياً وسليم', 'ملاحظات تدريبية عادية', 'سليم ظاهرياً'
      )
    `, [testBatchId]);

    await run(`
      INSERT INTO recruits (
        batch_id, attendance_date, name, religion, qualification,
        national_id, recruit_code, current_job, other_jobs, address,
        company, medical_status, notes, inspection
      ) VALUES (
        ?, '2026-01-10', 'مينا جرجس اسكندر', 'مسيحي', 'متوسط - دبلوم صنايع',
        '29902021609992', 'SYNTH-002', 'نجار موبيليا', 'حداد كريتال', 'المحلة الكبرى',
        'السرية الأولى', 'غير لائق طبياً', 'يحتاج إعادة مناظرة', 'ملاحظة طبية في النظر'
      )
    `, [testBatchId]);
  });

  afterAll(async () => {
    if (testBatchId) {
      await run(`DELETE FROM recruits WHERE batch_id = ?`, [testBatchId]);
      await run(`DELETE FROM batches WHERE id = ?`, [testBatchId]);
    }
  });

  it('should find recruit by exact 14-digit National ID', async () => {
    const res = await searchRecruits('29901011609991');
    expect(res.mode).toBe('exact_national_id');
    expect(res.results.length).toBe(1);
    expect(res.results[0].name).toContain('أحمد');
  });

  it('should find recruit by Eastern Arabic digits in National ID', async () => {
    const res = await searchRecruits('٢٩٩٠١٠١١٦٠٩٩٩١');
    expect(res.mode).toBe('exact_national_id');
    expect(res.results.length).toBe(1);
    expect(res.results[0].national_id).toBe('29901011609991');
  });

  it('should find recruit by recruit code', async () => {
    const res = await searchRecruits('SYNTH-002');
    expect(res.results.length).toBe(1);
    expect(res.results[0].name).toContain('مينا');
  });

  it('should find recruit using Arabic normalization (Alef without hamza)', async () => {
    // Query with 'احمد' finds 'أحمد', 'ابراهيم' finds 'إبراهيم'
    const res = await searchRecruits('احمد ابراهيم');
    expect(res.results.length).toBeGreaterThanOrEqual(1);
    const found = res.results.some(r => r.national_id === '29901011609991');
    expect(found).toBe(true);
  });

  it('should find recruit by vocational trade in FTS', async () => {
    const res = await searchRecruits('نجار');
    expect(res.results.length).toBeGreaterThanOrEqual(1);
    const found = res.results.some(r => r.current_job.includes('نجار'));
    expect(found).toBe(true);
  });

  it('should synchronize FTS index on record UPDATE via SQLite trigger', async () => {
    // Update trade of synthetic recruit
    await run(`
      UPDATE recruits
      SET current_job = 'سباك صحي ممتاز'
      WHERE national_id = '29902021609992'
    `);

    const res = await searchRecruits('سباك');
    expect(res.results.length).toBeGreaterThanOrEqual(1);
    const found = res.results.some(r => r.national_id === '29902021609992');
    expect(found).toBe(true);
  });

  it('should synchronize FTS index on record DELETE via SQLite trigger', async () => {
    // Insert temporary recruit and delete
    const temp = await run(`
      INSERT INTO recruits (
        batch_id, attendance_date, name, religion, qualification,
        national_id, recruit_code, current_job
      ) VALUES (
        ?, '2026-01-10', 'سجل مؤقت للحذف الفوري', 'مسلم', 'متوسط',
        '29903031609993', 'TEMP-DEL', 'عامل'
      )
    `, [testBatchId]);

    let searchBefore = await searchRecruits('TEMP-DEL');
    expect(searchBefore.results.length).toBe(1);

    await run(`DELETE FROM recruits WHERE id = ?`, [temp.lastID]);

    let searchAfter = await searchRecruits('TEMP-DEL');
    expect(searchAfter.results.length).toBe(0);
  });

  it('should execute query catalog allowlisted queries safely', async () => {
    const kpis = await executeQuery('overview_kpi_summary');
    expect(kpis.total_recruits).toBeGreaterThanOrEqual(2);
    expect(kpis.medically_fit).toBeGreaterThanOrEqual(1);
    expect(kpis.medically_unfit).toBeGreaterThanOrEqual(1);

    const medStats = await executeQuery('stats_by_medical_status');
    expect(medStats.fit).toBeGreaterThanOrEqual(1);
    expect(medStats.unfit).toBeGreaterThanOrEqual(1);

    const trades = await executeQuery('list_trades_and_crafts');
    expect(Array.isArray(trades)).toBe(true);
  });

  it('should reject non-allowlisted queries in queryCatalog', async () => {
    await expect(executeQuery('malicious_drop_table')).rejects.toThrow();
  });
});
