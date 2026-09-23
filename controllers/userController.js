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

module.exports = {
  getProfile,
  updateProfile,
  changePassword
};
