require('dotenv').config();
const User = require('../models/user');
const Shop = require('../models/shop');
const Province = require('../models/provincemodel');
const District = require('../models/districtmodel');
const Subdistrict = require('../models/subdistrict');
const TempUser = require('../models/tempuser');
const ForgetPassword = require('../models/forgetpassword');
const resetOTP = require('../models/resetOTP');
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const multer = require('multer');
const path = require('path');
const { log } = require('console');
const mongoose = require('mongoose');



// Multer สำหรับอัปโหลดไฟล์
const storage = multer.diskStorage({
  // โฟลเดอร์ปลายทาง
  destination: (req, file, cb) => {
    cb(null, 'uploads/businessLicense/');
  },
  // สร้างชื่อไฟล์ พร้อมต่อ .extension
  filename: (req, file, cb) => {
    // เอานามสกุลจากไฟล์ต้นฉบับ
    const ext = path.extname(file.originalname); // เช่น '.jpg'
    // ตั้งชื่อไฟล์: fieldname-timestamp.ext
    const filename = `${file.fieldname}-${Date.now()}${ext}`;
    cb(null, filename);
  },
});


const imageFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};

const upload = multer({ storage })

const uploadSingle = upload.single('businessLicense');



// 📤 Email sender setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ msg: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ msg: "อีเมลไม่ถูกต้อง" });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ msg: "มีผู้ใช้งานหรืออีเมลนี้อยู่แล้ว" });
    }

    // ล้าง temp เดิมถ้ามี
    await TempUser.deleteMany({ email });

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 นาที

    const tempUser = new TempUser({
      username,
      email,
      password: hashedPassword,
      otp,
      otpExpires,
    });

    await tempUser.save();

    const mailOptions = {
      from: `" [Pet Village] - ระบบยืนยันอีเมล (Pet Village Verification)" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Pet Village: รหัสเพื่อยืนยันอีเมลสำหรับการลงทะเบียน",
      html: `
        <p>เรียน คุณ <b>${username}</b>,</p>
        <p>&nbsp; &nbsp; &nbsp;ตามที่ท่านได้ระบุอีเมลเพื่อใช้ลงทะเบียนบัญชี Pet Village
        <br><br> โปรดนำรหัส (OTP) ด้านล่างนี้เพื่อยืนยันอีเมลของคุณ (รหัสนี้จะหมดอายุใน <b>5 นาที</b>)</p>
        <h3>&nbsp; &nbsp; &nbsp;รหัส (OTP) คือ ${otp}</h3> <br>
        <p>หากท่านมีข้อสงสัย กรุณาติดต่อเราที่ contact@pet_village.com หรือหมายเลขโทรศัพท์ 02-339-4200</p>
      `
    };



    //  email sender
    if (Boolean(process.env.ENABLE_EMAIL)) {

      await transporter.sendMail(mailOptions);

    }



    return res.status(200).json({ msg: "ส่งรหัส OTP ไปยังอีเมลแล้ว กรุณายืนยัน" });

  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการลงทะเบียน:", error);
    return res.status(500).json({ msg: "Server error" });
  }
};

const registerShop = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {

    // 1. ดึง input parameters
    const {
      shopName,
      email,
      password,
      address,
      shop_province,
      shop_district,
      shop_subdistrict
    } = req.body;
    const file = req.file;

    // 2. validate input
    if (
      !shopName?.trim() ||
      !email?.trim() ||
      !password?.trim() ||
      !address?.trim() ||
      !shop_province?.trim() ||
      !shop_district?.trim() ||
      !shop_subdistrict?.trim() ||
      !file
    ) {
      return res
        .status(400)
        .json({ msg: 'กรุณากรอกข้อมูลและอัปโหลดไฟล์ให้ครบถ้วน' });
    }

    const emailRegex =
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ msg: 'อีเมลไม่ถูกต้อง' });
    }

    // 3. เช็คซ้ำ email หรือ shopName
    const existingUser = await User.findOne({
      $or: [{ email }, { username: shopName }],
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ msg: 'มีผู้ใช้งานหรือชื่อร้านค้านี้อยู่แล้ว' });
    }

    const province = await Province.findOne({ name_th: shop_province });
    if (!province) {
      return res.status(400).json({ msg: 'ไม่พบจังหวัดนี้' });
    }
    const district = await District.findOne({ name_th: shop_district });
    if (!district) {
      return res.status(400).json({ msg: 'ไม่พบอำเภอนี้' });
    }
    const subdistrict = await Subdistrict.findOne({ name_th: shop_subdistrict });
    if (!subdistrict) {
      return res.status(400).json({ msg: 'ไม่พบตำบลนี้' });
    }

    // 4. แฮชพาสเวิร์ด
    const hashedPassword = await bcrypt.hash(password, 10);

    // 2. สร้าง User ใน transaction
    const newUser = await User.create([{
      username: shopName,
      email,
      password: hashedPassword,
      isVerified: false,
      role: 'shop',
    }], { session });

    // 3. สร้าง Shop ใน transaction
    await Shop.create([{
      owner: newUser[0]._id,
      shopName,
      email,
      address,
      shop_province: province,
      shop_district: district,
      shop_subdistrict: subdistrict,
      businessLicensePath: file.path,
      isApproved: false,
    }], { session });

    // 4. commit ถ้าทุกอย่างผ่าน
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      msg: 'สมัครร้านค้าเรียบร้อยแล้ว กรุณารอการอนุมัติจากแอดมิน',
    });
  } catch (err) {
    // ถ้ามี error ให้ abort transaction
    await session.abortTransaction();
    session.endSession();
    console.error('เกิดข้อผิดพลาดในการสมัครร้าน:', err);
    return res.status(500).json({ msg: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์' });
  }
};


const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email?.trim() || !otp?.trim()) {
      return res.status(400).json({ msg: "กรุณาระบุอีเมลและ OTP" });
    }

    const tempUser = await TempUser.findOne({ email });
    if (!tempUser) {
      return res.status(404).json({ msg: "ไม่พบข้อมูลที่รอยืนยัน" });
    }

    if (tempUser.otp !== otp) {
      return res.status(400).json({ msg: "OTP ไม่ถูกต้อง" });
    }

    if (tempUser.otpExpires < new Date()) {
      await TempUser.deleteOne({ email });
      return res.status(400).json({ msg: "OTP หมดอายุ" });
    }

    // สร้าง user จริง
    const newUser = new User({
      username: tempUser.username,
      email: tempUser.email,
      password: tempUser.password,
      isVerified: true,
      role: 'user'
    });

    await newUser.save();
    await TempUser.deleteOne({ email });

    return res.status(201).json({ msg: "ยืนยันสำเร็จ ลงทะเบียนเรียบร้อยแล้ว" });

  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการยืนยัน OTP:", error);
    return res.status(500).json({ msg: "Server error" });
  }
};

const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const tempUser = await TempUser.findOne({ email });
    if (!tempUser) return res.status(404).json({ msg: "ไม่พบบัญชีที่รอยืนยัน" });

    // สร้าง OTP ใหม่
    const newOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const newExpiry = new Date(Date.now() + 5 * 60 * 1000);

    tempUser.otp = newOTP;
    tempUser.otpExpires = newExpiry;
    await tempUser.save();

    const mailOptions = {
      from: `"ระบบยืนยันอีเมล" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "รหัส OTP ใหม่",
      html: `
        <p>รหัส OTP ใหม่ของคุณคือ:</p>
        <h2>${newOTP}</h2>
        <p>รหัสจะหมดอายุใน 5 นาที</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ msg: "ส่งรหัส OTP ใหม่แล้ว" });
  } catch (err) {
    console.error("เกิดข้อผิดพลาดในการส่ง OTP ใหม่:", err);
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
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      res.status(404);
      return res.status(400).json({ msg: "ไม่พบบัญชีที่อยู่อีเมลนี้" });
    }



    //compare password with hashedpassword
    if (user && (await bcrypt.compare(password, user.password))) {
      if (user.role == 'shop' && !user.isVerified) {
        return res.status(403).json({ msg: "บัญชีร้านค้าของคุณยังไม่ได้รับการอนุมัติจากแอดมิน" });
      }
      const accessToken = jwt.sign({
        user: {
          username: user.username,
          email: user.email,
          id: user.id,
          role: user.role
        }
      },
        process.env.TOKEN_SECRET,
        { expiresIn: "10m" }
      );
      const refreshToken = jwt.sign({
        user: {
          id: user.id,
          role: "refresh"
        }
      },
        process.env.TOKEN_SECRET,
        { expiresIn: "1d" }
      );
      // ✅ ส่ง user object (ตัด password) และ roomId กลับไปให้ client
      const userResponse = {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      };

      return res.status(200).json({
        msg: "เข้าสู่ระบบสำเร็จ",
        token: accessToken,
        refreshToken: refreshToken,
        user: userResponse,
        roomId: user.roomId, // 🟢 ต้องแน่ใจว่า user มี field ชื่อ roomId
      });
    } else {
      return res.status(401).json({ msg: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }
  } catch (error) {
    console.error("พบปัญหาในการเข้าสู่ระบบ :", error);
    res.status(500).json({ error: error.message });
  }
};

const refreshToken = async (req, res) => {
  try {

    const { token } = req.body;

    //validate input
    if (!token?.trim()) {
      return res.status(401).json({ msg: "ไม่พบโทเคน" });
    }

    //  Decode token 
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    let id = decoded.user.id

    const user = await User.findById(id)

    const accessToken = jwt.sign({
      user: {
        username: user.username,
        email: user.email,
        id: user.id,
        role: user.role
      }
    },
      process.env.TOKEN_SECRET,
      { expiresIn: "10m" }
    );

    return res.status(200).json({ token: accessToken })

  } catch (error) {
    console.error("พบปัญหาในแลกเปลี่ยนโทเคน :", error);
    res.status(500).json({ error: error.message });
  }
};

const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    await resetOTP.deleteMany({ email });

    await resetOTP.create({ email, otp, otpExpires });

    await transporter.sendMail({
      from: `" [Pet Village] - ระบบยืนยันอีเมล (Pet Village Verification)" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Pet Village: รหัสเพื่อยืนยันอีเมลสำหรับการลืมรหัสผ่าน",
      html: `
        <p>เรียน คุณ <b>${username}</b>,</p>
        <p>&nbsp; &nbsp; &nbsp;ตามที่ท่านได้ระบุอีเมลเพื่อใช้ในการลืมรหัสผ่าน Pet Village
          <br><br> โปรดนำรหัส (OTP) ด้านล่างนี้เพื่อยืนยันอีเมลของคุณ (รหัสนี้จะหมดอายุใน <b>5 นาที</b>)</p>
        <h3>&nbsp; &nbsp; &nbsp;รหัส (OTP) คือ ${otp}</h3> <br>
        <p>หากท่านมีข้อสงสัย กรุณาติดต่อเราที่ contact@pet_village.com หรือหมายเลขโทรศัพท์ 02-339-4200</p>`
    });

    return res.status(200).json({ message: 'ส่ง OTP ไปยังอีเมลของคุณแล้ว' });

  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการขอรีเซ็ตรหัสผ่าน:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// --- VERIFY RESET OTP ---
const verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const entry = await resetOTP.findOne({ email });
    if (!entry) return res.status(404).json({ message: 'ไม่พบ OTP สำหรับอีเมลนี้' });
    if (entry.otp !== otp) return res.status(400).json({ message: 'OTP ไม่ถูกต้อง' });
    if (entry.otpExpires < new Date()) {
      await resetOTP.deleteOne({ email });
      return res.status(400).json({ message: 'OTP หมดอายุ' });
    }

    return res.status(200).json({ message: 'OTP ถูกต้อง ยืนยันสำเร็จ' });

  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการตรวจสอบ OTP:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// --- RESET PASSWORD ---
const resetPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    const entry = await resetOTP.findOne({ email });
    if (!entry) return res.status(404).json({ message: 'กรุณายืนยัน OTP ก่อน' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });

    user.password = await bcrypt.hash(password, 10);
    await user.save();
    await resetOTP.deleteOne({ email });

    res.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' });

  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  register,
  registerShop,
  verifyOTP,
  resendOTP,
  login,
  refreshToken,
  forgetPassword,
  verifyResetOTP,
  resetPassword,
  uploadSingle
};