import { describe, it, expect } from 'vitest';
import {
  normalizeDigits,
  stripDiacritics,
  normalizeArabic,
  cleanText,
  buildFts5Query,
  extractNationalId
} from '../ai/arabicNormalize.js';

describe('Arabic Normalization & Search Query Processing', () => {
  it('should convert Eastern Arabic and Persian digits to ASCII', () => {
    expect(normalizeDigits('٢٩٥٠٨١٢١٦٠١٢٣٤')).toBe('29508121601234');
    expect(normalizeDigits('الرقم: ٠١٢٣٤٥٦٧٨٩')).toBe('الرقم: 0123456789');
    expect(normalizeDigits('۱۲۳۴۵۶۷۸۹۰')).toBe('1234567890');
  });

  it('should strip Tashkeel and Tatweel correctly', () => {
    expect(stripDiacritics('مُحَمَّدٌ')).toBe('محمد');
    expect(stripDiacritics('أَحْمَـد')).toBe('أحمد');
  });

  it('should normalize Alef variants, Taa Marbuta, and Yaa conservatively', () => {
    expect(normalizeArabic('أحمد')).toBe('احمد');
    expect(normalizeArabic('إبراهيم')).toBe('ابراهيم');
    expect(normalizeArabic('آدم')).toBe('ادم');
    expect(normalizeArabic('مدرسة')).toBe('مدرسه');
    expect(normalizeArabic('علي')).toBe('علي');
    expect(normalizeArabic('مصطفى')).toBe('مصطفي');
  });

  it('should clean punctuation and excessive whitespace', () => {
    expect(cleanText('  محمد  -  أحمد  !!!  ')).toBe('محمد احمد');
  });

  it('should build safe FTS5 query strings without injection or syntax error risks', () => {
    expect(buildFts5Query('أحمد إبراهيم')).toBe('"احمد"* AND "ابراهيم"*');
    expect(buildFts5Query('مجند "مجهول"')).toBe('"مجند"* AND "مجهول"*');
    expect(buildFts5Query('في مستشفى طنطا')).toBe('"مستشفي"* AND "طنطا"*');
    expect(buildFts5Query('')).toBe('');
    expect(buildFts5Query('   ')).toBe('');
  });

  it('should extract valid 14-digit Egyptian National ID from natural text', () => {
    expect(extractNationalId('الرقم القومي هو 29508121601234 للبحث')).toBe('29508121601234');
    expect(extractNationalId('رقم بطاقة ٢٩٨٠٥٠١١٦٠٥٥٥٥ في السجل')).toBe('29805011605555');
    expect(extractNationalId('رقم هاتف 01012345678 فقط')).toBe(null);
  });
});
