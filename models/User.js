const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Please provide your full name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ]
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false // Excluded by default in queries for security
    },
    academicYear: {
      type: String,
      enum: ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate', 'Other'],
      default: '1st Year'
    },
    monthlyAllowance: {
      type: Number,
      default: 0,
      min: [0, 'Monthly allowance cannot be negative']
    },
    savingsGoal: {
      type: Number,
      default: 0,
      min: [0, 'Savings goal cannot be negative']
    },
    profilePicture: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['active', 'disabled'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Safe JSON serialization
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
