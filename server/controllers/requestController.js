const Request = require('../models/User'); // Wait, Request model is in Request.js
const RequestModel = require('../models/Request');
const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const { decryptField } = require('../middleware/encryption');

// @desc    Create a new emergency request
// @route   POST /api/requests
exports.createRequest = async (req, res) => {
  try {
    const { description, location, petId } = req.body;
    
    const request = await RequestModel.create({
      userId: req.user.id,
      petId,
      description,
      location: {
        type: 'Point',
        coordinates: location.coordinates // [lng, lat]
      },
      status: 'OPEN'
    });

    // Notify nearby doctors via socket
    const io = req.app.get('io');
    // Find nearby doctors (business logic for matching can be complex, here we broadcast)
    // In a real app, you'd query doctors within radius and emit to their specific rooms
    io.to('doctors_room').emit('request:new', {
      requestId: request._id,
      description: request.description,
      location: request.location.coordinates,
      userName: `${req.user.name.first} ${req.user.name.last}`
    });

    res.status(201).json(request);
  } catch (error) {
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
    
    const doctor = await User.findById(doctorId).select('name');
    const doctorProfile = await DoctorProfile.findOne({ userId: doctorId });

    // 4. Notify the user
    const io = req.app.get('io');
    io.to(request.userId._id.toString()).emit('request:accepted', {
      requestId: request._id,
      doctorId: doctor._id,
      doctorName: `${doctor.name.first} ${doctor.name.last}`,
      qualification: doctorProfile.qualifications,
      ratingAvg: doctorProfile.ratingAvg,
      phone: decryptField(req.user.phoneEncrypted) // Doctor's phone
    });

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

    // Notify the user via socket
    const io = req.app.get('io');
    io.to(request.userId.toString()).emit('request:update', {
      requestId: request._id,
      status: 'IN_PROGRESS'
    });

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
    const { rating, review } = req.body;
    const request = await RequestModel.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Only the user who created the request can complete it (and provide rating)
    if (request.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to complete this request' });
    }

    request.status = 'COMPLETED';
    request.completedAt = Date.now();
    request.rating = { score: rating, review };
    await request.save();

    // Update doctor's stats
    const doctorProfile = await DoctorProfile.findOne({ userId: request.acceptedBy });
    if (doctorProfile) {
      const totalScore = (doctorProfile.ratingAvg * doctorProfile.ratingCount) + rating;
      doctorProfile.ratingCount += 1;
      doctorProfile.ratingAvg = totalScore / doctorProfile.ratingCount;
      doctorProfile.currentlyAssignedRequest = null;
      doctorProfile.available = true;
      await doctorProfile.save();
    }

    // Notify doctor
    const io = req.app.get('io');
    io.to(request.acceptedBy.toString()).emit('request:completed', { requestId: request._id });

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

// @desc    Get request by ID
// @route   GET /api/requests/:id
exports.getRequestById = async (req, res) => {
  try {
    const request = await RequestModel.findById(req.params.id)
      .populate('userId', 'name phoneEncrypted')
      .populate('petId');
      
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.userId._id.toString() !== req.user.id && request.acceptedBy?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view this request' });
    }

    const requestObj = request.toObject();
    
    // Decrypt user phone number for the assigned doctor
    if (request.acceptedBy?.toString() === req.user.id) {
      requestObj.userPhone = decryptField(request.userId.phoneEncrypted);
    }

    res.json(requestObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
