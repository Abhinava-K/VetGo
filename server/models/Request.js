const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  petId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet'
  },
  animalCategory: {
    type: String,
    enum: ['PET', 'STRAY'],
    default: 'PET'
  },
  resolutionNotes: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    required: true,
    maxlength: 400
  },
  photoUrl: {
    type: String,
    default: null
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
    enum: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'TREATMENT_COMPLETED', 'COMPLETED', 'CANCELLED', 'REPORTED'],
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
  prescriptions: [
    {
      medicineName: { type: String, required: true },
      dosage: { type: String, required: true },
      description: { type: String, default: '' }
    }
  ],
  doctorNotes: {
    type: String,
    default: ''
  },
  acceptedAt: Date,
  startedAt: Date,
  doctorCompletedAt: Date,
  userCompletedAt: Date,
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
