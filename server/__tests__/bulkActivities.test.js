import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { run, query, get, withTransaction } from '../db.js';

describe('Bulk Activities & Hospital/Mission Workflow', () => {
  let testRecruitIds = [];
  let testBatchId;

  beforeAll(async () => {
    // Create a temporary batch
    const batchRes = await run(
      "INSERT INTO batches (name, year, month, active) VALUES ('دفعة اختبار التحركات', 2026, 10, 1)"
    );
    testBatchId = batchRes.lastID;

    // Create 2 test recruits
    const r1 = await run(`
      INSERT INTO recruits (batch_id, attendance_date, name, national_id, recruit_code, company, religion, qualification)
      VALUES (?, '2026-10-26', 'مجند اختبار تحرك أول', '29901011609991', 'ACT-01', 'السرية الأولى', 'مسلم', 'متوسط')
    `, [testBatchId]);
    testRecruitIds.push(r1.lastID);

    const r2 = await run(`
      INSERT INTO recruits (batch_id, attendance_date, name, national_id, recruit_code, company, religion, qualification)
      VALUES (?, '2026-10-26', 'مجند اختبار تحرك ثان', '29901011609992', 'ACT-02', 'السرية الثانية', 'مسلم', 'متوسط')
    `, [testBatchId]);
    testRecruitIds.push(r2.lastID);
  });

  afterAll(async () => {
    if (testRecruitIds.length > 0) {
      await run(`DELETE FROM recruit_activities WHERE recruit_id IN (${testRecruitIds.join(',')})`);
      await run(`DELETE FROM recruits WHERE id IN (${testRecruitIds.join(',')})`);
    }
    if (testBatchId) {
      await run(`DELETE FROM batches WHERE id = ?`, [testBatchId]);
    }
  });

  it('should insert open dispatch tickets for multiple recruits with return_date = NULL', async () => {
    const activity_type = 'medical_referral';
    const destination = 'مستشفى الشرطة بطنطا';
    const departure_date = '2026-10-26';
    const diagnosis = 'فحص باطنة ومناظرة';
    const notes = 'مأمورية طبية عاجلة';

    await withTransaction(async () => {
      for (const recruitId of testRecruitIds) {
        await run(`
          INSERT INTO recruit_activities (
            recruit_id, activity_type, destination, departure_date,
            return_date, medical_decision, diagnosis, notes
          ) VALUES (?, ?, ?, ?, NULL, NULL, ?, ?)
        `, [recruitId, activity_type, destination, departure_date, diagnosis, notes]);
      }
    });

    const rows = await query(
      `SELECT * FROM recruit_activities WHERE recruit_id IN (${testRecruitIds.join(',')})`
    );
    expect(rows.length).toBe(2);
    expect(rows[0].return_date).toBeNull();
    expect(rows[1].return_date).toBeNull();
    expect(rows[0].destination).toBe('مستشفى الشرطة بطنطا');
  });

  it('should accurately query active open movements where return_date IS NULL', async () => {
    const activeRows = await query(`
      SELECT 
        a.id, a.recruit_id, a.activity_type, a.destination, a.departure_date,
        a.return_date, a.diagnosis, a.notes,
        r.name as recruit_name, r.military_number, r.police_number, r.company
      FROM recruit_activities a
      JOIN recruits r ON a.recruit_id = r.id
      WHERE (a.return_date IS NULL OR a.return_date = '')
        AND a.recruit_id IN (${testRecruitIds.join(',')})
      ORDER BY a.departure_date DESC, a.id DESC
    `);

    expect(activeRows.length).toBe(2);
    expect(activeRows[0].recruit_name).toBeDefined();
    expect(activeRows[0].destination).toBe('مستشفى الشرطة بطنطا');
    expect(activeRows[0].return_date).toBeNull();
  });

  it('should count recruits in police hospital for KPI card correctly', async () => {
    const hospitalCount = await get(`
      SELECT COUNT(DISTINCT a.recruit_id) as count
      FROM recruit_activities a
      WHERE (a.return_date IS NULL OR a.return_date = '')
        AND (a.activity_type IN ('medical_referral', 'hospital', 'clinic') 
             OR a.destination LIKE '%مستشفى%' 
             OR a.destination LIKE '%عياد%')
        AND a.recruit_id IN (${testRecruitIds.join(',')})
    `);

    expect(hospitalCount.count).toBe(2);
  });

  it('should close open tickets with return_date and medical decision in bulk', async () => {
    const returnDate = '2026-10-26';
    const medicalDecision = 'لائق طبياً واستأنف الخدمة';
    const returnDiagnosis = 'سليم تماماً ولا يحتاج راحة';

    await withTransaction(async () => {
      for (const recruitId of testRecruitIds) {
        await run(`
          UPDATE recruit_activities
          SET return_date = ?,
              medical_decision = COALESCE(?, medical_decision),
              diagnosis = COALESCE(?, diagnosis)
          WHERE recruit_id = ? AND (return_date IS NULL OR return_date = '')
        `, [returnDate, medicalDecision, returnDiagnosis, recruitId]);
      }
    });

    const rows = await query(
      `SELECT * FROM recruit_activities WHERE recruit_id IN (${testRecruitIds.join(',')})`
    );
    expect(rows.length).toBe(2);
    expect(rows[0].return_date).toBe('2026-10-26');
    expect(rows[1].return_date).toBe('2026-10-26');
    expect(rows[0].medical_decision).toBe('لائق طبياً واستأنف الخدمة');

    // KPI count should drop to 0 for these recruits
    const hospitalCountAfter = await get(`
      SELECT COUNT(DISTINCT a.recruit_id) as count
      FROM recruit_activities a
      WHERE (a.return_date IS NULL OR a.return_date = '')
        AND a.recruit_id IN (${testRecruitIds.join(',')})
    `);
    expect(hospitalCountAfter.count).toBe(0);
  });
});
