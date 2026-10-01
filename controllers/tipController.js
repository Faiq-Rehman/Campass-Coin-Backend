const SavingTip = require('../models/SavingTip');
const { generateSavingTipsForUser } = require('../services/savingTipService');

/**
 * @desc    Get all active saving tips for user (pinned first)
 * @route   GET /api/tips
 * @access  Private (Student)
 */
const getTips = async (req, res) => {
  try {
    let tips = await SavingTip.find({
      user: req.user._id,
      isDismissed: false
    })
      .populate('category', 'name icon color')
      .sort({ isPinned: -1, createdAt: -1 });

    // If user has no active tips yet, automatically generate some
    if (tips.length === 0) {
      tips = await generateSavingTipsForUser(req.user._id);
    }

    res.status(200).json({
      success: true,
      message: 'Saving tips retrieved',
      data: tips
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while fetching saving tips'
    });
  }
};

/**
 * @desc    Pin / Unpin a saving tip
 * @route   POST /api/tips/:id/pin
 * @access  Private (Student)
 */
const pinTip = async (req, res) => {
  try {
    const { id } = req.params;

    const tip = await SavingTip.findOne({ _id: id, user: req.user._id });
    if (!tip) {
      return res.status(404).json({
        success: false,
        message: 'Saving tip not found'
      });
    }

    tip.isPinned = !tip.isPinned;
    await tip.save();

    res.status(200).json({
      success: true,
      message: tip.isPinned ? 'Tip pinned successfully' : 'Tip unpinned',
      data: tip
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while toggling tip pin status'
    });
  }
};

/**
 * @desc    Dismiss a saving tip
 * @route   POST /api/tips/:id/dismiss
 * @access  Private (Student)
 */
const dismissTip = async (req, res) => {
  try {
    const { id } = req.params;

    const tip = await SavingTip.findOne({ _id: id, user: req.user._id });
    if (!tip) {
      return res.status(404).json({
        success: false,
        message: 'Saving tip not found'
      });
    }

    tip.isDismissed = true;
    await tip.save();

    res.status(200).json({
      success: true,
      message: 'Saving tip dismissed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while dismissing saving tip'
    });
  }
};

/**
 * @desc    Manually trigger generation of fresh saving tips
 * @route   POST /api/tips/generate
 * @access  Private (Student)
 */
const generateTips = async (req, res) => {
  try {
    const tips = await generateSavingTipsForUser(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Saving tips analyzed and updated',
      data: tips
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while generating saving tips'
    });
  }
};

module.exports = {
  getTips,
  pinTip,
  dismissTip,
  generateTips
};
