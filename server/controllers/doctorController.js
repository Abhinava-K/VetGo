const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const { decryptField } = require('../middleware/encryption');

// @desc    Get current doctor profile
// @route   GET /api/doctors/profile
exports.getDoctorProfile = async (req, res) => {
  try {
    const profile = await DoctorProfile.findOne({ userId: req.user.id });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get nearby available doctors
// @route   GET /api/doctors/nearby
exports.getNearbyDoctors = async (req, res) => {
  try {
    const { lat, lng, radiusKm = 5 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    // 1. Find users with role DOCTOR nearby
    const nearbyUsers = await User.find({
      role: 'DOCTOR',
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: radiusKm * 1000 // Convert km to meters
        }
      }
    }).select('name location phoneEncrypted');

    // 2. Filter by approved and available in DoctorProfile
    const userIds = nearbyUsers.map(u => u._id);
    const approvedProfiles = await DoctorProfile.find({
      userId: { $in: userIds },
      available: true,
      'docs.status': 'APPROVED'
    });

    const approvedUserIds = approvedProfiles.map(p => p.userId.toString());

    const result = nearbyUsers
      .filter(u => approvedUserIds.includes(u._id.toString()))
      .map(u => {
        const profile = approvedProfiles.find(p => p.userId.toString() === u._id.toString());
        return {
          _id: u._id,
          name: u.name,
          location: u.location,
          qualifications: profile.qualifications,
          ratingAvg: profile.ratingAvg,
          ratingCount: profile.ratingCount
          // Note: Phone is NOT included here, only after assignment
        };
      });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update doctor availability
// @route   PUT /api/doctors/availability
exports.updateAvailability = async (req, res) => {
  try {
    const { available } = req.body;
    const profile = await DoctorProfile.findOneAndUpdate(
      { userId: req.user.id },
      { available },
      { new: true }
    );
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
