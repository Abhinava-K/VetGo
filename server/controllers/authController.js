const jwt = require('jsonwebtoken');
const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const Pet = require('../models/Pet');
const RequestModel = require('../models/Request');
const Otp = require('../models/Otp');
const { encryptField, decryptField } = require('../middleware/encryption');
const { sendSmsOtp } = require('../utils/smsService');

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

const normalizePhone = (p) => (p ? p.toString().replace(/[\s\-\(\)]/g, '') : '');

const findUserByPhone = async (phone) => {
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone) return null;

  const digitsOnly = cleanPhone.replace(/^\+/, '');
  const last10 = digitsOnly.slice(-10);

  const users = await User.find({});
  for (const user of users) {
    if (user.phoneEncrypted) {
      const decrypted = decryptField(user.phoneEncrypted);
      if (decrypted) {
        const decryptedClean = normalizePhone(decrypted);
        const decryptedDigits = decryptedClean.replace(/^\+/, '');
        if (
          decryptedClean === cleanPhone ||
          (last10.length >= 7 && decryptedDigits.endsWith(last10))
        ) {
          return user;
        }
      }
    }
  }
  return null;
};

// @desc    Send OTP to phone for signup / login / password reset
// @route   POST /api/auth/send-otp
exports.sendOtp = async (req, res) => {
  try {
    const { phone, purpose = 'LOGIN' } = req.body;
    if (!phone || typeof phone !== 'string' || phone.trim().length < 6) {
      return res.status(400).json({ message: 'A valid phone number is required' });
    }

    const cleanPhone = normalizePhone(phone);
    const existingUser = await findUserByPhone(cleanPhone);

    if (purpose === 'LOGIN') {
      if (!existingUser || (existingUser.isDeleted && !(existingUser.role === 'DOCTOR' && existingUser.terminationReason))) {
        return res.status(404).json({ message: 'No registered account found with this phone number. Please sign up.' });
      }
    } else if (purpose === 'SIGNUP') {
      if (existingUser && !existingUser.isDeleted) {
        return res.status(400).json({ message: 'An account with this phone number already exists. Please log in.' });
      }
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in database with 5 min TTL
    await Otp.deleteMany({ phone: cleanPhone, purpose });
    await Otp.create({
      phone: cleanPhone,
      otp,
      purpose,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    // Dispatch real SMS to the user's mobile device
    await sendSmsOtp(cleanPhone, otp);

    res.status(200).json({
      message: `Verification code sent to ${cleanPhone}`,
      phone: cleanPhone,
      purpose,
      expiresInSeconds: 300
    });
  } catch (error) {
    console.error('[AUTH] Send OTP error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login with phone and OTP
// @route   POST /api/auth/login-otp
exports.loginWithOtp = async (req, res) => {
  try {
    const { phone, otp, firebaseToken } = req.body;
    if (!phone || (!otp && !firebaseToken)) {
      return res.status(400).json({ message: 'Phone number and OTP code are required' });
    }

    const cleanPhone = normalizePhone(phone);
    const cleanOtp = otp ? otp.toString().trim() : '';
    const isDevBypass = (process.env.NODE_ENV !== 'production' && cleanOtp === '123456');

    let validOtp = null;
    if (!firebaseToken && !isDevBypass) {
      validOtp = await Otp.findOne({
        phone: cleanPhone,
        otp: cleanOtp,
        purpose: 'LOGIN',
        expiresAt: { $gt: new Date() }
      });

      if (!validOtp) {
        // Fallback check matching last 10 digits
        const last10 = cleanPhone.replace(/^\+/, '').slice(-10);
        const matchingOtps = await Otp.find({
          otp: cleanOtp,
          purpose: 'LOGIN',
          expiresAt: { $gt: new Date() }
        });
        validOtp = matchingOtps.find(o => normalizePhone(o.phone).slice(-10) === last10);
      }

      if (!validOtp) {
        return res.status(400).json({ message: 'Invalid or expired OTP code' });
      }
    }

    const user = await findUserByPhone(cleanPhone);
    const isTerminatedDoctor = user && user.role === 'DOCTOR' && user.isDeleted && user.terminationReason;
    if (!user || (user.isDeleted && !isTerminatedDoctor)) {
      return res.status(404).json({ message: 'No registered account found with this phone number. Please sign up.' });
    }

    // Delete used OTP
    await Otp.deleteMany({ phone: cleanPhone, purpose: 'LOGIN' });

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
  } catch (error) {
    console.error('[AUTH] Login with OTP error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Register a user
// @route   POST /api/auth/signup/user
exports.signupUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone, otp, firebaseToken } = req.body;

    const cleanEmail = email && typeof email === 'string' && email.trim() ? email.toLowerCase().trim() : undefined;

    if (cleanEmail) {
      const userExists = await User.findOne({ email: cleanEmail });
      if (userExists) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }
    }

    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone || cleanPhone.length < 7) {
      return res.status(400).json({ message: 'A valid phone number is required' });
    }

    const phoneExists = await findUserByPhone(cleanPhone);
    if (phoneExists) {
      return res.status(400).json({ message: 'An account already exists with this phone number' });
    }

    // If OTP provided and not already verified via Firebase token, verify it
    if (otp && !firebaseToken) {
      const cleanOtp = otp.toString().trim();
      const isDevBypass = (process.env.NODE_ENV !== 'production' && cleanOtp === '123456');
      if (!isDevBypass) {
        let validOtp = await Otp.findOne({
          phone: cleanPhone,
          otp: cleanOtp,
          purpose: 'SIGNUP',
          expiresAt: { $gt: new Date() }
        });

        if (!validOtp) {
          const last10 = cleanPhone.replace(/^\+/, '').slice(-10);
          const matchingOtps = await Otp.find({
            otp: cleanOtp,
            purpose: 'SIGNUP',
            expiresAt: { $gt: new Date() }
          });
          validOtp = matchingOtps.find(o => normalizePhone(o.phone).slice(-10) === last10);
        }

        if (!validOtp) {
          return res.status(400).json({ message: 'Invalid or expired phone verification code' });
        }
      }
      await Otp.deleteMany({ phone: cleanPhone, purpose: 'SIGNUP' });
    }

    const phoneEncrypted = encryptField(phone);

    const userPayload = {
      name: { first: firstName, last: lastName },
      passwordHash: password, // Pre-save hook hashes this
      phoneEncrypted,
      role: 'USER'
    };
    if (cleanEmail) {
      userPayload.email = cleanEmail;
    }

    const user = await User.create(userPayload);

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
        email: user.email || '',
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
    const { firstName, lastName, email, password, phone, qualifications, otp, firebaseToken } = req.body;

    const cleanEmail = email && typeof email === 'string' && email.trim() ? email.toLowerCase().trim() : undefined;

    if (cleanEmail) {
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) {
        if (existingUser.isDeleted && existingUser.role === 'DOCTOR') {
          // Reactivate soft-deleted doctor account
          existingUser.isDeleted = false;
          existingUser.name = { first: firstName, last: lastName };
          existingUser.passwordHash = password; // pre-save hook hashes it
          existingUser.phoneEncrypted = encryptField(phone);
          await existingUser.save();

          // Update or re-create DoctorProfile
          let doctorProfile = await DoctorProfile.findOne({ userId: existingUser._id });
          if (doctorProfile) {
            doctorProfile.qualifications = qualifications;
            doctorProfile.available = false; // set false until approved
            doctorProfile.docs = req.files ? req.files.map(file => ({
              filename: file.filename,
              filepath: file.path,
              status: 'PENDING'
            })) : [];
            await doctorProfile.save();
          } else {
            await DoctorProfile.create({
              userId: existingUser._id,
              qualifications,
              docs: req.files ? req.files.map(file => ({
                filename: file.filename,
                filepath: file.path,
                status: 'PENDING'
              })) : []
            });
          }

          return res.status(200).json({
            message: 'Account reactivated successfully. Your application is pending admin review.',
            userId: existingUser._id
          });
        } else {
          return res.status(400).json({ message: 'User already exists with this email' });
        }
      }
    }

    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone || cleanPhone.length < 7) {
      return res.status(400).json({ message: 'A valid phone number is required' });
    }

    const phoneExists = await findUserByPhone(cleanPhone);
    if (phoneExists) {
      return res.status(400).json({ message: 'An account already exists with this phone number' });
    }

    if (otp && !firebaseToken) {
      const cleanOtp = otp.toString().trim();
      const isDevBypass = (process.env.NODE_ENV !== 'production' && cleanOtp === '123456');
      if (!isDevBypass) {
        let validOtp = await Otp.findOne({
          phone: cleanPhone,
          otp: cleanOtp,
          purpose: 'SIGNUP',
          expiresAt: { $gt: new Date() }
        });

        if (!validOtp) {
          const last10 = cleanPhone.replace(/^\+/, '').slice(-10);
          const matchingOtps = await Otp.find({
            otp: cleanOtp,
            purpose: 'SIGNUP',
            expiresAt: { $gt: new Date() }
          });
          validOtp = matchingOtps.find(o => normalizePhone(o.phone).slice(-10) === last10);
        }

        if (!validOtp) {
          return res.status(400).json({ message: 'Invalid or expired phone verification code' });
        }
      }
      await Otp.deleteMany({ phone: cleanPhone, purpose: 'SIGNUP' });
    }

    const phoneEncrypted = encryptField(phone);

    const userPayload = {
      name: { first: firstName, last: lastName },
      passwordHash: password,
      phoneEncrypted,
      role: 'DOCTOR'
    };
    if (cleanEmail) {
      userPayload.email = cleanEmail;
    }

    // Create user with role DOCTOR
    const user = await User.create(userPayload);

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

// @desc    Login user (supports Email or Phone + Password)
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const identifier = email ? email.trim() : '';

    console.log(`[AUTH] Login attempt for identifier: "${identifier}"`);

    let user = null;
    if (identifier.includes('@')) {
      user = await User.findOne({ email: identifier.toLowerCase() });
    } else {
      user = await findUserByPhone(identifier);
    }

    const isTerminatedDoctor = user && user.role === 'DOCTOR' && user.isDeleted && user.terminationReason;
    if (!user || (user.isDeleted && !isTerminatedDoctor)) {
      console.log(`[AUTH] User not found or isDeleted for identifier: "${identifier}"`);
      return res.status(401).json({ message: 'Invalid email/phone or password' });
    }

    const isMatch = await user.comparePassword(password);
    console.log(`[AUTH] Password match result for ${identifier}: ${isMatch}, User role: ${user.role}`);

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
        email: user.email || '',
        role: user.role,
        accessToken,
        refreshToken
      });
    } else {
      res.status(401).json({ message: 'Invalid email/phone or password' });
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
    const user = await User.findById(req.user.id)
      .select('-passwordHash')
      .populate({
        path: 'warnings.reportId',
        select: 'category description createdAt adminNotes'
      });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const phone = user.phoneEncrypted ? decryptField(user.phoneEncrypted) : '';

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone,
      role: user.role,
      location: user.location,
      warningCount: user.warningCount || 0,
      warnings: user.warnings || [],
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

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'DOCTOR') {
      // Soft Delete Doctor
      user.isDeleted = true;
      await user.save();

      // Deactivate doctor availability
      await DoctorProfile.findOneAndUpdate(
        { userId },
        { available: false, currentlyAssignedRequest: null }
      );
    } else {
      // Hard Delete Normal User
      // 1. Anonymize user's emergency requests (unlink userId)
      await RequestModel.updateMany(
        { userId },
        { $set: { userId: null } }
      );

      // 2. Delete user's registered pets
      await Pet.deleteMany({ ownerId: userId });

      // 3. Delete user account
      await User.findByIdAndDelete(userId);
    }

    // Clear refresh cookie
    res.clearCookie('refreshToken');

    res.json({ message: 'Account and personal data processed successfully.' });
  } catch (error) {
    console.error('[AUTH] Delete account error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Acknowledge a warning strike
// @route   POST /api/auth/warnings/:warningId/acknowledge
exports.acknowledgeWarning = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const warning = user.warnings.id(req.params.warningId);
    if (!warning) return res.status(404).json({ message: 'Warning strike not found' });

    warning.acknowledged = true;
    warning.acknowledgedAt = new Date();
    await user.save();

    const updatedUser = await User.findById(req.user.id)
      .select('-passwordHash')
      .populate({
        path: 'warnings.reportId',
        select: 'category description createdAt adminNotes'
      });

    res.json({
      message: 'Warning strike acknowledged',
      warningCount: updatedUser.warningCount || 0,
      warnings: updatedUser.warnings || []
    });
  } catch (error) {
    console.error('[AUTH] Acknowledge warning error:', error);
    res.status(500).json({ message: error.message });
  }
};
