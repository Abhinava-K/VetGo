const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { 
  createRequest, 
  acceptRequest, 
  startRequest,
  completeRequest,
  getMyRequests,
  getOpenRequests,
  getRequestById
} = require('../controllers/requestController');
const { protect, authorize } = require('../middleware/auth');
const { validate, requestSchema } = require('../middleware/validators');
const { verifyUploadedFiles } = require('../middleware/security');

// Multer setup for emergency injury photos (Strictly JPG, PNG, WEBP)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/emergencyPhotos/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    let ext = path.extname(file.originalname).toLowerCase();
    if (!ext || !['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      if (file.mimetype === 'image/png') ext = '.png';
      else if (file.mimetype === 'image/webp') ext = '.webp';
      else ext = '.jpg';
    }
    // Safe alphanumeric filename without user-controlled path characters
    cb(null, 'emergency-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedExts = /^(jpeg|jpg|png|webp)$/i;
    const allowedMimeTypes = /^(image\/jpeg|image\/jpg|image\/png|image\/webp)$/i;

    const extname = path.extname(file.originalname).toLowerCase().replace('.', '');
    const extValid = allowedExts.test(extname);
    const mimeValid = allowedMimeTypes.test(file.mimetype);

    if (extValid && mimeValid) {
      return cb(null, true);
    }
    cb(new Error('Security restriction: Only JPG, PNG, and WEBP images are allowed for emergency triage photos.'));
  }
});

router.get('/my-requests', protect, getMyRequests);
router.get('/open', protect, authorize('DOCTOR'), getOpenRequests);
router.get('/:id', protect, getRequestById);
router.post(
  '/', 
  protect, 
  authorize('USER'), 
  upload.single('photo'), 
  verifyUploadedFiles(['jpg', 'png', 'webp']), 
  validate(requestSchema), 
  createRequest
);
router.post('/:id/accept', protect, authorize('DOCTOR'), acceptRequest);
router.post('/:id/start', protect, authorize('DOCTOR'), startRequest);
router.post('/:id/complete', protect, authorize('USER'), completeRequest);

module.exports = router;
