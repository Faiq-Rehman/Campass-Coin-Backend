const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const Budget = require('../models/Budget');
const Notification = require('../models/Notification');
const {
  suggestCategoryFromDescription,
  detectPossibleDuplicate,
  detectUnusuallyLargeTransaction
} = require('../services/transactionAnalysisService');

/**
 * Helper to update budget spent amount and check threshold alerts
 */
const syncBudgetSpending = async (userId, categoryId, transactionDate) => {
  try {
    const txDate = transactionDate ? new Date(transactionDate) : new Date();
    const monthStr = txDate.toISOString().substring(0, 7);

    const budget = await Budget.findOne({
      user: userId,
      category: categoryId,
      month: monthStr
    });

    if (!budget) return;

    // Calculate total spent for this category and month
    const startOfMonth = new Date(txDate.getFullYear(), txDate.getMonth(), 1);
    const endOfMonth = new Date(txDate.getFullYear(), txDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const agg = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          category: new mongoose.Types.ObjectId(categoryId),
          type: 'expense',
          date: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: '$amount' }
        }
      }
    ]);

    const spentAmount = agg.length > 0 ? agg[0].totalSpent : 0;
    const percentageUsed = Math.round((spentAmount / budget.limitAmount) * 100);

    budget.spentAmount = spentAmount;
    budget.percentageUsed = percentageUsed;

    // Check alert thresholds (80%, 90%, 100%)
    const thresholds = [80, 90, 100];
    const categoryDoc = await Category.findById(categoryId);
    const catName = categoryDoc ? categoryDoc.name : 'Category';

    for (const t of thresholds) {
      if (percentageUsed >= t && !budget.alertedThresholds.includes(t)) {
        budget.alertedThresholds.push(t);

        const title = t === 100
          ? `Budget Exceeded: ${catName}`
          : `Budget Warning (${t}%): ${catName}`;

        const message = t === 100
          ? `You have reached 100% of your $${budget.limitAmount} budget for ${catName} this month.`
          : `You have consumed ${percentageUsed}% of your $${budget.limitAmount} budget for ${catName}.`;

        await Notification.create({
          user: userId,
          title,
          message,
          type: t === 100 ? 'budget_exceeded' : 'budget_warning'
        });
      }
    }

    await budget.save();
  } catch (error) {
    console.error('[Sync Budget Error]', error.message);
  }
};

/**
 * @desc    Create a new transaction
 * @route   POST /api/transactions
 * @access  Private (Student)
 */
const createTransaction = async (req, res) => {
  try {
    const {
      category,
      amount,
      type,
      description,
      date,
      isRecurring,
      recurringFrequency,
      aiSuggestedCategory
    } = req.body;

    // Validate category exists and is accessible
    const categoryDoc = await Category.findOne({
      _id: category,
      $or: [{ user: req.user._id }, { isDefault: true }]
    });

    if (!categoryDoc) {
      return res.status(404).json({
        success: false,
        message: 'Selected category does not exist or is inaccessible'
      });
    }

    if (categoryDoc.type !== type) {
      return res.status(400).json({
        success: false,
        message: `Category "${categoryDoc.name}" is of type "${categoryDoc.type}", but transaction type is "${type}"`
      });
    }

    // 1. Check for possible duplicate (advisory)
    const duplicateCheck = await detectPossibleDuplicate(req.user._id, {
      amount,
      category,
      date,
      description
    });

    // 2. Check for unusually large transaction (advisory)
    const largeCheck = await detectUnusuallyLargeTransaction(req.user._id, amount, type);

    const transaction = await Transaction.create({
      user: req.user._id,
      category,
      amount: Number(amount),
      type,
      description: description.trim(),
      date: date ? new Date(date) : new Date(),
      isRecurring: Boolean(isRecurring),
      recurringFrequency: isRecurring ? recurringFrequency : null,
      aiSuggestedCategory: aiSuggestedCategory || null
    });

    // If it's an expense, update corresponding budget in background
    if (type === 'expense') {
      await syncBudgetSpending(req.user._id, category, transaction.date);
    }

    const populatedTransaction = await Transaction.findById(transaction._id).populate(
      'category',
      'name type icon color'
    );

    const warnings = [];
    if (duplicateCheck.isDuplicate) warnings.push(duplicateCheck.warningMessage);
    if (largeCheck.isLarge) warnings.push(largeCheck.warningMessage);

    res.status(201).json({
      success: true,
      message: 'Transaction recorded successfully',
      data: populatedTransaction,
      warnings: warnings.length > 0 ? warnings : undefined
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while creating transaction'
    });
  }
};

/**
 * @desc    Get all transactions with filtering, search & pagination
 * @route   GET /api/transactions
 * @access  Private (Student)
 */
const getTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      category,
      type,
      search,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    const query = { user: req.user._id };

    if (type && ['income', 'expense'].includes(type)) {
      query.type = type;
    }

    if (category) {
      query.category = category;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        query.date.$lte = eDate;
      }
    }

    if (search) {
      query.description = { $regex: search.trim(), $options: 'i' };
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .populate('category', 'name type icon color')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      message: 'Transactions retrieved successfully',
      data: {
        transactions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1,
          totalCount: total
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while fetching transactions'
    });
  }
};

/**
 * @desc    Get transaction by ID
 * @route   GET /api/transactions/:id
 * @access  Private (Student)
 */
const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findOne({
      _id: id,
      user: req.user._id
    }).populate('category', 'name type icon color');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Transaction details retrieved',
      data: transaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while fetching transaction'
    });
  }
};

/**
 * @desc    Update a transaction
 * @route   PUT /api/transactions/:id
 * @access  Private (Student)
 */
const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      category,
      amount,
      type,
      description,
      date,
      isRecurring,
      recurringFrequency
    } = req.body;

    const transaction = await Transaction.findOne({
      _id: id,
      user: req.user._id
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found or unauthorized'
      });
    }

    const previousCategory = transaction.category;
    const previousDate = transaction.date;

    if (category) {
      const catDoc = await Category.findOne({
        _id: category,
        $or: [{ user: req.user._id }, { isDefault: true }]
      });

      if (!catDoc) {
        return res.status(404).json({
          success: false,
          message: 'Selected category does not exist'
        });
      }
      transaction.category = category;
    }

    if (amount !== undefined) transaction.amount = Number(amount);
    if (type) transaction.type = type;
    if (description) transaction.description = description.trim();
    if (date) transaction.date = new Date(date);
    if (isRecurring !== undefined) transaction.isRecurring = Boolean(isRecurring);
    if (recurringFrequency !== undefined) transaction.recurringFrequency = recurringFrequency;

    transaction.lastEditedAt = new Date();

    const updated = await transaction.save();

    // Sync budget if relevant
    if (transaction.type === 'expense') {
      await syncBudgetSpending(req.user._id, transaction.category, transaction.date);
      if (previousCategory.toString() !== transaction.category.toString()) {
        await syncBudgetSpending(req.user._id, previousCategory, previousDate);
      }
    }

    const populated = await Transaction.findById(updated._id).populate(
      'category',
      'name type icon color'
    );

    res.status(200).json({
      success: true,
      message: 'Transaction updated successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while updating transaction'
    });
  }
};

/**
 * @desc    Delete a transaction
 * @route   DELETE /api/transactions/:id
 * @access  Private (Student)
 */
const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findOne({
      _id: id,
      user: req.user._id
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found or unauthorized'
      });
    }

    const catId = transaction.category;
    const txDate = transaction.date;
    const txType = transaction.type;

    await Transaction.deleteOne({ _id: transaction._id });

    if (txType === 'expense') {
      await syncBudgetSpending(req.user._id, catId, txDate);
    }

    res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while deleting transaction'
    });
  }
};

/**
 * @desc    Get overall transaction summary (income, expense, balance)
 * @route   GET /api/transactions/summary
 * @access  Private (Student)
 */
const getTransactionSummary = async (req, res) => {
  try {
    const stats = await Transaction.aggregate([
      {
        $match: { user: req.user._id }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    let totalIncome = 0;
    let totalExpense = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    stats.forEach((s) => {
      if (s._id === 'income') {
        totalIncome = s.total;
        incomeCount = s.count;
      }
      if (s._id === 'expense') {
        totalExpense = s.total;
        expenseCount = s.count;
      }
    });

    res.status(200).json({
      success: true,
      message: 'Transaction summary calculated',
      data: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        incomeCount,
        expenseCount,
        totalTransactions: incomeCount + expenseCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while calculating summary'
    });
  }
};

/**
 * @desc    Get transactions grouped monthly
 * @route   GET /api/transactions/monthly
 * @access  Private (Student)
 */
const getMonthlyTransactions = async (req, res) => {
  try {
    const monthlyData = await Transaction.aggregate([
      {
        $match: { user: req.user._id }
      },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: '%Y-%m', date: '$date' } },
            type: '$type'
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.month': -1 }
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Monthly transactions aggregated',
      data: monthlyData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while aggregating monthly transactions'
    });
  }
};

/**
 * @desc    Advisory AI / Keyword Category Suggestion
 * @route   POST /api/transactions/suggest-category
 * @access  Private (Student)
 */
const suggestCategory = async (req, res) => {
  try {
    const { description, type = 'expense' } = req.body;

    const suggestion = await suggestCategoryFromDescription(description, type);

    res.status(200).json({
      success: true,
      message: suggestion.suggestedCategoryName
        ? `Suggested category: "${suggestion.suggestedCategoryName}". User confirmation recommended.`
        : 'No specific category could be automatically inferred.',
      data: suggestion
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while analyzing category'
    });
  }
};

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getTransactionSummary,
  getMonthlyTransactions,
  suggestCategory
};
