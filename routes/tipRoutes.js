const express = require('express');
const router = express.Router();
const {
  getTips,
  pinTip,
  dismissTip,
  generateTips
} = require('../controllers/tipController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getTips);
router.post('/generate', generateTips);
router.post('/:id/pin', pinTip);
router.post('/:id/dismiss', dismissTip);

module.exports = router;
