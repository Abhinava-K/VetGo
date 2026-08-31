const crypto = require('crypto');
const { encryptField, decryptField } = require('../middleware/encryption');

describe('Field-Level AES-256-GCM Encryption Middleware', () => {
  beforeAll(() => {
    // Generate a valid 32-byte base64 encryption key if not present in env
    if (!process.env.FIELD_ENC_KEY) {
      process.env.FIELD_ENC_KEY = crypto.randomBytes(32).toString('base64');
    }
  });

  test('should encrypt and decrypt plaintext string accurately', () => {
    const originalText = '+1 (555) 234-5678';
    const ciphertext = encryptField(originalText);

    expect(ciphertext).toBeDefined();
    expect(ciphertext).not.toBe(originalText);

    const decryptedText = decryptField(ciphertext);
    expect(decryptedText).toBe(originalText);
  });

  test('should handle empty or null inputs gracefully', () => {
    expect(encryptField(null)).toBeNull();
    expect(encryptField('')).toBe('');
    expect(decryptField(null)).toBeNull();
    expect(decryptField('')).toBe('');
  });
});
