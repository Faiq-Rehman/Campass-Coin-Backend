const mongoose = require('mongoose');

const tipTemplateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    tipText: { type: String, required: true, trim: true, maxlength: 1000 },
    categoryName: { type: String, default: 'General', trim: true, maxlength: 80 },
    triggerRule: { type: String, default: 'MANUAL_OR_DEFAULT', trim: true, maxlength: 100 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('TipTemplate', tipTemplateSchema);
