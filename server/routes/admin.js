const express = require('express');
const router = express.Router();
const { 
  getAdminStats,
  getPendingDoctors, 
  getAllRequests,
  approveDoctor, 
  rejectDoctor,
  terminateDoctor,
  getDoctorReviews,
  searchDoctors,
  getAllReports,
  updateReportStatus
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// All routes here are restricted to ADMIN
router.use(protect, authorize('ADMIN'));

router.get('/stats', getAdminStats);
router.get('/doctors/search', searchDoctors);
router.get('/doctor-applications', getPendingDoctors);
router.get('/requests', getAllRequests);
router.get('/reports', getAllReports);
router.put('/reports/:id/status', updateReportStatus);
router.post('/doctor-applications/:userId/approve', approveDoctor);
router.post('/doctor-applications/:userId/reject', rejectDoctor);
router.post('/doctors/:userId/terminate', terminateDoctor);
router.get('/doctors/:doctorId/reviews', getDoctorReviews);

module.exports = router;
