const jwt = require('jsonwebtoken');
const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const Pet = require('../models/Pet');
const RequestModel = require('../models/Request');
const { encryptField, decryptField } = require('../middleware/encryption');

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '15m'
  });
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: '7d'
  });
};

// @desc    Register a user
// @route   POST /api/auth/signup/user
exports.signupUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const phoneEncrypted = encryptField(phone);

    const user = await User.create({
      name: { first: firstName, last: lastName },
      email,
      passwordHash: password, // Pre-save hook hashes this
      phoneEncrypted,
      role: 'USER'
    });

    if (user) {
      const accessToken = generateToken(user._id, user.role);
      const refreshToken = generateRefreshToken(user._id);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        accessToken
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Apply as a doctor
// @route   POST /api/auth/signup/doctor
exports.signupDoctor = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone, qualifications } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const phoneEncrypted = encryptField(phone);

    // Create user with role DOCTOR
    const user = await User.create({
      name: { first: firstName, last: lastName },
      email,
      passwordHash: password,
      phoneEncrypted,
      role: 'DOCTOR'
    });

    // Create Doctor Profile (Pending)
    const doctorProfile = await DoctorProfile.create({
      userId: user._id,
      qualifications,
      docs: req.files ? req.files.map(file => ({
        filename: file.filename,
        filepath: file.path,
        status: 'PENDING'
      })) : []
    });

    res.status(201).json({
      message: 'Application submitted. An admin will review your profile.',
      userId: user._id
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = email ? email.toLowerCase().trim() : '';

    console.log(`[AUTH] Login attempt for email: "${cleanEmail}"`);

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      console.log(`[AUTH] User not found for email: "${cleanEmail}"`);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    console.log(`[AUTH] Password match result for ${cleanEmail}: ${isMatch}, User role: ${user.role}`);

    if (isMatch) {
      const accessToken = generateToken(user._id, user.role);
      const refreshToken = generateRefreshToken(user._id);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        accessToken,
        refreshToken
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('[AUTH] Login error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Refresh token
// @route   POST /api/auth/refresh
exports.refreshToken = async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!refreshToken) return res.status(401).json({ message: 'No refresh token' });

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'User not found' });

    const accessToken = generateToken(user._id, user.role);
    res.json({ accessToken });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
exports.logout = (req, res) => {
  res.clearCookie('refreshToken');
  res.status(200).json({ message: 'Logged out' });
};

// @desc    Get current user profile details
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const phone = user.phoneEncrypted ? decryptField(user.phoneEncrypted) : '';

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone,
      role: user.role,
      location: user.location,
      createdAt: user.createdAt
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reset password using phone number verification
// @route   POST /api/auth/forgot-password
exports.resetPasswordWithPhone = async (req, res) => {
  try {
    const { email, phone, newPassword } = req.body;

    if (!email || !phone || !newPassword) {
      return res.status(400).json({ message: 'Email, phone number, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanPhone = phone.trim();

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    const storedPhone = user.phoneEncrypted ? decryptField(user.phoneEncrypted) : null;
    const cleanStoredPhone = storedPhone ? storedPhone.trim() : '';

    if (cleanStoredPhone !== cleanPhone) {
      return res.status(400).json({ message: 'Phone number does not match our records' });
    }

    user.passwordHash = newPassword; // Pre-save hook hashes with bcrypt
    await user.save();

    res.json({ message: 'Password reset successfully! You can now log in.' });
  } catch (error) {
    console.error('[AUTH] Forgot password error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete user account and anonymize emergency requests
// @route   DELETE /api/auth/delete-account
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Anonymize user's emergency requests (unlink userId)
    await RequestModel.updateMany(
      { userId },
      { $set: { userId: null } }
    );

    // 2. Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 3. Delete user's registered pets
    await Pet.deleteMany({ ownerId: userId });

    // 4. Delete doctor profile if user was a doctor
    if (user.role === 'DOCTOR') {
      await DoctorProfile.deleteOne({ userId });
    }

    // 5. Delete user account
    await User.findByIdAndDelete(userId);

    // 6. Clear cookie
    res.clearCookie('refreshToken');

    res.json({ message: 'Account and personal data deleted successfully.' });
  } catch (error) {
    console.error('[AUTH] Delete account error:', error);
    res.status(500).json({ message: error.message });
  }
};
