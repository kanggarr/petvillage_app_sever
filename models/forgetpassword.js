const mongoose = require('mongoose');

const forgetPasswordSchema = new mongoose.Schema({
  email: {
  type: String,
  required: true
  },
  resetToken: {
    type: String,
    required: true
  },
  resetTokenExpire: {
    type: Date,
    required: true
  }
}, {
  timestamps: true // มี createdAt, updatedAt ให้อัตโนมัติ
});

module.exports = mongoose.model('forgetpassword', forgetPasswordSchema);
