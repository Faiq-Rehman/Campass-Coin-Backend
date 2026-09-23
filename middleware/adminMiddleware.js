const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

/**
 * Protect routes for Administrators only
 */
const protectAdmin = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'campus_coin_jwt_fallback_secret_key'
      );

      if (decoded.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access forbidden. Administrator credentials required.'
        });
      }

      const admin = await Admin.findById(decoded.id);

      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Admin account not found or deactivated'
        });
      }

      req.admin = admin;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Admin token expired. Please login again.'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid administrator authentication token'
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      message: 'Authorization denied. No administrator token provided.'
    });
  }
};

module.exports = { protectAdmin };
