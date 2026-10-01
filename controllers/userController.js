const User = require('../models/User');

/**
 * @desc    Get current user profile
 * @route   GET /api/users/profile
 * @access  Private (Student)
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while fetching profile'
    });
  }
};

/**
 * @desc    Update user profile details
 * @route   PUT /api/users/profile
 * @access  Private (Student)
 */
const updateProfile = async (req, res) => {
  try {
    const { fullName, academicYear, monthlyAllowance, savingsGoal, profilePicture } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    if (fullName) user.fullName = fullName;
    if (academicYear) user.academicYear = academicYear;
    if (monthlyAllowance !== undefined) user.monthlyAllowance = monthlyAllowance;
    if (savingsGoal !== undefined) user.savingsGoal = savingsGoal;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while updating profile'
    });
  }
};

/**
 * @desc    Change password
 * @route   PUT /api/users/change-password
 * @access  Private (Student)
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password provided is incorrect'
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while changing password'
    });
  }
};



/**
 * @desc Update password recovery security questions
 * @route PUT /api/users/security-questions
 * @access Private (Student)
 */
const updateSecurityQuestions = async (req, res) => {
  try {
    const { securityQuestion1, securityAnswer1, securityQuestion2, securityAnswer2 } = req.body;
    if (!securityQuestion1 || !securityAnswer1 || !securityQuestion2 || !securityAnswer2) {
      return res.status(400).json({ success: false, message: 'Two security questions and their answers are required.' });
    }
    if (securityQuestion1 === securityQuestion2) {
      return res.status(400).json({ success: false, message: 'Please choose two different security questions.' });
    }

    const user = await User.findById(req.user._id).select('+securityAnswer1Hash +securityAnswer2Hash');
    if (!user) return res.status(404).json({ success: false, message: 'Student not found' });

    user.securityQuestion1 = securityQuestion1;
    user.securityAnswer1Hash = String(securityAnswer1).trim().toLowerCase();
    user.securityQuestion2 = securityQuestion2;
    user.securityAnswer2Hash = String(securityAnswer2).trim().toLowerCase();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password recovery questions updated successfully.',
      data: {
        securityQuestion1: user.securityQuestion1,
        securityQuestion2: user.securityQuestion2,
        hasSecurityQuestions: true
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error while updating security questions' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  updateSecurityQuestions
};
