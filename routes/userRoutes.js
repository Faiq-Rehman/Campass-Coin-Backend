const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  changePassword
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const {
  updateProfileValidation,
  changePasswordValidation
} = require('../utils/validators');

router.use(protect);

router.get('/profile', getProfile);
router.put('/profile', updateProfileValidation, validate, updateProfile);
router.put('/change-password', changePasswordValidation, validate, changePassword);

module.exports = router;
