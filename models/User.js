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
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false
    },
    // Password recovery uses two user-selected security questions.
    // Answers are never stored as plain text.
    securityQuestion1: {
      type: String,
      trim: true,
      maxlength: 180,
      default: ''
    },
    securityAnswer1Hash: {
      type: String,
      select: false,
      default: ''
    },
    securityQuestion2: {
      type: String,
      trim: true,
      maxlength: 180,
      default: ''
    },
    securityAnswer2Hash: {
      type: String,
      select: false,
      default: ''
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
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  try {
    if (this.isModified('password')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }

    if (this.isModified('securityAnswer1Hash') && this.securityAnswer1Hash) {
      const salt = await bcrypt.genSalt(10);
      this.securityAnswer1Hash = await bcrypt.hash(this.securityAnswer1Hash, salt);
    }

    if (this.isModified('securityAnswer2Hash') && this.securityAnswer2Hash) {
      const salt = await bcrypt.genSalt(10);
      this.securityAnswer2Hash = await bcrypt.hash(this.securityAnswer2Hash, salt);
    }

    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.matchSecurityAnswers = async function (answer1, answer2) {
  if (!this.securityAnswer1Hash || !this.securityAnswer2Hash) return false;
  const first = await bcrypt.compare(String(answer1 || '').trim().toLowerCase(), this.securityAnswer1Hash);
  const second = await bcrypt.compare(String(answer2 || '').trim().toLowerCase(), this.securityAnswer2Hash);
  return first && second;
};

userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.securityAnswer1Hash;
  delete userObject.securityAnswer2Hash;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);
