const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { 
  signupUser, 
  signupDoctor, 
  login, 
  sendOtp,
  loginWithOtp,
  refreshToken, 
  logout,
  getMe,
  resetPasswordWithPhone,
  deleteAccount,
  acknowledgeWarning
} = require('../controllers/authController');
const { 
  validate, 
  signupUserSchema, 
  signupDoctorSchema, 
  loginSchema,
  sendOtpSchema,
  loginOtpSchema
} = require('../middleware/validators');
const { protect } = require('../middleware/auth');
const { verifyUploadedFiles } = require('../middleware/security');

// Multer setup for doctor docs (Strictly PDF, JPG, PNG only)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/doctorDocs/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    let ext = path.extname(file.originalname).toLowerCase();
    if (!ext || !['.pdf', '.jpg', '.jpeg', '.png'].includes(ext)) {
      if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') ext = '.jpg';
      else if (file.mimetype === 'image/png') ext = '.png';
      else if (file.mimetype === 'application/pdf') ext = '.pdf';
      else ext = '.pdf';
    }
    // Safe alphanumeric filename without user-controlled path characters
    cb(null, 'doc-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB per file max
    files: 3 // Max 3 documents
  },
  fileFilter: (req, file, cb) => {
    const allowedExts = /^(pdf|jpg|jpeg|png)$/i;
    const allowedMimeTypes = /^(application\/pdf|image\/jpeg|image\/jpg|image\/png)$/i;

    const extname = path.extname(file.originalname).toLowerCase().replace('.', '');
    const extValid = allowedExts.test(extname);
    const mimeValid = allowedMimeTypes.test(file.mimetype);

    if (extValid && mimeValid) {
      return cb(null, true);
    }
    cb(new Error('Security restriction: Only PDF, JPG, and PNG documents are permitted.'));
  }
});

router.post('/signup/user', validate(signupUserSchema), signupUser);
router.post(
  '/signup/doctor', 
  upload.array('docs', 3), 
  verifyUploadedFiles(['pdf', 'jpg', 'png']), 
  validate(signupDoctorSchema), 
  signupDoctor
);
router.post('/login', validate(loginSchema), login);
router.post('/send-otp', validate(sendOtpSchema), sendOtp);
router.post('/login-otp', validate(loginOtpSchema), loginWithOtp);
router.post('/forgot-password', resetPasswordWithPhone);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.post('/warnings/:warningId/acknowledge', protect, acknowledgeWarning);
router.delete('/delete-account', protect, deleteAccount);

module.exports = router;
