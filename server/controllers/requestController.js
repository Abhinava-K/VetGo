const RequestModel = require('../models/Request');
const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const { decryptField } = require('../middleware/encryption');

// @desc    Create a new emergency request
// @route   POST /api/requests
exports.createRequest = async (req, res) => {
  try {
    const { description, location, petId, doctorId, animalCategory } = req.body;
    
    const isMockDoctor = typeof doctorId === 'string' && doctorId.startsWith('doc-');

    const mockDoctorMap = {
      'doc-1': { name: 'Dr. Sarah Jenkins', qualification: 'BVSc & AH - Small Animal Specialist', phone: '+18005550199' },
      'doc-2': { name: 'Dr. Rajesh Sharma', qualification: 'MVSc Veterinary Surgery', phone: '+18005550288' },
      'doc-3': { name: 'Dr. Emily Wong', qualification: 'DVM - Avian & Exotic Pet Expert', phone: '+18005550377' },
      'doc-4': { name: 'Dr. Amit Patel', qualification: 'Senior Veterinary Clinician', phone: '+18005550466' },
    };

    const requestData = {
      userId: req.user.id,
      petId: petId || null,
      animalCategory: animalCategory || (petId ? 'PET' : 'STRAY'),
      description,
      location: {
        type: 'Point',
        coordinates: location.coordinates // [lng, lat]
      },
      status: 'OPEN'
    };

    if (isMockDoctor && mockDoctorMap[doctorId]) {
      requestData.status = 'ASSIGNED';
      requestData.mockDoctor = mockDoctorMap[doctorId];
    } else if (doctorId && !isMockDoctor) {
      // If a specific real doctor was targeted
      requestData.acceptedBy = doctorId;
    }

    const request = await RequestModel.create(requestData);

    // Notify nearby doctors via socket
    const io = req.app.get('io');
    if (io) {
      io.to('doctors_room').emit('request:new', {
        requestId: request._id,
        description: request.description,
        location: request.location.coordinates,
        userName: `${req.user.name?.first || 'User'} ${req.user.name?.last || ''}`.trim()
      });
    }

    res.status(201).json(request);
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Accept a request (Atomic)
// @route   POST /api/requests/:id/accept
exports.acceptRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const doctorId = req.user.id;

    // 1. Atomic update to ensure only one doctor accepts
    const request = await RequestModel.findOneAndUpdate(
      { _id: requestId, status: 'OPEN' },
      { 
        $set: { 
          status: 'ASSIGNED', 
          acceptedBy: doctorId,
          acceptedAt: Date.now()
        } 
      },
      { new: true }
    ).populate('userId', 'name phoneEncrypted');

    if (!request) {
      return res.status(400).json({ message: 'Request no longer available or already accepted' });
    }

    // 2. Update doctor's current assignment
    await DoctorProfile.findOneAndUpdate(
      { userId: doctorId },
      { currentlyAssignedRequest: requestId, available: false }
    );

    // 3. Prepare data for response (including decrypted user phone)
    const userPhone = decryptField(request.userId.phoneEncrypted);
    
    const doctor = await User.findById(doctorId).select('name phoneEncrypted');
    const doctorProfile = await DoctorProfile.findOne({ userId: doctorId });

    const doctorPhone = doctor.phoneEncrypted ? decryptField(doctor.phoneEncrypted) : '';

    // 4. Notify the user via socket
    const io = req.app.get('io');
    if (io) {
      io.to(request.userId._id.toString()).emit('request:accepted', {
        requestId: request._id,
        doctorId: doctor._id,
        doctorName: `${doctor.name?.first || 'Dr.'} ${doctor.name?.last || ''}`.trim(),
        qualification: doctorProfile?.qualifications || 'Veterinarian',
        ratingAvg: doctorProfile?.ratingAvg || 5.0,
        phone: doctorPhone
      });
    }

    res.json({
      ...request.toObject(),
      userPhone, // Only visible to the accepted doctor
      message: 'Request accepted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Start a request (set status to IN_PROGRESS)
// @route   POST /api/requests/:id/start
exports.startRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const doctorId = req.user.id;

    const request = await RequestModel.findOneAndUpdate(
      { _id: requestId, acceptedBy: doctorId, status: 'ASSIGNED' },
      { 
        $set: { 
          status: 'IN_PROGRESS',
          startedAt: Date.now()
        } 
      },
      { new: true }
    );

    if (!request) {
      return res.status(400).json({ message: 'Request cannot be started (must be ASSIGNED to you)' });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(request.userId.toString()).emit('request:update', {
        requestId: request._id,
        status: 'IN_PROGRESS'
      });
    }

    res.json({
      message: 'Request started successfully',
      request
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Complete a request
// @route   POST /api/requests/:id/complete
exports.completeRequest = async (req, res) => {
  try {
    const { rating, review, resolutionNotes } = req.body;
    const request = await RequestModel.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const isRequester = request.userId && request.userId.toString() === req.user.id;
    const isDoctor = request.acceptedBy && request.acceptedBy.toString() === req.user.id;

    if (!isRequester && !isDoctor) {
      return res.status(403).json({ message: 'Not authorized to complete this request' });
    }

    request.status = 'COMPLETED';
    request.completedAt = Date.now();
    if (resolutionNotes) {
      request.resolutionNotes = resolutionNotes;
    }
    if (rating) {
      request.rating = { score: rating, review: review || '' };
    }
    await request.save();

    if (rating && request.acceptedBy) {
      const doctorProfile = await DoctorProfile.findOne({ userId: request.acceptedBy });
      if (doctorProfile) {
        const totalScore = (doctorProfile.ratingAvg * doctorProfile.ratingCount) + rating;
        doctorProfile.ratingCount += 1;
        doctorProfile.ratingAvg = totalScore / doctorProfile.ratingCount;
        doctorProfile.currentlyAssignedRequest = null;
        doctorProfile.available = true;
        await doctorProfile.save();
      }
    }

    const io = req.app.get('io');
    if (io && request.acceptedBy) {
      io.to(request.acceptedBy.toString()).emit('request:completed', { requestId: request._id });
    }

    res.json({ message: 'Request completed and rated', request });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user's requests (or doctor's assigned requests)
// @route   GET /api/requests/my-requests
exports.getMyRequests = async (req, res) => {
  try {
    let requests;
    if (req.user.role === 'DOCTOR') {
      requests = await RequestModel.find({ acceptedBy: req.user.id })
        .populate('userId', 'name')
        .populate('petId')
        .sort({ createdAt: -1 });
    } else {
      requests = await RequestModel.find({ userId: req.user.id })
        .populate('acceptedBy', 'name')
        .populate('petId')
        .sort({ createdAt: -1 });
    }
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all OPEN emergency requests (for doctors)
// @route   GET /api/requests/open
exports.getOpenRequests = async (req, res) => {
  try {
    const requests = await RequestModel.find({ status: 'OPEN' })
      .populate('userId', 'name')
      .populate('petId')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get request by ID
// @route   GET /api/requests/:id
exports.getRequestById = async (req, res) => {
  try {
    const request = await RequestModel.findById(req.params.id)
      .populate('userId', 'name phoneEncrypted')
      .populate('acceptedBy', 'name phoneEncrypted')
      .populate('petId');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const reqObj = request.toObject();

    // If requester or accepted doctor is viewing, include decrypted phone
    const isUserOwner = request.userId && request.userId._id && req.user.id === request.userId._id.toString();
    const isAcceptedDoctor = req.user.role === 'DOCTOR' && request.acceptedBy && request.acceptedBy._id.toString() === req.user.id;

    if (isAcceptedDoctor) {
      reqObj.userPhone = request.userId && request.userId.phoneEncrypted ? decryptField(request.userId.phoneEncrypted) : null;
    } else if (isUserOwner && request.acceptedBy) {
      reqObj.doctorPhone = request.acceptedBy && request.acceptedBy.phoneEncrypted ? decryptField(request.acceptedBy.phoneEncrypted) : null;
    }

    res.json(reqObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
