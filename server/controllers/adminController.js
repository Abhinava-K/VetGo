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
      .populate('userId', 'name email createdAt role isDeleted terminationReason')
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

    // 1. Update User role to DOCTOR and clear deleted status/reason
    const user = await User.findByIdAndUpdate(userId, { 
      role: 'DOCTOR',
      isDeleted: false,
      terminationReason: ''
    }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // 2. Update DoctorProfile docs status to APPROVED and isVerified to true
    let profile = await DoctorProfile.findOne({ userId });
    if (profile) {
      profile.isVerified = true;
      if (!profile.docs || profile.docs.length === 0) {
        profile.docs = [{ filename: 'admin_verified', filepath: 'system', status: 'APPROVED' }];
      } else {
        profile.docs.forEach(d => { d.status = 'APPROVED'; });
      }
      await profile.save();
    }

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
      { $set: { isVerified: false, 'docs.$[].status': 'REJECTED' } },
      { new: true }
    );

    res.json({ message: 'Doctor application rejected', profile, reason });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Terminate a doctor account
// @route   POST /api/admin/doctors/:userId/terminate
exports.terminateDoctor = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await User.findByIdAndUpdate(userId, { 
      isDeleted: true,
      terminationReason: reason || 'Violation of platform guidelines'
    }, { new: true });

    if (!user) return res.status(404).json({ message: 'Doctor not found' });

    // Mark as offline & unverified in profile
    await DoctorProfile.findOneAndUpdate(
      { userId },
      { isVerified: false, available: false, currentlyAssignedRequest: null }
    );

    res.json({ message: 'Doctor account terminated successfully', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get reviews for a specific doctor
// @route   GET /api/admin/doctors/:doctorId/reviews
exports.getDoctorReviews = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const reviews = await Request.find({
      acceptedBy: doctorId,
      'rating.score': { $exists: true }
    })
    .select('rating createdAt userId')
    .populate('userId', 'name')
    .sort({ createdAt: -1 })
    .limit(50); // Optimization: Limit to recent 50 reviews to minimize DB overhead

    const formattedReviews = reviews.map(r => ({
      _id: r._id,
      score: r.rating.score,
      review: r.rating.review || '',
      createdAt: r.createdAt,
      userName: r.userId?.name 
        ? `${r.userId.name.first} ${r.userId.name.last}` 
        : 'Anonymous Reporter'
    }));

    res.json(formattedReviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Search and filter doctors with rating bounds and keywords
// @route   GET /api/admin/doctors/search
exports.searchDoctors = async (req, res) => {
  try {
    const { q, minRating, maxRating, status, page = 1, limit = 50 } = req.query;

    let doctorMatch = {};

    if (minRating !== undefined && minRating !== '') {
      doctorMatch.ratingAvg = { ...doctorMatch.ratingAvg, $gte: parseFloat(minRating) };
    }
    if (maxRating !== undefined && maxRating !== '') {
      doctorMatch.ratingAvg = { ...doctorMatch.ratingAvg, $lte: parseFloat(maxRating) };
    }
    if (status === 'verified') {
      doctorMatch.isVerified = true;
    } else if (status === 'pending') {
      doctorMatch.isVerified = false;
    }

    const pipeline = [
      { $match: doctorMatch },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userId'
        }
      },
      { $unwind: '$userId' }
    ];

    let postLookupMatch = {};

    if (status === 'terminated') {
      postLookupMatch['userId.isDeleted'] = true;
    } else {
      postLookupMatch['userId.isDeleted'] = { $ne: true };
    }

    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      postLookupMatch.$or = [
        { 'userId.name.first': regex },
        { 'userId.name.last': regex },
        { 'userId.email': regex },
        { qualifications: regex }
      ];
    }

    if (Object.keys(postLookupMatch).length > 0) {
      pipeline.push({ $match: postLookupMatch });
    }

    // Sort by ratingAvg descending, then createdAt descending
    pipeline.push({ $sort: { ratingAvg: -1, createdAt: -1 } });

    // Count & Paginate using $facet
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    const skipNum = (pageNum - 1) * limitNum;

    pipeline.push({
      $facet: {
        data: [{ $skip: skipNum }, { $limit: limitNum }],
        totalCount: [{ $count: 'count' }]
      }
    });

    const result = await DoctorProfile.aggregate(pipeline);
    const doctors = result[0]?.data || [];
    const total = result[0]?.totalCount[0]?.count || 0;

    res.json({
      doctors,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error('Error searching doctors:', error);
    res.status(500).json({ message: error.message });
  }
};
