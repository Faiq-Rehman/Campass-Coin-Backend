const jwt = require('jsonwebtoken');

/**
 * Generate signed JWT token
 * @param {string} id - User or Admin ID
 * @param {string} role - 'student' or 'admin'
 * @returns {string} - Signed JWT
 */
const generateToken = (id, role = 'student') => {
  const secret = process.env.JWT_SECRET || 'campus_coin_jwt_fallback_secret_key';
  return jwt.sign({ id, role }, secret, {
    expiresIn: '30d'
  });
};

module.exports = generateToken;
