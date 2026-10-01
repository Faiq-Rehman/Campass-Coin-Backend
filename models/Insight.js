const mongoose = require('mongoose');

const insightSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    month: {
      type: String,
      required: [true, 'Insight month is required (YYYY-MM)'],
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format']
    },
    incomeTotal: {
      type: Number,
      default: 0
    },
    expenseTotal: {
      type: Number,
      default: 0
    },
    savingsTotal: {
      type: Number,
      default: 0
    },
    topCategory: {
      name: { type: String, default: 'None' },
      amount: { type: Number, default: 0 }
    },
    narrativeText: {
      type: String,
      required: [true, 'Narrative text is required']
    },
    highlights: {
      type: [String],
      default: []
    },
    disclaimer: {
      type: String,
      default: 'This insight is generated for informational guidance only and is not certified financial advice.'
    }
  },
  {
    timestamps: true
  }
);

insightSchema.index({ user: 1, month: -1 });

const Insight = mongoose.model('Insight', insightSchema);

module.exports = Insight;
