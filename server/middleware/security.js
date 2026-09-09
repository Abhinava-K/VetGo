const fs = require('fs');
const path = require('path');

/**
 * Known file signatures (magic bytes) for allowed formats
 */
const MAGIC_BYTES = {
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
  jpg: [0xFF, 0xD8, 0xFF],        // JPEG start of image
  png: [0x89, 0x50, 0x4E, 0x47], // PNG header (.PNG)
  webp: [0x52, 0x49, 0x46, 0x46] // RIFF (for WEBP)
};

/**
 * Dangerous script signatures to check in the file header
 */
const DANGEROUS_STRINGS = [
  '<?php',
  '<script',
  'eval(',
  '#!/bin',
  '#!/usr',
  'cmd.exe',
  'powershell',
  '<html',
  '<%',
  '<?'
];

/**
 * Verify file magic bytes and ensure no malicious script signatures exist in header
 * @param {string} filePath - Absolute path to uploaded file on disk
 * @param {Array<string>} allowedTypes - Array of allowed formats ('pdf', 'jpg', 'png', 'webp')
 * @returns {boolean} - true if valid, false if corrupted or malicious
 */
const isValidFileSignature = (filePath, allowedTypes = ['jpg', 'png', 'pdf', 'webp']) => {
  let fd;
  try {
    if (!fs.existsSync(filePath)) return false;

    const buffer = Buffer.alloc(512);
    fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, 512, 0);
    fs.closeSync(fd);
    fd = null;

    if (bytesRead < 4) return false;

    // 1. Check for malicious script text in the first 512 bytes
    const headerString = buffer.toString('utf8', 0, bytesRead).toLowerCase();
    for (const dangerous of DANGEROUS_STRINGS) {
      if (headerString.includes(dangerous)) {
        return false;
      }
    }

    // 2. Validate magic bytes against allowed types
    const matchesSignature = allowedTypes.some(type => {
      const signature = MAGIC_BYTES[type];
      if (!signature) return false;

      // Special handling for WEBP which requires checking 'WEBP' at offset 8
      if (type === 'webp') {
        const isRiff = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
        if (!isRiff || bytesRead < 12) return false;
        const isWebp = buffer.toString('utf8', 8, 12) === 'WEBP';
        return isWebp;
      }

      // Check standard prefix magic bytes
      for (let i = 0; i < signature.length; i++) {
        if (buffer[i] !== signature[i]) {
          return false;
        }
      }
      return true;
    });

    return matchesSignature;
  } catch (err) {
    if (fd) {
      try { fs.closeSync(fd); } catch (e) {}
    }
    return false;
  }
};

/**
 * Express middleware to verify uploaded files against corruption and malicious payloads
 * @param {Array<string>} allowedTypes - e.g. ['pdf', 'jpg', 'png']
 */
const verifyUploadedFiles = (allowedTypes = ['pdf', 'jpg', 'png']) => (req, res, next) => {
  const filesToCheck = [];

  if (req.file) {
    filesToCheck.push(req.file);
  } else if (req.files) {
    if (Array.isArray(req.files)) {
      filesToCheck.push(...req.files);
    } else {
      Object.values(req.files).forEach(f => {
        if (Array.isArray(f)) filesToCheck.push(...f);
        else filesToCheck.push(f);
      });
    }
  }

  for (const file of filesToCheck) {
    const valid = isValidFileSignature(file.path, allowedTypes);
    if (!valid) {
      // Clean up invalid/corrupt files immediately from disk
      try {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      } catch (e) {}

      // Clean up all other files in this request as well
      filesToCheck.forEach(f => {
        try { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); } catch (e) {}
      });

      return res.status(400).json({
        message: 'Security validation failed: File content is corrupted or contains an unauthorized format.'
      });
    }
  }

  next();
};

/**
 * Recursive sanitizer for NoSQL / SQL injection prevention.
 * Strips keys starting with '$' (MongoDB operator injection) and replaces '.' in keys.
 */
const sanitizeData = (target) => {
  if (!target || typeof target !== 'object') {
    if (typeof target === 'string') {
      // Remove null bytes
      return target.replace(/\0/g, '');
    }
    return target;
  }

  if (Array.isArray(target)) {
    return target.map(item => sanitizeData(item));
  }

  const clean = {};
  for (const [key, value] of Object.entries(target)) {
    // Prohibit MongoDB operator keys starting with $ or containing .
    if (key.startsWith('$') || key.includes('.')) {
      continue; // Strip malicious operator keys
    }
    clean[key] = sanitizeData(value);
  }
  return clean;
};

/**
 * Express middleware to sanitize body, query, and params against NoSQL injection
 */
const sanitizeInputs = (req, res, next) => {
  if (req.body) req.body = sanitizeData(req.body);
  if (req.query) req.query = sanitizeData(req.query);
  if (req.params) req.params = sanitizeData(req.params);
  next();
};

module.exports = {
  isValidFileSignature,
  verifyUploadedFiles,
  sanitizeInputs,
  sanitizeData
};
