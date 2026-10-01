const express = require('express');
const router = express.Router();
const {
  getMonthlyReport,
  getSixMonthsReport,
  getDailyReport,
  getWeeklyReport,
  getCategoryReport,
  getForecast,
  exportReport
} = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/monthly', getMonthlyReport);
router.get('/six-months', getSixMonthsReport);
router.get('/daily', getDailyReport);
router.get('/weekly', getWeeklyReport);
router.get('/category', getCategoryReport);
router.get('/forecast', getForecast);
router.get('/export', exportReport);

module.exports = router;
