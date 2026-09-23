const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const SavingTip = require('../models/SavingTip');
const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Builds the comprehensive student financial dashboard payload
 */
const getDashboardData = async (userId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const now = new Date();
  const currentMonthStr = now.toISOString().substring(0, 7);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // 1. Current month income and expenses
  const monthlyTotals = await Transaction.aggregate([
    {
      $match: {
        user: userObjectId,
        date: { $gte: startOfMonth, $lte: endOfMonth }
      }
    },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' }
      }
    }
  ]);

  let incomeThisMonth = 0;
  let expenseThisMonth = 0;

  monthlyTotals.forEach((t) => {
    if (t._id === 'income') incomeThisMonth = t.total;
    if (t._id === 'expense') expenseThisMonth = t.total;
  });

  const netSavingsThisMonth = incomeThisMonth - expenseThisMonth;

  // 2. All-time balance
  const allTimeTotals = await Transaction.aggregate([
    {
      $match: { user: userObjectId }
    },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' }
      }
    }
  ]);

  let allTimeIncome = 0;
  let allTimeExpense = 0;
  allTimeTotals.forEach((t) => {
    if (t._id === 'income') allTimeIncome = t.total;
    if (t._id === 'expense') allTimeExpense = t.total;
  });

  const user = await User.findById(userId);
  const monthlyAllowance = user ? user.monthlyAllowance : 0;
  const savingsGoal = user ? user.savingsGoal : 0;

  // Current balance includes monthly allowance baseline + net transaction earnings
  const currentBalance = allTimeIncome - allTimeExpense + (allTimeIncome === 0 ? monthlyAllowance : 0);

  // 3. Top spending category this month
  const topCategories = await Transaction.aggregate([
    {
      $match: {
        user: userObjectId,
        type: 'expense',
        date: { $gte: startOfMonth, $lte: endOfMonth }
      }
    },
    {
      $group: {
        _id: '$category',
        totalSpent: { $sum: '$amount' }
      }
    },
    {
      $sort: { totalSpent: -1 }
    },
    {
      $limit: 1
    },
    {
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'categoryDoc'
      }
    },
    {
      $unwind: '$categoryDoc'
    }
  ]);

  const topSpendingCategory = topCategories.length > 0
    ? {
        name: topCategories[0].categoryDoc.name,
        amount: topCategories[0].totalSpent,
        icon: topCategories[0].categoryDoc.icon,
        color: topCategories[0].categoryDoc.color,
        percentage: expenseThisMonth > 0 ? Math.round((topCategories[0].totalSpent / expenseThisMonth) * 100) : 0
      }
    : null;

  // 4. Budget vs Actual for current month
  const budgets = await Budget.find({
    user: userObjectId,
    month: currentMonthStr
  }).populate('category', 'name type icon color');

  const budgetVsActual = budgets.map((b) => ({
    budgetId: b._id,
    category: b.category ? b.category.name : 'Unknown',
    categoryIcon: b.category ? b.category.icon : 'tag',
    categoryColor: b.category ? b.category.color : '#6366f1',
    limitAmount: b.limitAmount,
    spentAmount: b.spentAmount,
    remainingAmount: Math.max(0, b.limitAmount - b.spentAmount),
    percentageUsed: b.percentageUsed,
    isOverBudget: b.spentAmount > b.limitAmount
  }));

  const budgetWarnings = budgetVsActual.filter((b) => b.percentageUsed >= 80);

  // 5. Recent transactions (last 7)
  const recentTransactions = await Transaction.find({ user: userObjectId })
    .sort({ date: -1, createdAt: -1 })
    .limit(7)
    .populate('category', 'name type icon color');

  // 6. 7-Day Spending Trend
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const dailyTrendAgg = await Transaction.aggregate([
    {
      $match: {
        user: userObjectId,
        type: 'expense',
        date: { $gte: sevenDaysAgo }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        totalSpent: { $sum: '$amount' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  // Fill in zero days for a continuous 7-day chart
  const spendingTrend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().substring(0, 10);
    const found = dailyTrendAgg.find((item) => item._id === dateStr);
    spendingTrend.push({
      date: dateStr,
      amount: found ? found.totalSpent : 0
    });
  }

  // 7. Saving tips (pinned first, active)
  const savingTips = await SavingTip.find({
    user: userObjectId,
    isDismissed: false
  })
    .sort({ isPinned: -1, createdAt: -1 })
    .limit(5);

  // 8. Notification count
  const unreadNotificationCount = await Notification.countDocuments({
    user: userObjectId,
    read: false
  });

  return {
    summary: {
      incomeThisMonth,
      expenseThisMonth,
      currentBalance,
      netSavingsThisMonth,
      monthlyAllowance,
      savingsGoal,
      savingsGoalProgress: savingsGoal > 0 ? Math.min(100, Math.round((Math.max(0, netSavingsThisMonth) / savingsGoal) * 100)) : 0
    },
    topSpendingCategory,
    budgetVsActual,
    budgetWarnings,
    recentTransactions,
    spendingTrend,
    savingTips,
    unreadNotificationCount
  };
};

module.exports = { getDashboardData };
