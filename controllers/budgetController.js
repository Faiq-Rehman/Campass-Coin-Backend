const mongoose = require('mongoose');
const Budget = require('../models/Budget');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');

/**
 * Calculates current spent amount for a specific user, category, and month
 */
const calculateCurrentSpent = async (userId, categoryId, monthStr) => {
  const [year, month] = monthStr.split('-').map(Number);
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

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
        total: { $sum: '$amount' }
      }
    }
  ]);

  return agg.length > 0 ? agg[0].total : 0;
};

/**
 * @desc    Create a new category budget for a month
 * @route   POST /api/budgets
 * @access  Private (Student)
 */
const createBudget = async (req, res) => {
  try {
    const { category, month, limitAmount } = req.body;

    // Verify category exists
    const categoryDoc = await Category.findOne({
      _id: category,
      $or: [{ user: req.user._id }, { isDefault: true }],
      type: 'expense'
    });

    if (!categoryDoc) {
      return res.status(404).json({
        success: false,
        message: 'Expense category not found or inaccessible'
      });
    }

    // Check if budget already exists for this category and month
    const existing = await Budget.findOne({
      user: req.user._id,
      category,
      month
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A budget for ${categoryDoc.name} in month ${month} already exists. Please update the existing budget instead.`
      });
    }

    const spent = await calculateCurrentSpent(req.user._id, category, month);
    const percentageUsed = Math.round((spent / Number(limitAmount)) * 100);

    const budget = await Budget.create({
      user: req.user._id,
      category,
      month,
      limitAmount: Number(limitAmount),
      spentAmount: spent,
      percentageUsed,
      alertedThresholds: []
    });

    const populated = await Budget.findById(budget._id).populate(
      'category',
      'name type icon color'
    );

    res.status(201).json({
      success: true,
      message: 'Budget created successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while creating budget'
    });
  }
};

/**
 * @desc    Get all budgets for user with optional month filter
 * @route   GET /api/budgets
 * @access  Private (Student)
 */
const getBudgets = async (req, res) => {
  try {
    const { month } = req.query;
    const query = { user: req.user._id };

    if (month) {
      query.month = month;
    }

    const budgets = await Budget.find(query)
      .populate('category', 'name type icon color')
      .sort({ month: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Budgets retrieved successfully',
      data: budgets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while fetching budgets'
    });
  }
};

/**
 * @desc    Update a budget limit
 * @route   PUT /api/budgets/:id
 * @access  Private (Student)
 */
const updateBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const { limitAmount } = req.body;

    const budget = await Budget.findOne({ _id: id, user: req.user._id });
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    if (limitAmount !== undefined) {
      budget.limitAmount = Number(limitAmount);
      budget.percentageUsed = Math.round((budget.spentAmount / budget.limitAmount) * 100);
    }

    const updated = await budget.save();
    const populated = await Budget.findById(updated._id).populate(
      'category',
      'name type icon color'
    );

    res.status(200).json({
      success: true,
      message: 'Budget updated successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while updating budget'
    });
  }
};

/**
 * @desc    Delete a budget
 * @route   DELETE /api/budgets/:id
 * @access  Private (Student)
 */
const deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;

    const budget = await Budget.findOne({ _id: id, user: req.user._id });
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    await Budget.deleteOne({ _id: budget._id });

    res.status(200).json({
      success: true,
      message: 'Budget deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while deleting budget'
    });
  }
};

/**
 * @desc    Get live budget status with recalculated consumption and threshold checks
 * @route   GET /api/budgets/status
 * @access  Private (Student)
 */
const getBudgetStatus = async (req, res) => {
  try {
    const currentMonth = req.query.month || new Date().toISOString().substring(0, 7);

    const budgets = await Budget.find({
      user: req.user._id,
      month: currentMonth
    }).populate('category', 'name type icon color');

    const statusList = [];
    const thresholds = [80, 90, 100];

    for (const b of budgets) {
      // Recalculate live spent
      const liveSpent = await calculateCurrentSpent(req.user._id, b.category._id, currentMonth);
      const percentageUsed = Math.round((liveSpent / b.limitAmount) * 100);

      b.spentAmount = liveSpent;
      b.percentageUsed = percentageUsed;

      // Check alert thresholds (80, 90, 100)
      for (const t of thresholds) {
        if (percentageUsed >= t && !b.alertedThresholds.includes(t)) {
          b.alertedThresholds.push(t);

          const title = t === 100
            ? `Budget Exceeded: ${b.category.name}`
            : `Budget Warning (${t}%): ${b.category.name}`;

          const message = t === 100
            ? `Alert: You have reached 100% of your $${b.limitAmount} budget for ${b.category.name}.`
            : `Caution: You have consumed ${percentageUsed}% of your $${b.limitAmount} budget for ${b.category.name}.`;

          await Notification.create({
            user: req.user._id,
            title,
            message,
            type: t === 100 ? 'budget_exceeded' : 'budget_warning'
          });
        }
      }

      await b.save();

      statusList.push({
        budgetId: b._id,
        category: b.category,
        month: b.month,
        limitAmount: b.limitAmount,
        spentAmount: b.spentAmount,
        remainingAmount: Math.max(0, b.limitAmount - b.spentAmount),
        percentageUsed: b.percentageUsed,
        isOverBudget: b.spentAmount > b.limitAmount
      });
    }

    res.status(200).json({
      success: true,
      message: 'Budget status evaluated',
      data: {
        month: currentMonth,
        budgets: statusList
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while checking budget status'
    });
  }
};

module.exports = {
  createBudget,
  getBudgets,
  updateBudget,
  deleteBudget,
  getBudgetStatus
};
