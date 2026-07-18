const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');

// @desc    Get all pending doctor applications
// @route   GET /api/admin/doctor-applications
exports.getPendingDoctors = async (req, res) => {
  try {
    const pendingDocs = await DoctorProfile.find({
      'docs.status': 'PENDING'
    }).populate('userId', 'name email');
    
    res.json(pendingDocs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve a doctor application
// @route   POST /api/admin/doctor-applications/:userId/approve
exports.approveDoctor = async (req, res) => {
  try {
    const { userId } = req.params;

    // 1. Update User role to DOCTOR
    const user = await User.findByIdAndUpdate(userId, { role: 'DOCTOR' }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // 2. Update DoctorProfile docs status to APPROVED
    const profile = await DoctorProfile.findOneAndUpdate(
      { userId },
      { $set: { 'docs.$[].status': 'APPROVED' } },
      { new: true }
    );

    res.json({ message: 'Doctor approved successfully', user, profile });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reject a doctor application
// @route   POST /api/admin/doctor-applications/:userId/reject
exports.rejectDoctor = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const profile = await DoctorProfile.findOneAndUpdate(
      { userId },
      { $set: { 'docs.$[].status': 'REJECTED' } },
      { new: true }
    );

    res.json({ message: 'Doctor application rejected', profile, reason });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
