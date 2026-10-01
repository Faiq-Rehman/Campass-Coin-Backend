const express = require('express');
const router = express.Router();
const {
  register,
  login,
  forgotPassword,
  verifySecurityAnswers,
  resetPassword,
  getMe
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  securityAnswersValidation,
  resetPasswordValidation
} = require('../utils/validators');

router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.post('/forgot-password', forgotPasswordValidation, validate, forgotPassword);
router.post('/verify-security-answers', securityAnswersValidation, validate, verifySecurityAnswers);
router.post('/reset-password/:token', resetPasswordValidation, validate, resetPassword);
router.get('/me', protect, getMe);

module.exports = router;
