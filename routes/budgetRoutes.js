const express = require('express');
const router = express.Router();
const {
  createBudget,
  getBudgets,
  updateBudget,
  deleteBudget,
  getBudgetStatus
} = require('../controllers/budgetController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { budgetValidation } = require('../utils/validators');

router.use(protect);

router.post('/', budgetValidation, validate, createBudget);
router.get('/', getBudgets);
router.get('/status', getBudgetStatus);
router.put('/:id', updateBudget);
router.delete('/:id', deleteBudget);

module.exports = router;
