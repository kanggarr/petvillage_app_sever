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
    const { username } = req.body; // แก้จาก req.params เป็น req.body

    const currentUser = await User.findById(req.user.userId);
    if (!currentUser) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (currentUser.username === username) {
      return res.status(400).json({ msg: "Username must be different from the current one" });
    }

    const existingUser = await User.findOne({
      username,
      _id: { $ne: req.user.userId },
    });

    if (existingUser) {
      return res.status(400).json({ msg: "Username already in use by another user" });
    }

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


const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ msg: "All password fields are required" });
    }

    const user = await User.findById(req.user.userId).select("+password");
    if (!user) return res.status(404).json({ msg: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Current password is incorrect" });
    }

    if (newPassword === currentPassword) {
      return res.status(400).json({ msg: "New password must be different from current password" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ msg: "Passwords do not match" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    res.json({ msg: "Password updated successfully" });
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

const getCurrentUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId)

    if (!user) {
      return res.status(404).json({ msg: 'ไม่พบผู้ใช้งาน' });
    }

    res.json(user);
  } catch (error) {
    console.error("getCurrentUserProfile error:", error);
    res.status(500).json({ msg: 'เกิดข้อผิดพลาดในฝั่งเซิร์ฟเวอร์' });
  }
};



module.exports = {
  test,
  getCurrentUserProfile,
  updateUser,
  updatePassword
};