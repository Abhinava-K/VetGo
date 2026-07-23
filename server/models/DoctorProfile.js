const mongoose = require('mongoose');

const doctorProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  qualifications: {
    type: String,
    required: true,
    trim: true,
    maxlength: 140
  },
  docs: [{
    filename: String,
    filepath: String,
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING'
    }
  }],
  ratingAvg: {
    type: Number,
    default: 0
  },
  ratingCount: {
    type: Number,
    default: 0
  },
  currentlyAssignedRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request',
    default: null
  },
  available: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

doctorProfileSchema.index({ ratingAvg: -1, isVerified: 1 });
doctorProfileSchema.index({ isVerified: 1 });

const DoctorProfile = mongoose.model('DoctorProfile', doctorProfileSchema);
module.exports = DoctorProfile;
