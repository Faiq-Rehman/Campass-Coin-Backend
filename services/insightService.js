const mongoose = require('mongoose');
const Insight = require('../models/Insight');
const Transaction = require('../models/Transaction');

/**
 * Generates an advisory plain-language monthly insight for a user
 * @param {ObjectId} userId
 * @param {string} monthStr - Format "YYYY-MM"
 */
const generateMonthlyInsight = async (userId, monthStr) => {
  const currentMonthStr =
    monthStr || new Date().toISOString().substring(0, 7);

  const [year, month] = currentMonthStr.split('-').map(Number);
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  // Previous month dates for comparison
  const startOfPrevMonth = new Date(year, month - 2, 1);
  const endOfPrevMonth = new Date(year, month - 1, 0, 23, 59, 59, 999);

  // 1. Current month aggregations
  const currentTotals = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
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

  let incomeTotal = 0;
  let expenseTotal = 0;

  currentTotals.forEach((t) => {
    if (t._id === 'income') incomeTotal = t.total;
    if (t._id === 'expense') expenseTotal = t.total;
  });

  const savingsTotal = incomeTotal - expenseTotal;

  // 2. Current month top spending category
  const topCategories = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
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

  const topCategory = topCategories.length > 0
    ? { name: topCategories[0].categoryDoc.name, amount: topCategories[0].totalSpent }
    : { name: 'None', amount: 0 };

  // 3. Previous month expenses for trend comparison
  const prevTotals = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        type: 'expense',
        date: { $gte: startOfPrevMonth, $lte: endOfPrevMonth }
      }
    },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' }
      }
    }
  ]);

  const prevExpenseTotal = prevTotals.length > 0 ? prevTotals[0].total : 0;

  // 4. Construct plain-language narrative
  const highlights = [];

  let narrative = `This month (${currentMonthStr}), you recorded an income of $${incomeTotal.toLocaleString()} and expenses of $${expenseTotal.toLocaleString()}. `;

  if (savingsTotal > 0) {
    narrative += `You achieved a positive net savings balance of $${savingsTotal.toLocaleString()}. `;
    highlights.push(`Saved $${savingsTotal.toLocaleString()} this month.`);
  } else if (savingsTotal < 0) {
    narrative += `Your spending exceeded your income by $${Math.abs(savingsTotal).toLocaleString()}. `;
    highlights.push(`Budget deficit of $${Math.abs(savingsTotal).toLocaleString()} detected.`);
  } else {
    narrative += `Your income and expenses balanced exactly. `;
  }

  if (topCategory.name !== 'None') {
    const topPct = expenseTotal > 0 ? Math.round((topCategory.amount / expenseTotal) * 100) : 0;
    narrative += `${topCategory.name} was your highest expense category, taking up $${topCategory.amount.toLocaleString()} (${topPct}% of all expenses). `;
    highlights.push(`${topCategory.name} was your largest cost center (${topPct}% of spending).`);
  }

  if (prevExpenseTotal > 0) {
    const diff = expenseTotal - prevExpenseTotal;
    const diffPct = Math.round(Math.abs(diff) / prevExpenseTotal * 100);
    if (diff > 0) {
      narrative += `Overall spending increased by ${diffPct}% compared with last month.`;
      highlights.push(`Spending increased ${diffPct}% from last month.`);
    } else if (diff < 0) {
      narrative += `Great job! Your spending decreased by ${diffPct}% compared with last month.`;
      highlights.push(`Reduced spending by ${diffPct}% from previous month.`);
    } else {
      narrative += `Your spending remained steady compared with last month.`;
    }
  }

  // 5. Upsert Insight record in database
  const insight = await Insight.findOneAndUpdate(
    { user: userId, month: currentMonthStr },
    {
      user: userId,
      month: currentMonthStr,
      incomeTotal,
      expenseTotal,
      savingsTotal,
      topCategory,
      narrativeText: narrative.trim(),
      highlights,
      disclaimer: 'This insight is generated for informational guidance only and is not certified financial advice.'
    },
    { new: true, upsert: true }
  );

  return insight;
};

module.exports = { generateMonthlyInsight };
