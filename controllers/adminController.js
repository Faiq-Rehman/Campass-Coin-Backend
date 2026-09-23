const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const Budget = require('../models/Budget');
const Notification = require('../models/Notification');
const Announcement = require('../models/Announcement');
const generateToken = require('../utils/generateToken');

/**
 * @desc    Authenticate admin
 * @route   POST /api/admin/login
 * @access  Public (Admin portal)
 */
const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    const admin = await Admin.findOne({ username: username.toLowerCase() }).select('+password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid administrator credentials'
      });
    }

    const isMatch = await admin.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid administrator credentials'
      });
    }

    const token = generateToken(admin._id, 'admin');

    res.status(200).json({
      success: true,
      message: 'Admin authentication successful',
      data: {
        admin: {
          _id: admin._id,
          username: admin.username,
          role: admin.role
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during admin login'
    });
  }
};

/**
 * @desc    Get admin dashboard metrics
 * @route   GET /api/admin/dashboard
 * @access  Private (Admin)
 */
const getAdminDashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const disabledUsers = await User.countDocuments({ status: 'disabled' });

    const totalTransactions = await Transaction.countDocuments();
    const totalIncomeTransactions = await Transaction.countDocuments({ type: 'income' });
    const totalExpenseTransactions = await Transaction.countDocuments({ type: 'expense' });

    // Most used categories
    const topCategories = await Transaction.aggregate([
      {
        $group: {
          _id: '$category',
          usageCount: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      {
        $sort: { usageCount: -1 }
      },
      {
        $limit: 5
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

    const formattedTopCategories = topCategories.map((c) => ({
      categoryId: c._id,
      name: c.categoryDoc.name,
      type: c.categoryDoc.type,
      usageCount: c.usageCount,
      totalAmount: c.totalAmount
    }));

    // Monthly activity over last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const monthlyActivity = await Transaction.aggregate([
      {
        $match: { date: { $gte: sixMonthsAgo } }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          totalVolume: { $sum: '$amount' },
          transactionCount: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Admin dashboard data loaded',
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          disabled: disabledUsers
        },
        transactions: {
          total: totalTransactions,
          income: totalIncomeTransactions,
          expense: totalExpenseTransactions
        },
        topCategories: formattedTopCategories,
        monthlyActivity
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while generating admin dashboard'
    });
  }
};

/**
 * @desc    Get all registered students (paginated & searchable)
 * @route   GET /api/admin/users
 * @access  Private (Admin)
 */
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;

    const query = {};
    if (status && ['active', 'disabled'].includes(status)) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      message: 'User list retrieved',
      data: {
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1,
          totalCount: total
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while fetching users'
    });
  }
};

/**
 * @desc    Get specific user profile & transaction count
 * @route   GET /api/admin/users/:id
 * @access  Private (Admin)
 */
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Student user not found'
      });
    }

    const transactionCount = await Transaction.countDocuments({ user: user._id });
    const budgetCount = await Budget.countDocuments({ user: user._id });

    res.status(200).json({
      success: true,
      message: 'User details fetched',
      data: {
        user,
        stats: {
          transactionCount,
          budgetCount
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while fetching user'
    });
  }
};

/**
 * @desc    Toggle student account status (active/disabled)
 * @route   PUT /api/admin/users/:id/status
 * @access  Private (Admin)
 */
const toggleUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'disabled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "active" or "disabled"'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Student user not found'
      });
    }

    user.status = status;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User account status updated to ${status}`,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while updating user status'
    });
  }
};

/**
 * @desc    Delete user and all their records
 * @route   DELETE /api/admin/users/:id
 * @access  Private (Admin)
 */
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Student user not found'
      });
    }

    const userId = user._id;

    // Clean up related data
    await Transaction.deleteMany({ user: userId });
    await Budget.deleteMany({ user: userId });
    await Notification.deleteMany({ user: userId });
    await Category.deleteMany({ user: userId });
    await User.deleteOne({ _id: userId });

    res.status(200).json({
      success: true,
      message: 'Student user and all associated financial records deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while deleting user'
    });
  }
};

/**
 * @desc    Get all categories for admin (defaults + custom)
 * @route   GET /api/admin/categories
 * @access  Private (Admin)
 */
const getAdminCategories = async (req, res) => {
  try {
    const categories = await Category.find().populate('user', 'fullName email').sort({ isDefault: -1, name: 1 });

    res.status(200).json({
      success: true,
      message: 'All categories retrieved',
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
 * @desc    Create a system default category
 * @route   POST /api/admin/categories
 * @access  Private (Admin)
 */
const createDefaultCategory = async (req, res) => {
  try {
    const { name, type, icon, color } = req.body;

    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      type,
      isDefault: true
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Default category "${name}" already exists`
      });
    }

    const category = await Category.create({
      name: name.trim(),
      type,
      icon: icon || 'tag',
      color: color || '#6366f1',
      isDefault: true,
      user: null
    });

    res.status(201).json({
      success: true,
      message: 'Default system category created',
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while creating default category'
    });
  }
};

/**
 * @desc    Update system default category
 * @route   PUT /api/admin/categories/:id
 * @access  Private (Admin)
 */
const updateDefaultCategory = async (req, res) => {
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

    if (name) category.name = name.trim();
    if (icon) category.icon = icon;
    if (color) category.color = color;

    const updated = await category.save();

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while updating category'
    });
  }
};

/**
 * @desc    Delete system default category
 * @route   DELETE /api/admin/categories/:id
 * @access  Private (Admin)
 */
const deleteDefaultCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    await Category.deleteOne({ _id: category._id });

    res.status(200).json({
      success: true,
      message: 'Category removed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while deleting category'
    });
  }
};

/**
 * @desc    Get detailed platform statistics
 * @route   GET /api/admin/statistics
 * @access  Private (Admin)
 */
const getAdminStatistics = async (req, res) => {
  try {
    const totalVolumeAgg = await Transaction.aggregate([
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' }
        }
      }
    ]);

    let totalIncomeVolume = 0;
    let totalExpenseVolume = 0;

    totalVolumeAgg.forEach((t) => {
      if (t._id === 'income') totalIncomeVolume = t.total;
      if (t._id === 'expense') totalExpenseVolume = t.total;
    });

    const activeBudgets = await Budget.countDocuments();
    const totalAnnouncements = await Announcement.countDocuments();

    res.status(200).json({
      success: true,
      message: 'Platform statistics retrieved',
      data: {
        totalIncomeVolume,
        totalExpenseVolume,
        activeBudgets,
        totalAnnouncements
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while fetching statistics'
    });
  }
};

// Announcement & Tip Templates Controllers
const getAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: 'Announcements retrieved',
      data: announcements
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createAnnouncement = async (req, res) => {
  try {
    const { title, content, type, targetAudience } = req.body;
    const announcement = await Announcement.create({
      title,
      content,
      type: type || 'announcement',
      targetAudience: targetAudience || 'all'
    });

    // Optionally broadcast notification to students
    const users = await User.find({ status: 'active' });
    const notifications = users.map((u) => ({
      user: u._id,
      title: `Campus Announcement: ${title}`,
      message: content,
      type: 'system'
    }));
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    res.status(201).json({
      success: true,
      message: 'Announcement published successfully',
      data: announcement
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findByIdAndUpdate(id, req.body, { new: true });
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }
    res.status(200).json({
      success: true,
      message: 'Announcement updated',
      data: announcement
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    await Announcement.findByIdAndDelete(id);
    res.status(200).json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  adminLogin,
  getAdminDashboard,
  getAllUsers,
  getUserById,
  toggleUserStatus,
  deleteUser,
  getAdminCategories,
  createDefaultCategory,
  updateDefaultCategory,
  deleteDefaultCategory,
  getAdminStatistics,
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
};
