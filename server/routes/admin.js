const express = require('express');
const router = express.Router();
const { 
  getAdminStats,
  getPendingDoctors, 
  getAllRequests,
  approveDoctor, 
  rejectDoctor 
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// All routes here are restricted to ADMIN
router.use(protect, authorize('ADMIN'));

router.get('/stats', getAdminStats);
router.get('/doctor-applications', getPendingDoctors);
router.get('/requests', getAllRequests);
router.post('/doctor-applications/:userId/approve', approveDoctor);
router.post('/doctor-applications/:userId/reject', rejectDoctor);

module.exports = router;
