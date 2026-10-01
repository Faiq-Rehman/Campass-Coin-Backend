const express = require('express');
const router = express.Router();
const {
  adminLogin,
  getAdminDashboard,
  getAllUsers,
  getUserById,
  toggleUserStatus,
  resetStudentPassword,
  deleteUser,
  getAdminCategories,
  createDefaultCategory,
  updateDefaultCategory,
  deleteDefaultCategory,
  getAdminStatistics,
  getLogs,
  getTipTemplates,
  createTipTemplate,
  updateTipTemplate,
  deleteTipTemplate,
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
} = require('../controllers/adminController');
const { protectAdmin } = require('../middleware/adminMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const {
  adminLoginValidation,
  categoryValidation,
  announcementValidation
} = require('../utils/validators');

// Public Admin Login
router.post('/login', adminLoginValidation, validate, adminLogin);

// Protected Admin Routes
router.use(protectAdmin);

router.get('/dashboard', getAdminDashboard);
router.get('/statistics', getAdminStatistics);
router.get('/logs', getLogs);

// User Management
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id/status', toggleUserStatus);
router.put('/users/:id/password', resetStudentPassword);
router.delete('/users/:id', deleteUser);

// Category Management
router.get('/categories', getAdminCategories);
router.post('/categories', categoryValidation, validate, createDefaultCategory);
router.put('/categories/:id', updateDefaultCategory);
router.delete('/categories/:id', deleteDefaultCategory);

// Announcements & Tip Templates
router.get('/tip-templates', getTipTemplates);
router.post('/tip-templates', createTipTemplate);
router.put('/tip-templates/:id', updateTipTemplate);
router.delete('/tip-templates/:id', deleteTipTemplate);

router.get('/announcements', getAnnouncements);
router.post('/announcements', announcementValidation, validate, createAnnouncement);
router.put('/announcements/:id', updateAnnouncement);
router.delete('/announcements/:id', deleteAnnouncement);

module.exports = router;
