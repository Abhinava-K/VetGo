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

// Multer setup for emergency injury photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/emergencyPhotos/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    let ext = path.extname(file.originalname).toLowerCase();
    if (!ext) {
      if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') ext = '.jpg';
      else if (file.mimetype === 'image/png') ext = '.png';
      else if (file.mimetype === 'image/webp') ext = '.webp';
      else ext = '.jpg';
    }
    cb(null, 'emergency-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedExts = /jpeg|jpg|png|gif|webp|heic|heif/;
    const allowedMimeTypes = /image\/(jpeg|png|gif|webp|heic|heif|jpg)/;
    const extname = path.extname(file.originalname).toLowerCase().replace('.', '');
    const extValid = allowedExts.test(extname);
    const mimeValid = allowedMimeTypes.test(file.mimetype);

    if (extValid || mimeValid || !file.originalname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed for emergency photos'));
  }
});

router.get('/my-requests', protect, getMyRequests);
router.get('/open', protect, authorize('DOCTOR'), getOpenRequests);
router.get('/:id', protect, getRequestById);
router.post('/', protect, authorize('USER'), upload.single('photo'), validate(requestSchema), createRequest);
router.post('/:id/accept', protect, authorize('DOCTOR'), acceptRequest);
router.post('/:id/start', protect, authorize('DOCTOR'), startRequest);
router.post('/:id/complete', protect, authorize('USER'), completeRequest);

module.exports = router;
