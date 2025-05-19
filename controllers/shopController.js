const mongoose = require('mongoose');
const Shop = require('../models/shop');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Multer สำหรับอัปโหลดไฟล์
const upload = multer({ dest: 'temp_uploads/' });
const uploadSingle = upload.single('businessLicense');

// Models สำหรับที่อยู่
const Province = require('../models/provincemodel');
const District = require('../models/districtmodel');
const Subdistrict = require('../models/subdistrict');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// ⚠️ TempShop Model สำหรับเก็บข้อมูลร้านที่รออนุมัติจากแอดมิน
const tempShopSchema = new mongoose.Schema({
  shopName: String,
  email: String,
  password: String,
  address: String,
  shop_province: String,
  shop_district: String,
  shop_subdistrict: String,
  businessLicensePath: String
}, { timestamps: true });

const TempShop = mongoose.model('TempShop', tempShopSchema);

// 📩 สมัครร้านค้า (ยังไม่ลง DB หลัก)
const registerShop = async (req, res) => {
  try {
    const { shopName, email, password, address, shop_province, shop_district, shop_subdistrict } = req.body;
    const file = req.file;

    if (!shopName || !email || !password || !address || !shop_province || !shop_district || !shop_subdistrict || !file) {
      return res.status(400).json({ msg: 'กรุณากรอกข้อมูลและอัปโหลดไฟล์ให้ครบถ้วน' });
    }

    const existingShop = await Shop.findOne({ email });
    if (existingShop) {
      return res.status(400).json({ msg: 'อีเมลนี้ถูกใช้งานแล้ว' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 🔍 ค้นหา ObjectId ของจังหวัด / เขต / แขวง
    const provinceDoc = await Province.findOne({ name_th: shop_province });
    const districtDoc = await District.findOne({ name_th: shop_district });
    const subdistrictDoc = await Subdistrict.findOne({ name_th: shop_subdistrict });

    if (!provinceDoc || !districtDoc || !subdistrictDoc) {
      return res.status(400).json({ msg: 'ไม่พบข้อมูลที่อยู่ที่เลือก' });
    }

    const newShop = new Shop({
      shopName,
      email,
      password: hashedPassword,
      address,
      shop_province: provinceDoc._id,
      shop_district: districtDoc._id,
      shop_subdistrict: subdistrictDoc._id,
      businessLicensePath: file.path,
      role : 'shop'
    });

    await newShop.save();

    return res.status(201).json({ msg: 'สร้างบัญชีร้านค้าสำเร็จแล้ว' });

  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการสมัครร้าน:', err);
    return res.status(500).json({ msg: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์' });
  }
};

// 🔑 ล็อกอินร้านค้า
const loginShop = async (req, res) => {
  try {
    const { email, password } = req.body;

    const shop = await Shop.findOne({ email });

    if (!shop) {
      const tempShop = await TempShop.findOne({ email });
      if (tempShop) {
        return res.status(403).json({ msg: 'ร้านค้าของคุณยังไม่ได้รับการอนุมัติจากแอดมิน' });
      }
      return res.status(400).json({ msg: 'ไม่พบร้านค้านี้' });
    }

    const isMatch = await bcrypt.compare(password, shop.password);
    if (!isMatch) return res.status(401).json({ msg: 'รหัสผ่านไม่ถูกต้อง' });

    const token = jwt.sign({ shopId: shop._id, role: 'shop' }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      shop: {
        id: shop._id,
        shopName: shop.shopName,
        email: shop.email
      }
    });

  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการล็อกอิน:', error);
    res.status(500).json({ msg: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์' });
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
  loginShop,
  getCurrentShop,
  uploadSingle
};
