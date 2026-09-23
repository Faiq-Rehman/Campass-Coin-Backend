const Insight = require('../models/Insight');
const { generateMonthlyInsight } = require('../services/insightService');

/**
 * @desc    Get current month's insight (auto-generates if not found)
 * @route   GET /api/insights/current
 * @access  Private (Student)
 */
const getCurrentInsight = async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().substring(0, 7);

    let insight = await Insight.findOne({
      user: req.user._id,
      month: currentMonth
    });

    if (!insight) {
      insight = await generateMonthlyInsight(req.user._id, currentMonth);
    }

    res.status(200).json({
      success: true,
      message: 'Current monthly insight retrieved',
      data: insight
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while fetching current insight'
    });
  }
};

/**
 * @desc    Get historical monthly insights
 * @route   GET /api/insights/history
 * @access  Private (Student)
 */
const getInsightHistory = async (req, res) => {
  try {
    const insights = await Insight.find({ user: req.user._id })
      .sort({ month: -1 })
      .limit(12);

    res.status(200).json({
      success: true,
      message: 'Insight history retrieved',
      data: insights
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while fetching insight history'
    });
  }
};

/**
 * @desc    Generate or refresh insight for a specific month
 * @route   POST /api/insights/generate
 * @access  Private (Student)
 */
const generateInsight = async (req, res) => {
  try {
    const { month } = req.body;
    const targetMonth = month || new Date().toISOString().substring(0, 7);

    const insight = await generateMonthlyInsight(req.user._id, targetMonth);

    res.status(200).json({
      success: true,
      message: `Monthly insight generated for ${targetMonth}`,
      data: insight
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while generating insight'
    });
  }
};

module.exports = {
  getCurrentInsight,
  getInsightHistory,
  generateInsight
};
