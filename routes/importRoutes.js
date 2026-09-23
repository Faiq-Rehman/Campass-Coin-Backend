const express = require('express');
const router = express.Router();
const { upload, importTransactions } = require('../controllers/importController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/transactions', upload.single('file'), importTransactions);

module.exports = router;
