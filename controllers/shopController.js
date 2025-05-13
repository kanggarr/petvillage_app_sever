const mongoose = require('mongoose');
const Shop = require('../models/shop');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const nodemailer = require('nodemailer');

// 📌 Multer setup
const upload = multer({ dest: 'temp_uploads/' });
const uploadSingle = upload.single('businessLicense');

//Data
const Province = require('../models/provincemodel');
const District = require('../models/districtmodel');
const Subdistrict = require('../models/subdistrict');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// 📤 Email sender setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// TempShop Schema (inline)
const tempShopSchema = new mongoose.Schema({
  shopName: String,
  email: String,
  password: String,
  address: String,
  shop_province: String,
  shop_district: String,
  shop_subdistrict: String,
  otp: String,
  otpExpires: Date,
}, { timestamps: true });

const TempShop = mongoose.model('TempShop', tempShopSchema);


// 📩 Register Shop (Send OTP)
const registerShop = async (req, res) => {
  try {
    const { shopName, email, password, address, shop_province, shop_district, shop_subdistrict } = req.body;

    if (!shopName || !email || !password || !address || !shop_province || !shop_district || !shop_subdistrict) {
      return res.status(400).json({ msg: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    const existing = await Shop.findOne({ email });
    if (existing) return res.status(400).json({ msg: 'อีเมลนี้ถูกใช้งานแล้ว' });

    await TempShop.deleteMany({ email });

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 นาที

    const tempShop = new TempShop({
      shopName,
      email,
      password: hashedPassword,
      address,
      shop_province,
      shop_district,
      shop_subdistrict,
      otp,
      otpExpires
    });

    await tempShop.save();

    const mailOptions = {
      from: `" [Pet Village] - ระบบยืนยันอีเมล (Pet Village Verification)" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Pet Village: รหัสเพื่อยืนยันอีเมลสำหรับการลงทะเบียนร้านค้า",
      html: `
        <p>เรียน คุณ <b>${shopName}</b>,</p>
        <p>&nbsp; &nbsp; &nbsp;ตามที่ท่านได้ระบุอีเมลเพื่อใช้ลงทะเบียนบัญชีร้านค้า Pet Village
          <br><br> โปรดนำรหัส (OTP) ด้านล่างนี้เพื่อยืนยันอีเมลของคุณ (รหัสนี้จะหมดอายุใน <b>5 นาที</b>)</p>
        <h3>&nbsp; &nbsp; &nbsp;รหัส (OTP) คือ ${otp}</h3> <br>
        <p>หากท่านมีข้อสงสัย กรุณาติดต่อเราที่ contact@pet_village.com หรือหมายเลขโทรศัพท์ 02-339-4200</p>
      `
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ msg: "ส่ง OTP ไปยังอีเมลแล้ว กรุณายืนยัน" });

  } catch (err) {
    console.error("เกิดข้อผิดพลาดในการสมัครร้าน:", err);
    return res.status(500).json({ msg: "Server error" });
  }
};

// 📩 ยืนยัน OTP และบันทึกร้าน + อัปโหลดไฟล์
const verifyShopOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const file = req.file;

    if (!email || !otp || !file) return res.status(400).json({ msg: "กรุณาระบุ OTP และอัปโหลดไฟล์" });

    const tempShop = await TempShop.findOne({ email });
    if (!tempShop) return res.status(404).json({ msg: "ไม่พบบัญชีที่รอยืนยัน" });

    if (tempShop.otp !== otp) return res.status(400).json({ msg: "OTP ไม่ถูกต้อง" });
    if (tempShop.otpExpires < new Date()) {
      await TempShop.deleteOne({ email });
      return res.status(400).json({ msg: "OTP หมดอายุ" });
    }

    const provinceData = await Province.findOne({ name_th: tempShop.shop_province });
    const districtData = await District.findOne({ name_th: tempShop.shop_district, province_id: provinceData.id });
    const subdistrictData = await Subdistrict.findOne({ name_th: tempShop.shop_subdistrict, district_id: districtData.id });

    if (!provinceData || !districtData || !subdistrictData) {
      return res.status(400).json({ msg: 'ข้อมูลที่อยู่ไม่ถูกต้อง' });
    }

    const shop = new Shop({
      shopName: tempShop.shopName,
      email: tempShop.email,
      password: tempShop.password,
      address: tempShop.address,
      shop_province: provinceData._id,
      shop_district: districtData._id,
      shop_subdistrict: subdistrictData._id,
      businessLicense: [],
      status: 'pending',
      role: 'shop'
    });

    await shop.save();

    const shopDir = path.join(__dirname, '..', 'uploads', shop._id.toString());
    if (!fs.existsSync(shopDir)) fs.mkdirSync(shopDir, { recursive: true });

    const ext = path.extname(file.originalname);
    const newFileName = `license${ext}`;
    const newPath = path.join(shopDir, newFileName);
    fs.renameSync(file.path, newPath);

    shop.businessLicense = [`/uploads/${shop._id}/${newFileName}`];
    await shop.save();

    await TempShop.deleteOne({ email });

    return res.status(201).json({ msg: "ยืนยันสำเร็จ ร้านค้าถูกสร้างแล้ว", shopId: shop._id });

  } catch (err) {
    console.error("เกิดข้อผิดพลาดในการยืนยันร้านค้า:", err);
    return res.status(500).json({ msg: "Server error" });
  }
};

// 🔑 เข้าสู่ระบบร้านค้า
const loginShop = async (req, res) => {
  try {
    const { email, password } = req.body;

    const shop = await Shop.findOne({ email });
    if (!shop) return res.status(400).json({ msg: 'ไม่พบร้านค้านี้' });

    const isMatch = await bcrypt.compare(password, shop.password);
    if (!isMatch) return res.status(401).json({ msg: 'รหัสผ่านไม่ถูกต้อง' });

    const token = jwt.sign({ shopId: shop._id, role: 'shop' }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, shop: { id: shop._id, shopName: shop.shopName, email: shop.email } });
  } catch (error) {
    res.status(500).json({ msg: 'เกิดข้อผิดพลาด', error: error.message });
  }
};

// 🔍 ดึงข้อมูลร้านจาก token
const getCurrentShop = async (req, res) => {
  try {
    const shop = await Shop.findById(req.shopId).select('-password');
    if (!shop) return res.status(404).json({ msg: 'ไม่พบร้านค้า' });
    res.json(shop);
  } catch (error) {
    res.status(500).json({ msg: 'เกิดข้อผิดพลาด', error: error.message });
  }
};

module.exports = {
  registerShop,
  verifyShopOTP,
  loginShop,
  getCurrentShop,
  uploadSingle
};
