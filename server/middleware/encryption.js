const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Recommended for GCM
const TAG_LENGTH = 16;

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * The output is a base64 encoded string containing IV, Tag, and Ciphertext.
 */
const encryptField = (plaintext) => {
  if (!plaintext) return null;
  
  const key = Buffer.from(process.env.FIELD_ENC_KEY, 'base64');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const tag = cipher.getAuthTag();
  
  // Format: iv(base64):tag(base64):ciphertext(base64)
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted}`;
};

/**
 * Decrypts a ciphertext string created by encryptField.
 */
const decryptField = (combined) => {
  if (!combined) return null;
  
  try {
    const [ivBase64, tagBase64, encrypted] = combined.split(':');
    const key = Buffer.from(process.env.FIELD_ENC_KEY, 'base64');
    const iv = Buffer.from(ivBase64, 'base64');
    const tag = Buffer.from(tagBase64, 'base64');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error.message);
    return null;
  }
};

module.exports = {
  encryptField,
  decryptField
};
