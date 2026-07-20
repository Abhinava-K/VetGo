const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  petId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet'
  },
  description: {
    type: String,
    required: true,
    maxlength: 400
  },
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  radiusKm: {
    type: Number,
    default: 5
  },
  status: {
    type: String,
    enum: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    default: 'OPEN'
  },
  acceptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Refers to the doctor (who is a User with role DOCTOR)
    default: null
  },
  mockDoctor: {
    name: String,
    qualification: String,
    phone: String
  },
  acceptedAt: Date,
  startedAt: Date,
  completedAt: Date,
  rating: {
    score: { type: Number, min: 1, max: 5 },
    review: String
  }
}, {
  timestamps: true
});

// Indexes
requestSchema.index({ location: '2dsphere' });
requestSchema.index({ status: 1 });

const Request = mongoose.model('Request', requestSchema);
module.exports = Request;
