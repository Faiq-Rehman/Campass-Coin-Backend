const express = require('express');
const router = express.Router();
const { getDashboardData } = require('../services/dashboardService');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

/**
 * @desc    Get complete student financial dashboard payload
 * @route   GET /api/dashboard
 * @access  Private (Student)
 */
router.get('/', async (req, res) => {
  try {
    const dashboard = await getDashboardData(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Dashboard data retrieved successfully',
      data: dashboard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while fetching dashboard data'
    });
  }
});

module.exports = router;
