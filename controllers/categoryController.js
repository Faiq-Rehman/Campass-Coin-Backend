const Category = require('../models/Category');

/**
 * @desc    Get all categories accessible to user (System defaults + Personal custom)
 * @route   GET /api/categories
 * @access  Private (Student)
 */
const getCategories = async (req, res) => {
  try {
    const { type } = req.query;

    const query = {
      $or: [{ user: req.user._id }, { isDefault: true }]
    };

    if (type && ['income', 'expense'].includes(type)) {
      query.type = type;
    }

    const categories = await Category.find(query).sort({ isDefault: -1, name: 1 });

    res.status(200).json({
      success: true,
      message: 'Categories retrieved successfully',
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while fetching categories'
    });
  }
};

/**
 * @desc    Create a new personal category
 * @route   POST /api/categories
 * @access  Private (Student)
 */
const createCategory = async (req, res) => {
  try {
    const { name, type, icon, color } = req.body;

    // Check if category name exists for this user or as default
    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      type,
      $or: [{ user: req.user._id }, { isDefault: true }]
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A ${type} category named "${name}" already exists`
      });
    }

    const category = await Category.create({
      name: name.trim(),
      type,
      icon: icon || 'tag',
      color: color || '#6366f1',
      isDefault: false,
      user: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Personal category created successfully',
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while creating category'
    });
  }
};

/**
 * @desc    Update a personal category
 * @route   PUT /api/categories/:id
 * @access  Private (Student)
 */
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon, color } = req.body;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Default categories cannot be modified by students
    if (category.isDefault || !category.user) {
      return res.status(403).json({
        success: false,
        message: 'Default system categories cannot be modified by students'
      });
    }

    // Must belong to authenticated student
    if (category.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to modify this category'
      });
    }

    if (name) category.name = name.trim();
    if (icon) category.icon = icon;
    if (color) category.color = color;

    const updatedCategory = await category.save();

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: updatedCategory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while updating category'
    });
  }
};

/**
 * @desc    Delete a personal category
 * @route   DELETE /api/categories/:id
 * @access  Private (Student)
 */
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Default categories cannot be deleted by students
    if (category.isDefault || !category.user) {
      return res.status(403).json({
        success: false,
        message: 'Default system categories cannot be deleted'
      });
    }

    // Check ownership
    if (category.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this category'
      });
    }

    await Category.deleteOne({ _id: category._id });

    res.status(200).json({
      success: true,
      message: 'Personal category deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while deleting category'
    });
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
