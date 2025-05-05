// example

const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
// const sendOtp = require('../utils/sendOtp');

const register = async (req, res) => {
  try {
    //  Validate req body
    if (!req.body) {
      return res.status(400).json({ msg: "กรุณากรอกข้อมูล" });
    }

    const { username, email, password } = req.body;

    // Validate req body field
    if (!username?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ msg: "กรุณากรอกข้อมูลให้ครบถ้วน (username, email, password)" });
    }


    // เช็คอีเมล
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.(com|org|net|info|biz|edu|tech|travel|shop|news|co|io|ai|ac|gov|th|uk|us|jp|au|cn|in|co\.th|ac\.th|go\.th|or\.th|net\.th|in\.th)$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ msg: "รูปแบบอีเมลไม่ถูกต้องหรือโดเมนไม่รองรับ" });
    }

    let user = await User.findOne({ username });

    if (user) {
      return res.status(400).json({ msg: "ชื่อผู้ใช้งานนี้ถูกใช้งานแล้ว" });
    }

    // ตรวจสอบว่าอีเมลนี้มีอยู่แล้วหรือไม่
    user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({ msg: "อีเมลนี้ถูกใช้งานแล้ว" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    // const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 นาที

    user = new User({
      username,
      email,
      password: hashedPassword,
      otp: null,
      otpExpires: null,
      isVerified: false
    });

    await user.save();
    // await sendOtp(email, otp);

    // res.status(201).json({
    //   msg: "OTP sent. Please verify your email.",
    //   email: user.email,       // ส่ง email กลับให้ frontend ไว้ใช้แสดงหรือยืนยัน
    //   otpExpires: otpExpires   // อาจส่งเวลากำหนดหมดอายุด้วยก็ได้
    // });
    return res.json({ msg: "สร้างผู้ใช้งานสำเร็จ" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};







const login = async (req, res) => {
  try {

    const { email, password } = req.body;

    //validate input
    if (!email?.trim() || !password?.trim()) {
      res.status(400);
      return res.status(400).json({ msg: "กรุณากรอกอีเมลและรหัสผ่าน" });
    }
    // validate user
    const user = await User.findOne({ email });

    if (!user) {
      res.status(404);
      return res.status(400).json({ msg: "ไม่พบบัญชีที่อยู่อีเมลนี้" });
    }

    //compare password with hashedpassword
    if (user && (await bcrypt.compare(password, user.password))) {
      const accessToken = jwt.sign({
        user: {
          username: user.username,
          email: user.email,
          id: user.id,
          role:user.role
        }
      },
        process.env.TOKEN_SECRET,
        { expiresIn: "10m" }
      );
      const refreshToken = jwt.sign({
          user: {
              id: user.id,
              role:"refresh"
          }}, 
      process.env.TOKEN_SECRET,
      { expiresIn: "1d" }
      );
      return res.json({ token: accessToken,refreshToken:refreshToken});
    } else {
      return res.status(401).json({ msg: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }
  } catch (error) {
    console.error("พบปัญหาในการเข้าสู่ระบบ :", error);
    res.status(500).json({ error: error.message });
  }
};





module.exports = {
  register,
  login,
};