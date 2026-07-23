const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { 
  signupUser, 
  signupDoctor, 
  login, 
  refreshToken, 
  logout,
  getMe,
  resetPasswordWithPhone,
  deleteAccount
} = require('../controllers/authController');
const { 
  validate, 
  signupUserSchema, 
  signupDoctorSchema, 
  loginSchema 
} = require('../middleware/validators');
const { protect } = require('../middleware/auth');

// Multer setup for doctor docs
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/doctorDocs/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    let ext = path.extname(file.originalname).toLowerCase();
    if (!ext) {
      if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') ext = '.jpg';
      else if (file.mimetype === 'image/png') ext = '.png';
      else if (file.mimetype === 'image/webp') ext = '.webp';
      else if (file.mimetype === 'image/heic') ext = '.heic';
      else if (file.mimetype === 'image/gif') ext = '.gif';
      else if (file.mimetype === 'application/pdf') ext = '.pdf';
      else if (file.mimetype === 'application/msword') ext = '.doc';
      else if (file.mimetype.includes('wordprocessingml')) ext = '.docx';
      else ext = '.jpg';
    }
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedExts = /jpeg|jpg|png|gif|webp|heic|heif|pdf|doc|docx/;
    const allowedMimeTypes = /image\/(jpeg|png|gif|webp|heic|heif|jpg)|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|application\/octet-stream/;

    const extname = path.extname(file.originalname).toLowerCase().replace('.', '');
    const extValid = allowedExts.test(extname);
    const mimeValid = allowedMimeTypes.test(file.mimetype);

    if (extValid || mimeValid || !file.originalname) {
      return cb(null, true);
    }
    cb(new Error('Only images, PDFs and Word docs are allowed'));
  }
});

router.post('/signup/user', validate(signupUserSchema), signupUser);
router.post('/signup/doctor', upload.array('docs', 3), validate(signupDoctorSchema), signupDoctor);
router.post('/login', validate(loginSchema), login);
router.post('/forgot-password', resetPasswordWithPhone);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.delete('/delete-account', protect, deleteAccount);

module.exports = router;
