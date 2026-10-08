import { describe, it, expect } from 'vitest';
import {
  classifyMedicalStatus,
  getMedicalStatusLabel,
  SQL_MEDICAL_FIT,
  SQL_MEDICAL_UNFIT,
  SQL_MEDICAL_UNDETERMINED
} from '../search/medicalStatus.js';

describe('Medical Status Classification & Normalization', () => {
  it('should correctly classify fit statuses', () => {
    expect(classifyMedicalStatus('لائق')).toBe('fit');
    expect(classifyMedicalStatus('لائق طبياً وسليم')).toBe('fit');
    expect(classifyMedicalStatus('لائق أ')).toBe('fit');
    expect(classifyMedicalStatus('سليم وبنيته جيدة')).toBe('fit');
  });

  it('should strictly classify unfit statuses and NEVER classify "غير لائق" as fit', () => {
    expect(classifyMedicalStatus('غير لائق')).toBe('unfit');
    expect(classifyMedicalStatus('غير لائق طبياً')).toBe('unfit');
    expect(classifyMedicalStatus('غير لائق - نظر')).toBe('unfit');
    expect(classifyMedicalStatus('معافى نهائي')).toBe('unfit');
    expect(classifyMedicalStatus('معفي طبياً')).toBe('unfit');
    expect(classifyMedicalStatus('غير سليم')).toBe('unfit');

    // Critical assertion against regression
    expect(classifyMedicalStatus('غير لائق')).not.toBe('fit');
  });

  it('should classify unknown or undetermined statuses', () => {
    expect(classifyMedicalStatus('')).toBe('undetermined');
    expect(classifyMedicalStatus(null)).toBe('undetermined');
    expect(classifyMedicalStatus(undefined)).toBe('undetermined');
    expect(classifyMedicalStatus('غير محدد')).toBe('undetermined');
    expect(classifyMedicalStatus('تحت الفحص')).toBe('undetermined');
  });

  it('should provide localized Arabic labels', () => {
    expect(getMedicalStatusLabel('لائق طبياً')).toBe('لائق طبياً');
    expect(getMedicalStatusLabel('غير لائق')).toBe('غير لائق طبياً');
    expect(getMedicalStatusLabel('')).toBe('غير محدد / قيد الفحص');
  });

  it('should have valid SQL clause strings without syntax errors', () => {
    expect(SQL_MEDICAL_FIT).toContain('NOT LIKE \'%غير لائق%\'');
    expect(SQL_MEDICAL_UNFIT).toContain('LIKE \'%غير لائق%\'');
    expect(SQL_MEDICAL_UNDETERMINED).toBeDefined();
  });
});
