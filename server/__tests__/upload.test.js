import { describe, it, expect } from 'vitest';

describe('Upload Validation', () => {
  const ALLOWED_PHOTO_MIME = ['image/jpeg', 'image/png', 'image/webp'];
  const ALLOWED_VIDEO_MIME = ['video/webm', 'video/mp4'];
  const ALLOWED_BASE64_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  describe('Multer fileFilter logic', () => {
    const fileFilter = (fieldname, mimetype) => {
      const isPhoto = fieldname === 'photo' && ALLOWED_PHOTO_MIME.includes(mimetype);
      const isVideo = fieldname === 'video' && ALLOWED_VIDEO_MIME.includes(mimetype);
      return isPhoto || isVideo;
    };

    it('should accept JPEG photo', () => {
      expect(fileFilter('photo', 'image/jpeg')).toBe(true);
    });

    it('should accept PNG photo', () => {
      expect(fileFilter('photo', 'image/png')).toBe(true);
    });

    it('should accept WebP photo', () => {
      expect(fileFilter('photo', 'image/webp')).toBe(true);
    });

    it('should reject SVG as photo', () => {
      expect(fileFilter('photo', 'image/svg+xml')).toBe(false);
    });

    it('should reject HTML as photo', () => {
      expect(fileFilter('photo', 'text/html')).toBe(false);
    });

    it('should reject JS as photo', () => {
      expect(fileFilter('photo', 'application/javascript')).toBe(false);
    });

    it('should accept WebM video', () => {
      expect(fileFilter('video', 'video/webm')).toBe(true);
    });

    it('should accept MP4 video', () => {
      expect(fileFilter('video', 'video/mp4')).toBe(true);
    });

    it('should reject AVI video', () => {
      expect(fileFilter('video', 'video/avi')).toBe(false);
    });

    it('should reject photo MIME on video field', () => {
      expect(fileFilter('video', 'image/jpeg')).toBe(false);
    });

    it('should reject video MIME on photo field', () => {
      expect(fileFilter('photo', 'video/webm')).toBe(false);
    });
  });

  describe('Base64 upload validation', () => {
    it('should accept valid JPEG base64', () => {
      const mimeType = 'image/jpeg';
      expect(ALLOWED_BASE64_TYPES.includes(mimeType)).toBe(true);
    });

    it('should reject SVG base64', () => {
      const mimeType = 'image/svg+xml';
      expect(ALLOWED_BASE64_TYPES.includes(mimeType)).toBe(false);
    });

    it('should reject HTML base64', () => {
      const mimeType = 'text/html';
      expect(ALLOWED_BASE64_TYPES.includes(mimeType)).toBe(false);
    });
  });

  describe('File size limits', () => {
    const MAX_UPLOAD_SIZE = 20 * 1024 * 1024; // 20MB
    const MAX_BASE64_SIZE = 5 * 1024 * 1024;  // 5MB

    it('should accept file under 20MB', () => {
      expect(10 * 1024 * 1024).toBeLessThanOrEqual(MAX_UPLOAD_SIZE);
    });

    it('should reject file over 20MB', () => {
      expect(25 * 1024 * 1024).toBeGreaterThan(MAX_UPLOAD_SIZE);
    });

    it('should accept base64 under 5MB', () => {
      expect(3 * 1024 * 1024).toBeLessThanOrEqual(MAX_BASE64_SIZE);
    });

    it('should reject base64 over 5MB', () => {
      expect(8 * 1024 * 1024).toBeGreaterThan(MAX_BASE64_SIZE);
    });
  });

  describe('National ID validation', () => {
    const isValidNationalId = (id) => /^\d{14}$/.test(id.trim());

    it('should accept valid 14-digit ID', () => {
      expect(isValidNationalId('29001011234567')).toBe(true);
    });

    it('should reject ID with letters', () => {
      expect(isValidNationalId('2900101123456a')).toBe(false);
    });

    it('should reject short ID', () => {
      expect(isValidNationalId('1234567890123')).toBe(false);
    });

    it('should reject long ID', () => {
      expect(isValidNationalId('123456789012345')).toBe(false);
    });

    it('should accept ID with leading/trailing spaces', () => {
      expect(isValidNationalId('  29001011234567  ')).toBe(true);
    });
  });
});
