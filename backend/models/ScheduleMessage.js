const mongoose = require('mongoose');

const scheduleMessageSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: [true, 'Message body is required'],
      trim: true,
    },
    scheduledTime: {
      type: Date,
      required: [true, 'Scheduled time is required'],
      index: true,
    },
    isSent: {
      type: Boolean,
      default: false,
      index: true,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ScheduleMessage', scheduleMessageSchema);
