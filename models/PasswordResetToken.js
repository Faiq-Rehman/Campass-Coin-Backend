const mongoose = require('mongoose');

const passwordResetTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    token: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: '1h' } // Auto-delete expired tokens
    }
  },
  {
    timestamps: true
  }
);

passwordResetTokenSchema.index({ token: 1 });

const PasswordResetToken = mongoose.model('PasswordResetToken', passwordResetTokenSchema);

module.exports = PasswordResetToken;
