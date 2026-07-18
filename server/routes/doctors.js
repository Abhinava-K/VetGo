const express = require('express');
const router = express.Router();
const { 
  getNearbyDoctors, 
  updateAvailability,
  getDoctorProfile
} = require('../controllers/doctorController');
const { protect, authorize } = require('../middleware/auth');

router.get('/nearby', protect, getNearbyDoctors);
router.get('/profile', protect, authorize('DOCTOR'), getDoctorProfile);
router.put('/availability', protect, authorize('DOCTOR'), updateAvailability);

module.exports = router;
