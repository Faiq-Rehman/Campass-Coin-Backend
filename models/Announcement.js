const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Announcement title is required'],
      trim: true
    },
    content: {
      type: String,
      required: [true, 'Announcement content is required'],
      trim: true
    },
    type: {
      type: String,
      enum: ['announcement', 'tip_template', 'warning'],
      default: 'announcement'
    },
    targetAudience: {
      type: String,
      enum: ['all', '1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate'],
      default: 'all'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

const Announcement = mongoose.model('Announcement', announcementSchema);

module.exports = Announcement;
