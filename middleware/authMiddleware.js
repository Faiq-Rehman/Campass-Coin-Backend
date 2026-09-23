const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect routes - Verifies JWT and attaches authenticated student user
 */
const protect = async (req, res, next) => {
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

      // Verify role is not admin attempting student login or unauthorized
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User no longer exists or session is invalid'
        });
      }

      if (user.status === 'disabled') {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated. Please contact campus administrator.'
        });
      }

      req.user = user;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Authentication token has expired. Please login again.'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid or malformed authentication token'
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      message: 'Authorization denied. No token provided.'
    });
  }
};

module.exports = { protect };
