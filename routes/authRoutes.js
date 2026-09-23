const express = require('express');
const router = express.Router();
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  getMe
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation
} = require('../utils/validators');

router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.post('/forgot-password', forgotPasswordValidation, validate, forgotPassword);
router.post('/reset-password/:token', resetPasswordValidation, validate, resetPassword);
router.get('/me', protect, getMe);

module.exports = router;
