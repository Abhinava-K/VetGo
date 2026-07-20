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
  resetPasswordWithPhone
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
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
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

module.exports = router;
