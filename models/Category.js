const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [50, 'Category name cannot exceed 50 characters']
    },
    type: {
      type: String,
      required: [true, 'Category type is required'],
      enum: {
        values: ['income', 'expense'],
        message: 'Category type must be either income or expense'
      }
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null // null for system-wide default categories
    },
    icon: {
      type: String,
      default: 'tag'
    },
    color: {
      type: String,
      default: '#6366f1'
    }
  },
  {
    timestamps: true
  }
);

// Compound index to ensure uniqueness per user or within default categories
categorySchema.index({ name: 1, type: 1, user: 1 }, { unique: true });

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
