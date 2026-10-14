import { describe, it, expect, beforeAll } from 'vitest';
import db, { reopenDb } from '../db.js';

describe('Version 2.4 New Features & Migrations', () => {
  let recruitId;

  it('should have all new V2.4 columns in recruits table schema', async () => {
    const tableInfo = await new Promise((resolve, reject) => {
      db.all('PRAGMA table_info(recruits)', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const colNames = tableInfo.map((col) => col.name);
    expect(colNames).toContain('military_number');
    expect(colNames).toContain('political_suspicion_status');
    expect(colNames).toContain('political_suspicion_details');
    expect(colNames).toContain('criminal_suspicion_status');
    expect(colNames).toContain('criminal_suspicion_details');
    expect(colNames).toContain('distribution_sector');
  });

  it('should save, update and filter recruits by distribution_sector', async () => {
    const batch = await new Promise((resolve) => {
      db.get('SELECT id FROM batches LIMIT 1', (err, row) => resolve(row ? row.id : 1));
    });

    const testNatId = '301' + String(Date.now()).slice(-11);
    const newId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO recruits (name, national_id, batch_id, attendance_date, religion, qualification, distribution_sector) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['مجند اختبار التوزيع', testNatId, batch, '2026-10-15', 'مسلم', 'متوسط', 'قطاع أحمد عمارة'],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    const inserted = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM recruits WHERE id = ?', [newId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    expect(inserted.distribution_sector).toBe('قطاع أحمد عمارة');

    // Update to another official sector
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE recruits SET distribution_sector = ? WHERE id = ?',
        ['قطاع عمر القاضي', newId],
        (err) => err ? reject(err) : resolve()
      );
    });

    const updated = await new Promise((resolve, reject) => {
      db.get('SELECT distribution_sector FROM recruits WHERE id = ?', [newId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    expect(updated.distribution_sector).toBe('قطاع عمر القاضي');

    // Clean up
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM recruits WHERE id = ?', [newId], (err) => err ? reject(err) : resolve());
    });
  });

  it('should insert a recruit with separate suspicion fields and military number', async () => {
    // Get existing batch_id
    const batch = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM batches LIMIT 1', (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    const batchId = batch ? batch.id : 1;

    const testNationalId = '299' + String(Date.now()).slice(-11);
    const res = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO recruits (
          name, national_id, military_number, company, batch_id, attendance_date,
          religion, qualification,
          criminal_suspicion_status, criminal_suspicion_details,
          political_suspicion_status, political_suspicion_details
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'مجند اختبار 2.4',
          testNationalId,
          '2026999911',
          'السرية الأولى ( ١ )',
          batchId,
          '2026-10-15',
          'مسلم',
          'مؤهل عالي',
          'اشتباه',
          'سوابق جنحة تبديد',
          'لا يوجد اشتباه',
          ''
        ],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    recruitId = res;
    expect(recruitId).toBeGreaterThan(0);

    const saved = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM recruits WHERE id = ?', [recruitId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    expect(saved.military_number).toBe('2026999911');
    expect(saved.company).toBe('السرية الأولى ( ١ )');
    expect(saved.criminal_suspicion_status).toBe('اشتباه');
    expect(saved.criminal_suspicion_details).toBe('سوابق جنحة تبديد');
    expect(saved.political_suspicion_status).toBe('لا يوجد اشتباه');
  });

  it('should cleanly bulk-delete recruit and cascading records without foreign key errors', async () => {
    // Insert mock activity, ticket, and document for this recruit
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO recruit_activities (recruit_id, activity_type, departure_date) VALUES (?, ?, ?)`,
        [recruitId, 'عيادة', '2026-10-15'],
        (err) => (err ? reject(err) : resolve())
      );
    });

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO recruit_documents (recruit_id, doc_type, title, file_path) VALUES (?, ?, ?, ?)`,
        [recruitId, 'فيش', 'فيش جنائي', '/uploads/docs/dummy.pdf'],
        (err) => (err ? reject(err) : resolve())
      );
    });

    // Run clean delete pattern used in server bulk delete
    const deleteSuccess = await new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('DELETE FROM recruit_documents WHERE recruit_id = ?', [recruitId]);
        db.run('DELETE FROM recruit_tickets WHERE recruit_id = ?', [recruitId]);
        db.run('DELETE FROM recruit_activities WHERE recruit_id = ?', [recruitId]);
        db.run('DELETE FROM recruits WHERE id = ?', [recruitId], function (err) {
          if (err) reject(err);
          else resolve(this.changes);
        });
      });
    });

    expect(deleteSuccess).toBe(1);

    const check = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM recruits WHERE id = ?', [recruitId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    expect(check).toBeUndefined();
  });

  it('should support closing and reopening DB connection for live restore operations', async () => {
    const newDb = await reopenDb();
    expect(newDb).toBeDefined();

    const result = await new Promise((resolve, reject) => {
      newDb.get('SELECT count(*) as cnt FROM recruits', (err, row) => {
        if (err) reject(err);
        else resolve(row.cnt);
      });
    });
    expect(result).toBeGreaterThanOrEqual(0);
  });
});
