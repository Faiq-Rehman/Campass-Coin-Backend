const { body, param, query } = require('express-validator');

// Auth validation rules
const registerValidation = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ max: 100 })
    .withMessage('Full name cannot exceed 100 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('academicYear')
    .optional()
    .isIn(['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate', 'Other'])
    .withMessage('Invalid academic year selected'),
  body('monthlyAllowance')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Monthly allowance cannot be negative'),
  body('savingsGoal')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Savings goal cannot be negative')
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const forgotPasswordValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
];

const resetPasswordValidation = [
  body('password')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
];

const updateProfileValidation = [
  body('fullName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Full name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Full name cannot exceed 100 characters'),
  body('academicYear')
    .optional()
    .isIn(['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate', 'Other'])
    .withMessage('Invalid academic year selected'),
  body('monthlyAllowance')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Monthly allowance cannot be negative'),
  body('savingsGoal')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Savings goal cannot be negative'),
  body('profilePicture')
    .optional()
    .isString()
    .withMessage('Profile picture must be a valid string')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
];

// Category validation rules
const categoryValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ max: 50 })
    .withMessage('Category name cannot exceed 50 characters'),
  body('type')
    .trim()
    .notEmpty()
    .withMessage('Category type is required')
    .isIn(['income', 'expense'])
    .withMessage('Category type must be either income or expense')
];

// Transaction validation rules
const transactionValidation = [
  body('category')
    .notEmpty()
    .withMessage('Category ID is required')
    .isMongoId()
    .withMessage('Invalid Category ID format'),
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ gt: 0 })
    .withMessage('Amount must be a positive number greater than 0'),
  body('type')
    .notEmpty()
    .withMessage('Transaction type is required')
    .isIn(['income', 'expense'])
    .withMessage('Transaction type must be either income or expense'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('date')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Invalid date format (ISO 8601 expected)'),
  body('isRecurring')
    .optional()
    .isBoolean()
    .withMessage('isRecurring must be a boolean'),
  body('recurringFrequency')
    .optional({ nullable: true })
    .isIn(['weekly', 'monthly', 'yearly', null, ''])
    .withMessage('Invalid recurring frequency')
];

// Budget validation rules
const budgetValidation = [
  body('category')
    .notEmpty()
    .withMessage('Category ID is required')
    .isMongoId()
    .withMessage('Invalid Category ID format'),
  body('month')
    .notEmpty()
    .withMessage('Month is required')
    .matches(/^\d{4}-(0[1-9]|1[0-2])$/)
    .withMessage('Month must be in YYYY-MM format (e.g. 2026-09)'),
  body('limitAmount')
    .notEmpty()
    .withMessage('Limit amount is required')
    .isFloat({ gt: 0 })
    .withMessage('Limit amount must be greater than 0')
];

// Admin validation rules
const adminLoginValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const announcementValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 150 })
    .withMessage('Title cannot exceed 150 characters'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required'),
  body('type')
    .optional()
    .isIn(['announcement', 'tip_template', 'warning'])
    .withMessage('Invalid announcement type'),
  body('targetAudience')
    .optional()
    .isIn(['all', '1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate'])
    .withMessage('Invalid target audience')
];

module.exports = {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  updateProfileValidation,
  changePasswordValidation,
  categoryValidation,
  transactionValidation,
  budgetValidation,
  adminLoginValidation,
  announcementValidation
};
