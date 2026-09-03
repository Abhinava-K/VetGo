const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    trim: true
  },
  otp: {
    type: String,
    required: true
  },
  purpose: {
    type: String,
    enum: ['SIGNUP', 'LOGIN', 'RESET'],
    default: 'LOGIN'
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 5 * 60 * 1000), // 5 minutes TTL
    index: { expires: 0 }
  }
}, {
  timestamps: true
});

// Index to quickly look up active OTPs for a phone & purpose
otpSchema.index({ phone: 1, purpose: 1 });

const Otp = mongoose.model('Otp', otpSchema);
module.exports = Otp;
