const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['USER', 'DOCTOR', 'ADMIN'],
    default: 'USER'
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  terminationReason: {
    type: String,
    default: ''
  },
  name: {
    first: { type: String, required: true },
    last: { type: String, required: true }
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  phoneEncrypted: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: '' // Path or base64 placeholder
  },
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  pets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet'
  }]
}, {
  timestamps: true
});

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ location: '2dsphere' });

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Pre-save hook to hash password if modified and safeguard ADMIN role
userSchema.pre('save', async function(next) {
  if (this.isModified('role') && this.role === 'ADMIN' && !this._allowAdminRole) {
    return next(new Error("ADMIN tag cannot be assigned via application API. It is strictly reserved for direct database access by the owner."));
  }

  if (!this.isModified('passwordHash')) return next();
  
  const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;
