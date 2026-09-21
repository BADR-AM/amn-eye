import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import { generateToken } from '../auth.js';
import { parseRecruitMarkdown } from '../markdownParser.js';

describe('Markdown Ingestion Subsystem', () => {
  let app;
  let server;
  let baseUrl;
  let adminToken;

  beforeAll(async () => {
    app = express();
    app.use(express.json());

    // Mock database records
    const recruitsDb = [
      { id: 1, name: 'أحمد محمود علي', national_id: '29901011601234', company: 'السرية الأولى' }
    ];

    // Mock preview endpoint
    app.post('/api/recruits/preview-markdown', (req, res) => {
      const { files } = req.body;
      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: 'لم يتم إرسال أي ملفات' });
      }

      const items = files.map(f => {
        const parsed = parseRecruitMarkdown(f.content, f.name);
        if (!parsed.success) {
          return { filename: f.name, status: 'invalid', error: parsed.error, data: parsed.data };
        }
        const existing = recruitsDb.find(r => r.national_id === parsed.data.national_id);
        if (existing) {
          return {
            filename: f.name,
            status: 'duplicate',
            error: `المجند مسجل مسبقاً باسم: ${existing.name}`,
            existing_id: existing.id,
            existing_name: existing.name,
            data: parsed.data
          };
        }
        return { filename: f.name, status: 'ready', error: '', data: parsed.data };
      });

      res.json({
        success: true,
        total: items.length,
        ready_count: items.filter(i => i.status === 'ready').length,
        duplicate_count: items.filter(i => i.status === 'duplicate').length,
        invalid_count: items.filter(i => i.status === 'invalid').length,
        items
      });
    });

    // Mock import endpoint
    app.post('/api/recruits/import-markdown', (req, res) => {
      const { recruits, on_duplicate = 'skip' } = req.body;
      let imported = 0;
      let updated = 0;
      let skipped = 0;

      for (const item of recruits) {
        const rec = item.data || item;
        const existingIdx = recruitsDb.findIndex(r => r.national_id === rec.national_id);
        if (existingIdx !== -1) {
          if (on_duplicate === 'update') {
            recruitsDb[existingIdx] = { ...recruitsDb[existingIdx], ...rec };
            updated++;
          } else {
            skipped++;
          }
        } else {
          const newId = recruitsDb.length + 1;
          const permCode = 'REC-' + String(newId).padStart(7, '0');
          recruitsDb.push({ id: newId, ...rec, recruit_code: permCode });
          imported++;
        }
      }

      res.json({
        success: true,
        imported_count: imported,
        updated_count: updated,
        skipped_count: skipped,
        total_processed: recruits.length
      });
    });

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}`;
        resolve();
      });
    });

    adminToken = generateToken({ role: 'admin' });
  });

  afterAll(() => {
    if (server) server.close();
  });

  it('should preview multiple markdown files correctly identifying new and duplicate records', async () => {
    const payload = {
      files: [
        {
          name: 'new_recruit.md',
          content: `---
name: سعيد فتحي محمد
national_id: "29905051609999"
qualification: متوسط
company: السرية الثانية ( ٢ )
---
ملاحظات المقابلة الشخصية`
        },
        {
          name: 'dup_recruit.md',
          content: `---
name: أحمد محمود علي
national_id: "29901011601234"
qualification: عالي
---
ملاحظات تحديث`
        }
      ]
    };

    const res = await fetch(`${baseUrl}/api/recruits/preview-markdown`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.total).toBe(2);
    expect(data.ready_count).toBe(1);
    expect(data.duplicate_count).toBe(1);
    expect(data.items[0].status).toBe('ready');
    expect(data.items[1].status).toBe('duplicate');
  });

  it('should import new recruits and handle duplicates with skip policy', async () => {
    const payload = {
      on_duplicate: 'skip',
      recruits: [
        {
          data: {
            name: 'إبراهيم السيد خليل',
            national_id: '29812121601111',
            qualification: 'عالي',
            company: 'السرية الأولى ( ١ )'
          }
        },
        {
          data: {
            name: 'أحمد محمود علي',
            national_id: '29901011601234',
            qualification: 'متوسط'
          }
        }
      ]
    };

    const res = await fetch(`${baseUrl}/api/recruits/import-markdown`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.imported_count).toBe(1);
    expect(data.skipped_count).toBe(1);
    expect(data.updated_count).toBe(0);
  });
});
