const User = require('../models/user');
const bcrypt = require('bcryptjs');

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id)

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server error" });
  }
};

const test = async (req, res) => {
    return res.json({msg:"hello"})
  };


const updateUser = async (req, res) => {
  try {
    const { username } = req.params;
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { username },
      { new: true, runValidators: true }
    );

    if (!updatedUser) return res.status(404).json({ msg: "User not found" });

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.userId);
    res.json({ msg: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};


const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    let user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "User not found" });

    if (user.isVerified) return res.status(400).json({ msg: "User already verified" });

    if (!user.otp || user.otp !== otp || new Date() > user.otpExpires) {
      return res.status(400).json({ msg: "Invalid or expired OTP" });
    }

    // อัปเดตสถานะบัญชีเป็น "Verified"
    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    res.json({ msg: "Email verified successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    let user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "User not found" });

    if (user.isVerified) return res.status(400).json({ msg: "User already verified" });

    // สร้าง OTP ใหม่
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // หมดอายุใน 5 นาที
    await user.save();

    // ส่ง OTP ใหม่ไปยังอีเมล
    await sendOtp(email, otp);

    res.json({ msg: "New OTP sent successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};



module.exports = {
  test
};