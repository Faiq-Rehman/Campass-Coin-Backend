const express = require('express');
const router = express.Router();
const {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getTransactionSummary,
  getMonthlyTransactions,
  suggestCategory
} = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { transactionValidation } = require('../utils/validators');

router.use(protect);

router.post('/', transactionValidation, validate, createTransaction);
router.get('/', getTransactions);
router.get('/summary', getTransactionSummary);
router.get('/monthly', getMonthlyTransactions);
router.post('/suggest-category', suggestCategory);
router.get('/:id', getTransactionById);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;
