const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, trim: true },
    target: { type: String, default: 'System', trim: true },
    adminUsername: { type: String, required: true, trim: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

adminLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AdminLog', adminLogSchema);
