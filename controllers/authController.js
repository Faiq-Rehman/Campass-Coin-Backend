const crypto = require('crypto');
const User = require('../models/User');
const PasswordResetToken = require('../models/PasswordResetToken');
const generateToken = require('../utils/generateToken');

const SAFE_USER_FIELDS = [
  '_id', 'fullName', 'email', 'academicYear', 'monthlyAllowance', 'savingsGoal',
  'profilePicture', 'status', 'securityQuestion1', 'securityQuestion2'
];

const serializeUser = (user) => {
  const output = {};
  SAFE_USER_FIELDS.forEach((field) => { output[field] = user[field]; });
  output.hasSecurityQuestions = Boolean(user.securityQuestion1 && user.securityQuestion2);
  return output;
};

const normalizeAnswer = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

/** @desc Register a new student */
const register = async (req, res) => {
  try {
    const {
      fullName, email, password, academicYear, monthlyAllowance, savingsGoal,
      securityQuestion1, securityAnswer1, securityQuestion2, securityAnswer2
    } = req.body;

    if (!securityQuestion1 || !securityAnswer1 || !securityQuestion2 || !securityAnswer2) {
      return res.status(400).json({ success: false, message: 'Two security questions and their answers are required for password recovery.' });
    }

    if (securityQuestion1 === securityQuestion2) {
      return res.status(400).json({ success: false, message: 'Please choose two different security questions.' });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'A student account with this email address already exists' });
    }

    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      password,
      securityQuestion1,
      securityAnswer1Hash: normalizeAnswer(securityAnswer1),
      securityQuestion2,
      securityAnswer2Hash: normalizeAnswer(securityAnswer2),
      academicYear: academicYear || '1st Year',
      monthlyAllowance: monthlyAllowance || 0,
      savingsGoal: savingsGoal || 0
    });

    const token = generateToken(user._id, 'student');
    res.status(201).json({
      success: true,
      message: 'Student registration successful',
      data: { user: serializeUser(user), token }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error during student registration' });
  }
};

/** @desc Authenticate student */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    if (user.status === 'disabled') {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact administrator.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const token = generateToken(user._id, 'student');
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { user: serializeUser(user), token }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error during login' });
  }
};

/**
 * Start security-question password recovery.
 * Only the questions are returned; answers are always verified server-side.
 */
const forgotPassword = async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const user = await User.findOne({ email });

    if (!user || !user.securityQuestion1 || !user.securityQuestion2) {
      return res.status(400).json({
        success: false,
        message: 'No password-recovery questions are configured for this account. If you can sign in, add them from Settings.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Answer both security questions to continue.',
      data: {
        email: user.email,
        securityQuestion1: user.securityQuestion1,
        securityQuestion2: user.securityQuestion2
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Server error during password recovery' });
  }
};

/** Verify security answers and issue a short-lived reset token. */
const verifySecurityAnswers = async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const user = await User.findOne({ email }).select('+securityAnswer1Hash +securityAnswer2Hash');

    if (!user || !user.securityAnswer1Hash || !user.securityAnswer2Hash) {
      return res.status(400).json({ success: false, message: 'Invalid recovery details.' });
    }

    const existing = await PasswordResetToken.findOne({ user: user._id }).select('+tokenHash');
    if (existing && existing.expiresAt > new Date() && existing.attempts >= 5) {
      return res.status(429).json({ success: false, message: 'Too many incorrect attempts. Please try again later.' });
    }

    const valid = await user.matchSecurityAnswers(req.body.answer1, req.body.answer2);
    if (!valid) {
      if (existing) {
        existing.attempts += 1;
        await existing.save();
      } else {
        await PasswordResetToken.create({
          user: user._id,
          tokenHash: crypto.createHash('sha256').update(crypto.randomBytes(32).toString('hex')).digest('hex'),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          attempts: 1
        });
      }
      return res.status(400).json({ success: false, message: 'One or more security answers are incorrect.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    await PasswordResetToken.findOneAndUpdate(
      { user: user._id },
      { user: user._id, tokenHash, expiresAt: new Date(Date.now() + 10 * 60 * 1000), attempts: 0 },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Security answers verified successfully.',
      data: { resetToken }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Server error while verifying security answers' });
  }
};

/** Reset password using a verified short-lived token. */
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resetTokenDoc = await PasswordResetToken.findOne({
      tokenHash,
      expiresAt: { $gt: new Date() }
    }).select('+tokenHash');

    if (!resetTokenDoc) {
      return res.status(400).json({ success: false, message: 'Password reset session is invalid or has expired. Please start again.' });
    }

    const user = await User.findById(resetTokenDoc.user).select('+password');
    if (!user) {
      await PasswordResetToken.deleteOne({ _id: resetTokenDoc._id });
      return res.status(404).json({ success: false, message: 'Associated student account no longer exists.' });
    }

    user.password = password;
    await user.save();
    await PasswordResetToken.deleteOne({ _id: resetTokenDoc._id });

    return res.status(200).json({ success: true, message: 'Password has been reset successfully. You can now login with your new password.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Server error while resetting password' });
  }
};

const getMe = async (req, res) => {
  res.status(200).json({ success: true, message: 'Current student profile fetched successfully', data: serializeUser(req.user) });
};

module.exports = { register, login, forgotPassword, verifySecurityAnswers, resetPassword, getMe };
