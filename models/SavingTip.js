const mongoose = require('mongoose');

const savingTipSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    tipText: {
      type: String,
      required: [true, 'Tip text is required'],
      trim: true
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null
    },
    ruleTriggered: {
      type: String,
      required: [true, 'Rule trigger identifier is required']
    },
    isPinned: {
      type: Boolean,
      default: false
    },
    isDismissed: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

savingTipSchema.index({ user: 1, isDismissed: 1, isPinned: -1 });

const SavingTip = mongoose.model('SavingTip', savingTipSchema);

module.exports = SavingTip;
