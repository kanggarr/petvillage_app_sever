const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
      type: String,
      required: [true, "Please add the username"]
    },
    email: {
      type: String,
      required: [true, "Please add the email address"],
      unique: [true, "Email address is already taken"]
    },
    name: { type: String },
    phone: { type: String },
    address: { type: String },
    postCode: { type: String },
    province: { type: String },
    district: { type: String },
    subDistrict: { type: String },
    password: {
      type: String,
      required: [true, "Please add password"],
      select: false
    },
    role: {
      type: String,
      enum: ['user', 'shop'],  // ✅ Define allowed values
      default: 'user'            // ✅ Set default value
    },
    otp: { type: String, required: false }, // เก็บ OTP ล่าสุด
    otpExpires: { type: Date, required: false }, // เวลาหมดอายุของ OTP
    isVerified: { type: Boolean, default: false } // สถานะยืนยันบัญชี
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);