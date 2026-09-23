const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const User = require('../models/User');

/**
 * 1. Monthly Financial Report
 */
const getMonthlyReport = async (userId, monthStr) => {
  const currentMonth = monthStr || new Date().toISOString().substring(0, 7);
  const [year, month] = currentMonth.split('-').map(Number);

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  const userObjectId = new mongoose.Types.ObjectId(userId);

  // Income & Expense totals
  const totalsAgg = await Transaction.aggregate([
    {
      $match: {
        user: userObjectId,
        date: { $gte: startOfMonth, $lte: endOfMonth }
      }
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
  let incomeTxCount = 0;
  let expenseTxCount = 0;

  totalsAgg.forEach((t) => {
    if (t._id === 'income') {
      totalIncome = t.total;
      incomeTxCount = t.count;
    }
    if (t._id === 'expense') {
      totalExpense = t.total;
      expenseTxCount = t.count;
    }
  });

  // Category breakdown for expenses
  const categoryBreakdown = await Transaction.aggregate([
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
        totalSpent: { $sum: '$amount' },
        transactionCount: { $sum: 1 }
      }
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
    },
    {
      $sort: { totalSpent: -1 }
    }
  ]);

  const formattedCategories = categoryBreakdown.map((c) => ({
    categoryId: c._id,
    categoryName: c.categoryDoc.name,
    icon: c.categoryDoc.icon,
    color: c.categoryDoc.color,
    totalSpent: c.totalSpent,
    transactionCount: c.transactionCount,
    percentage: totalExpense > 0 ? Number(((c.totalSpent / totalExpense) * 100).toFixed(1)) : 0
  }));

  // Daily distribution
  const dailyDistribution = await Transaction.aggregate([
    {
      $match: {
        user: userObjectId,
        date: { $gte: startOfMonth, $lte: endOfMonth }
      }
    },
    {
      $group: {
        _id: {
          dateStr: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          type: '$type'
        },
        total: { $sum: '$amount' }
      }
    },
    {
      $sort: { '_id.dateStr': 1 }
    }
  ]);

  return {
    month: currentMonth,
    totalIncome,
    totalExpense,
    netSavings: totalIncome - totalExpense,
    transactionCount: incomeTxCount + expenseTxCount,
    categoryBreakdown: formattedCategories,
    dailyDistribution
  };
};

/**
 * 2. Six-Month Income vs Expense Trend
 */
const getSixMonthsReport = async (userId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const now = new Date();

  // Start 5 months ago at the 1st day of that month
  const startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const stats = await Transaction.aggregate([
    {
      $match: {
        user: userObjectId,
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          month: { $dateToString: { format: '%Y-%m', date: '$date' } },
          type: '$type'
        },
        total: { $sum: '$amount' }
      }
    },
    {
      $sort: { '_id.month': 1 }
    }
  ]);

  // Construct continuous 6-month array
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mStr = d.toISOString().substring(0, 7);
    const monthName = d.toLocaleString('default', { month: 'short', year: 'numeric' });

    const incomeEntry = stats.find((s) => s._id.month === mStr && s._id.type === 'income');
    const expenseEntry = stats.find((s) => s._id.month === mStr && s._id.type === 'expense');

    const income = incomeEntry ? incomeEntry.total : 0;
    const expense = expenseEntry ? expenseEntry.total : 0;

    months.push({
      month: mStr,
      label: monthName,
      income,
      expense,
      savings: income - expense
    });
  }

  return months;
};

/**
 * 3. Daily Spending Report
 */
const getDailyReport = async (userId, startDate, endDate) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const dailyAgg = await Transaction.aggregate([
    {
      $match: {
        user: userObjectId,
        type: 'expense',
        date: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        totalSpent: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  return dailyAgg.map((d) => ({
    date: d._id,
    totalSpent: d.totalSpent,
    count: d.count
  }));
};

/**
 * 4. Weekly Spending Report
 */
const getWeeklyReport = async (userId, weeksCount = 4) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const days = Number(weeksCount) * 7;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const weeklyAgg = await Transaction.aggregate([
    {
      $match: {
        user: userObjectId,
        type: 'expense',
        date: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $isoWeekYear: '$date' },
          week: { $isoWeek: '$date' }
        },
        totalSpent: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.week': 1 }
    }
  ]);

  return weeklyAgg.map((w) => ({
    weekNumber: `W${w._id.week}-${w._id.year}`,
    year: w._id.year,
    week: w._id.week,
    totalSpent: w.totalSpent,
    transactionCount: w.count
  }));
};

/**
 * 5. Category-wise Spending Breakdown
 */
const getCategorySpendingReport = async (userId, startDate, endDate, type = 'expense') => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const matchQuery = {
    user: userObjectId,
    type
  };

  if (startDate || endDate) {
    matchQuery.date = {};
    if (startDate) matchQuery.date.$gte = new Date(startDate);
    if (endDate) matchQuery.date.$lte = new Date(endDate);
  }

  const result = await Transaction.aggregate([
    {
      $match: matchQuery
    },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
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
    },
    {
      $sort: { total: -1 }
    }
  ]);

  const grandTotal = result.reduce((sum, item) => sum + item.total, 0);

  return result.map((item) => ({
    categoryId: item._id,
    name: item.categoryDoc.name,
    icon: item.categoryDoc.icon,
    color: item.categoryDoc.color,
    total: item.total,
    count: item.count,
    percentage: grandTotal > 0 ? Number(((item.total / grandTotal) * 100).toFixed(1)) : 0
  }));
};

/**
 * 6. Rule-based Monthly Expense & Savings Forecast
 */
const getMonthlyForecast = async (userId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Group last 3 months
  const monthlyAgg = await Transaction.aggregate([
    {
      $match: {
        user: userObjectId,
        date: { $gte: ninetyDaysAgo }
      }
    },
    {
      $group: {
        _id: {
          month: { $dateToString: { format: '%Y-%m', date: '$date' } },
          type: '$type'
        },
        total: { $sum: '$amount' }
      }
    }
  ]);

  const monthsMap = {};
  monthlyAgg.forEach((item) => {
    const m = item._id.month;
    if (!monthsMap[m]) monthsMap[m] = { income: 0, expense: 0 };
    if (item._id.type === 'income') monthsMap[m].income = item.total;
    if (item._id.type === 'expense') monthsMap[m].expense = item.total;
  });

  const monthValues = Object.values(monthsMap);
  const monthCount = monthValues.length;

  let expectedIncome = 0;
  let expectedExpense = 0;

  if (monthCount > 0) {
    const totalInc = monthValues.reduce((sum, v) => sum + v.income, 0);
    const totalExp = monthValues.reduce((sum, v) => sum + v.expense, 0);

    expectedIncome = Math.round(totalInc / monthCount);
    expectedExpense = Math.round(totalExp / monthCount);
  } else {
    const user = await User.findById(userId);
    expectedIncome = user ? user.monthlyAllowance : 0;
    expectedExpense = Math.round(expectedIncome * 0.8);
  }

  const expectedSavings = expectedIncome - expectedExpense;

  return {
    forecastMonth: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().substring(0, 7),
    expectedIncome,
    expectedExpense,
    expectedSavings,
    monthsAnalyzed: monthCount,
    confidenceLevel: monthCount >= 3 ? 'Moderate' : 'Preliminary (Limited Historical Data)',
    disclaimer: 'This forecast is a purely rule-based statistical projection based on past averages and does not constitute certified financial advice.'
  };
};

/**
 * 7. PDF Report Generator
 */
const generatePDFReport = async (userId, monthStr) => {
  const user = await User.findById(userId);
  const reportData = await getMonthlyReport(userId, monthStr);
  const transactions = await Transaction.find({
    user: userId,
    date: {
      $gte: new Date(reportData.month + '-01'),
      $lte: new Date(new Date(reportData.month + '-01').getFullYear(), new Date(reportData.month + '-01').getMonth() + 1, 0, 23, 59, 59, 999)
    }
  }).populate('category', 'name').sort({ date: -1 });

  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  // Header
  doc.fontSize(22).fillColor('#1e293b').text('Campus Coin', 40, 40);
  doc.fontSize(12).fillColor('#64748b').text('Smart Spending Student Style - Financial Statement', 40, 68);
  doc.moveDown(1.5);

  // User Info & Month Banner
  doc.rect(40, 95, 515, 60).fill('#f8fafc');
  doc.fillColor('#0f172a').fontSize(11);
  doc.text(`Student: ${user ? user.fullName : 'Campus Student'}`, 55, 105);
  doc.text(`Email: ${user ? user.email : 'N/A'}`, 55, 122);
  doc.text(`Academic Year: ${user ? user.academicYear : '1st Year'}`, 55, 138);

  doc.text(`Statement Month: ${reportData.month}`, 340, 105);
  doc.text(`Generated On: ${new Date().toLocaleDateString()}`, 340, 122);
  doc.text(`Status: Official Report`, 340, 138);

  doc.moveDown(3);

  // Financial Summary Cards
  doc.fontSize(14).fillColor('#0f172a').text('Monthly Financial Summary', 40, 175);

  // Income Box
  doc.rect(40, 195, 160, 50).fill('#ecfdf5');
  doc.fillColor('#065f46').fontSize(10).text('Total Income', 50, 205);
  doc.fontSize(16).text(`$${reportData.totalIncome.toFixed(2)}`, 50, 222);

  // Expense Box
  doc.rect(215, 195, 160, 50).fill('#fef2f2');
  doc.fillColor('#991b1b').fontSize(10).text('Total Expenses', 225, 205);
  doc.fontSize(16).text(`$${reportData.totalExpense.toFixed(2)}`, 225, 222);

  // Net Savings Box
  doc.rect(390, 195, 165, 50).fill('#eff6ff');
  doc.fillColor('#1e40af').fontSize(10).text('Net Savings', 400, 205);
  doc.fontSize(16).text(`$${reportData.netSavings.toFixed(2)}`, 400, 222);

  // Category Breakdown Section
  let yPos = 265;
  doc.fontSize(13).fillColor('#0f172a').text('Expense Breakdown by Category', 40, yPos);
  yPos += 20;

  // Table Header
  doc.rect(40, yPos, 515, 22).fill('#e2e8f0');
  doc.fillColor('#334155').fontSize(10).font('Helvetica-Bold');
  doc.text('Category', 50, yPos + 6);
  doc.text('Transactions', 220, yPos + 6);
  doc.text('Share', 340, yPos + 6);
  doc.text('Amount ($)', 460, yPos + 6);
  yPos += 26;

  doc.font('Helvetica');
  if (reportData.categoryBreakdown.length === 0) {
    doc.fillColor('#64748b').text('No expenses recorded for this month.', 50, yPos);
    yPos += 20;
  } else {
    reportData.categoryBreakdown.forEach((cat) => {
      doc.fillColor('#1e293b').fontSize(10);
      doc.text(cat.categoryName, 50, yPos);
      doc.text(cat.transactionCount.toString(), 220, yPos);
      doc.text(`${cat.percentage}%`, 340, yPos);
      doc.text(`$${cat.totalSpent.toFixed(2)}`, 460, yPos);
      yPos += 20;
    });
  }

  // Transactions Listing (recent up to 15)
  yPos += 15;
  if (yPos > 650) {
    doc.addPage();
    yPos = 40;
  }

  doc.fontSize(13).font('Helvetica-Bold').fillColor('#0f172a').text('Transaction History (Sample)', 40, yPos);
  yPos += 20;

  doc.rect(40, yPos, 515, 22).fill('#e2e8f0');
  doc.fillColor('#334155').fontSize(10).font('Helvetica-Bold');
  doc.text('Date', 50, yPos + 6);
  doc.text('Description', 130, yPos + 6);
  doc.text('Type', 340, yPos + 6);
  doc.text('Amount ($)', 460, yPos + 6);
  yPos += 26;

  doc.font('Helvetica');
  const sampleTx = transactions.slice(0, 15);
  if (sampleTx.length === 0) {
    doc.fillColor('#64748b').text('No transactions found in this period.', 50, yPos);
    yPos += 20;
  } else {
    sampleTx.forEach((tx) => {
      if (yPos > 750) {
        doc.addPage();
        yPos = 40;
      }
      doc.fillColor('#1e293b').fontSize(9);
      doc.text(new Date(tx.date).toLocaleDateString(), 50, yPos);
      doc.text(tx.description.substring(0, 30), 130, yPos);
      doc.fillColor(tx.type === 'income' ? '#059669' : '#dc2626');
      doc.text(tx.type.toUpperCase(), 340, yPos);
      doc.fillColor('#1e293b');
      doc.text(`$${tx.amount.toFixed(2)}`, 460, yPos);
      yPos += 18;
    });
  }

  // Footer Disclaimer
  doc.fontSize(8).fillColor('#94a3b8').text(
    'Disclaimer: Campus Coin reports are for student budgeting reference and personal educational assistance only.',
    40,
    780,
    { align: 'center', width: 515 }
  );

  doc.end();
  return doc;
};

module.exports = {
  getMonthlyReport,
  getSixMonthsReport,
  getDailyReport,
  getWeeklyReport,
  getCategorySpendingReport,
  getMonthlyForecast,
  generatePDFReport
};
