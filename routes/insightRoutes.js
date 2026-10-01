const express = require('express');
const router = express.Router();
const {
  getCurrentInsight,
  getInsightHistory,
  generateInsight
} = require('../controllers/insightController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/current', getCurrentInsight);
router.get('/history', getInsightHistory);
router.post('/generate', generateInsight);

module.exports = router;
