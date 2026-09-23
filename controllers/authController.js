const crypto = require('crypto');
const User = require('../models/User');
const PasswordResetToken = require('../models/PasswordResetToken');
const generateToken = require('../utils/generateToken');

/**
 * @desc    Register a new student
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res) => {
  try {
    const { fullName, email, password, academicYear, monthlyAllowance, savingsGoal } = req.body;

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'A student account with this email address already exists'
      });
    }

    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      password,
      academicYear: academicYear || '1st Year',
      monthlyAllowance: monthlyAllowance || 0,
      savingsGoal: savingsGoal || 0
    });

    const token = generateToken(user._id, 'student');

    res.status(201).json({
      success: true,
      message: 'Student registration successful',
      data: {
        user: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          academicYear: user.academicYear,
          monthlyAllowance: user.monthlyAllowance,
          savingsGoal: user.savingsGoal,
          profilePicture: user.profilePicture,
          status: user.status
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during student registration'
    });
  }
};

/**
 * @desc    Authenticate student & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Password is select: false by default in User model, so explicitly select it
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (user.status === 'disabled') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact administrator.'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = generateToken(user._id, 'student');

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          academicYear: user.academicYear,
          monthlyAllowance: user.monthlyAllowance,
          savingsGoal: user.savingsGoal,
          profilePicture: user.profilePicture,
          status: user.status
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during login'
    });
  }
};

/**
 * @desc    Generate password recovery token
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No student account found with this email address'
      });
    }

    // Delete existing token if any
    await PasswordResetToken.deleteMany({ user: user._id });

    // Generate secure random reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Token valid for 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await PasswordResetToken.create({
      user: user._id,
      token: tokenHash,
      expiresAt
    });

    res.status(200).json({
      success: true,
      message: 'Password reset token generated successfully. In production, this is emailed to the user.',
      data: {
        resetToken,
        expiresIn: '1 hour'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during password recovery'
    });
  }
};

/**
 * @desc    Reset password using recovery token
 * @route   POST /api/auth/reset-password/:token
 * @access  Public
 */
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resetTokenDoc = await PasswordResetToken.findOne({
      token: tokenHash,
      expiresAt: { $gt: new Date() }
    });

    if (!resetTokenDoc) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is invalid or has expired'
      });
    }

    const user = await User.findById(resetTokenDoc.user);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Associated student account no longer exists'
      });
    }

    // Update password
    user.password = password;
    await user.save();

    // Delete token once used
    await PasswordResetToken.deleteOne({ _id: resetTokenDoc._id });

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while resetting password'
    });
  }
};

/**
 * @desc    Get current authenticated user info
 * @route   GET /api/auth/me
 * @access  Private (Student)
 */
const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Current student profile fetched successfully',
    data: req.user
  });
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  getMe
};
