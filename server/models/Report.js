const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportedId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request',
    required: true
  },
  reporterRole: {
    type: String,
    enum: ['USER', 'DOCTOR'],
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      // Doctor reporting User
      'SPAM_FAKE_EMERGENCY',
      'USER_NO_SHOW',
      'OFFENSIVE_PHOTO',
      'UNSAFE_LOCATION',
      'USER_HARASSMENT',
      'RETALIATORY_FEEDBACK',
      // User reporting Doctor
      'DOCTOR_NO_SHOW_LATE',
      'RUDE_UNPROFESSIONAL',
      'OVERCHARGING',
      'MEDICAL_NEGLIGENCE',
      'UNAUTHORIZED_CONTACT',
      // Generic
      'OTHER'
    ]
  },
  description: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['PENDING', 'RESOLVED', 'DISMISSED'],
    default: 'PENDING'
  },
  adminNotes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

reportSchema.index({ reporterId: 1, requestId: 1 }, { unique: true });

const Report = mongoose.model('Report', reportSchema);
module.exports = Report;
