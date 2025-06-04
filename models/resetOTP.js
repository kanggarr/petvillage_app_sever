const mongoose = require('mongoose');

const resetOtpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  otpExpires: {
    type: Date,
    required: true,
  },
}, {
  timestamps: true // สร้าง createdAt, updatedAt ให้โดยอัตโนมัติ
});

module.exports = mongoose.model('ResetOTP', resetOtpSchema);