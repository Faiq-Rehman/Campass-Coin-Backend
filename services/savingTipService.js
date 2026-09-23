const Transaction = require('../models/Transaction');
const SavingTip = require('../models/SavingTip');
const Category = require('../models/Category');

/**
 * Analyzes transaction patterns and generates personalized, rule-based saving tips
 */
const generateSavingTipsForUser = async (userId) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Group user's expenses by category for the last 30 days
  const categoryStats = await Transaction.aggregate([
    {
      $match: {
        user: userId,
        type: 'expense',
        date: { $gte: thirtyDaysAgo }
      }
    },
    {
      $group: {
        _id: '$category',
        totalSpent: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'categoryDetails'
      }
    },
    {
      $unwind: '$categoryDetails'
    }
  ]);

  const totalExpense = categoryStats.reduce((sum, item) => sum + item.totalSpent, 0);

  const tipsToCreate = [];

  if (totalExpense > 0) {
    categoryStats.forEach((stat) => {
      const percentage = (stat.totalSpent / totalExpense) * 100;
      const categoryName = stat.categoryDetails.name;

      // 1. Food Rule
      if (categoryName === 'Food' && percentage > 35) {
        tipsToCreate.push({
          tipText: `Food accounts for ${Math.round(percentage)}% of your recent spending. Planning meals or setting a weekly cafe limit could save you significant cash.`,
          category: stat._id,
          ruleTriggered: 'HIGH_FOOD_SPENDING'
        });
      }

      // 2. Subscriptions Rule
      if (categoryName === 'Subscriptions' && (percentage > 15 || stat.count >= 3)) {
        tipsToCreate.push({
          tipText: 'You have multiple recurring subscriptions. Audit active streaming, software, and gym memberships to eliminate unused ones.',
          category: stat._id,
          ruleTriggered: 'SUBSCRIPTION_AUDIT'
        });
      }

      // 3. Transport Rule
      if (categoryName === 'Transport' && percentage > 20) {
        tipsToCreate.push({
          tipText: `Transport represents ${Math.round(percentage)}% of your expenses. Explore campus transit passes, cycling, or student carpooling.`,
          category: stat._id,
          ruleTriggered: 'TRANSPORT_SPIKE'
        });
      }

      // 4. Entertainment Rule
      if (categoryName === 'Entertainment' && percentage > 20) {
        tipsToCreate.push({
          tipText: `Entertainment made up ${Math.round(percentage)}% of your spending. Check out campus events, student matinee tickets, and free student club activities.`,
          category: stat._id,
          ruleTriggered: 'ENTERTAINMENT_LIMIT'
        });
      }
    });
  }

  // 5. General Student Savings Tip
  if (tipsToCreate.length === 0) {
    tipsToCreate.push({
      tipText: 'Try the 50/30/20 student budgeting rule: 50% for needs, 30% for wants, and 20% toward emergency savings or future semester expenses.',
      category: null,
      ruleTriggered: 'GENERAL_SAVINGS_RULE'
    });
  }

  // Insert tips without duplicating active ones for the user
  const savedTips = [];
  for (const tip of tipsToCreate) {
    const existing = await SavingTip.findOne({
      user: userId,
      ruleTriggered: tip.ruleTriggered,
      isDismissed: false
    });

    if (!existing) {
      const created = await SavingTip.create({
        user: userId,
        tipText: tip.tipText,
        category: tip.category,
        ruleTriggered: tip.ruleTriggered,
        isPinned: false,
        isDismissed: false
      });
      savedTips.push(created);
    } else {
      savedTips.push(existing);
    }
  }

  return savedTips;
};

module.exports = { generateSavingTipsForUser };
