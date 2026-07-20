const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const Request = require('../models/Request');

// @desc    Get dashboard metrics & stats
// @route   GET /api/admin/stats
exports.getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'USER' });
    const totalDoctors = await User.countDocuments({ role: 'DOCTOR' });
    
    // Count pending doctor profiles
    const allProfiles = await DoctorProfile.find();
    const pendingDoctors = allProfiles.filter(p => 
      p.docs && p.docs.some(d => d.status === 'PENDING')
    ).length;

    const totalRequests = await Request.countDocuments();
    const openRequests = await Request.countDocuments({ status: 'OPEN' });
    const completedRequests = await Request.countDocuments({ status: 'COMPLETED' });

    res.json({
      totalUsers,
      totalDoctors,
      pendingDoctors,
      totalRequests,
      openRequests,
      completedRequests
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all doctor applications (pending, approved, rejected)
// @route   GET /api/admin/doctor-applications
exports.getPendingDoctors = async (req, res) => {
  try {
    const doctorProfiles = await DoctorProfile.find()
      .populate('userId', 'name email createdAt role')
      .sort({ createdAt: -1 });

    res.json(doctorProfiles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all emergency requests globally
// @route   GET /api/admin/requests
exports.getAllRequests = async (req, res) => {
  try {
    const requests = await Request.find()
      .populate('userId', 'name email')
      .populate('acceptedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(requests);
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
