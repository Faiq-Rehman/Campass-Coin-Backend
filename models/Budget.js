const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category reference is required']
    },
    month: {
      type: String,
      required: [true, 'Budget month is required (YYYY-MM)'],
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format']
    },
    limitAmount: {
      type: Number,
      required: [true, 'Budget limit amount is required'],
      min: [0.01, 'Limit must be greater than 0']
    },
    spentAmount: {
      type: Number,
      default: 0,
      min: [0, 'Spent amount cannot be negative']
    },
    percentageUsed: {
      type: Number,
      default: 0,
      min: [0, 'Percentage cannot be negative']
    },
    // Array of recorded threshold alerts (e.g., [80, 90, 100]) to avoid spamming duplicate notifications
    alertedThresholds: {
      type: [Number],
      default: []
    }
  },
  {
    timestamps: true
  }
);

// Compound index to guarantee one budget per category per month per user
budgetSchema.index({ user: 1, category: 1, month: 1 }, { unique: true });
budgetSchema.index({ user: 1, month: 1 });

const Budget = mongoose.model('Budget', budgetSchema);

module.exports = Budget;
