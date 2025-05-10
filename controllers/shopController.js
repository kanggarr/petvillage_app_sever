const Shop = require('../models/shop');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const Province = require('../models/provincemodel');
const District = require('../models/districtmodel');
const Subdistrict = require('../models/subdistrict');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// ตั้งค่าอัปโหลดหลายไฟล์
const upload = multer({ dest: 'temp_uploads/' });
const uploadSingle = upload.single('businessLicense'); // ใช้สำหรับ 1 ไฟล์

const registerShop = async (req, res) => {
  try {
    const file = req.file;
    if (!file)
      return res.status(400).json({ msg: 'กรุณาอัปโหลดใบอนุญาตประกอบการ' });

    const {
      shopName,
      email,
      password,
      address,
      province,
      district,
      subdistrict,
    } = req.body;

    const existing = await Shop.findOne({ email });
    if (existing) return res.status(400).json({ msg: 'อีเมลนี้ถูกใช้งานแล้ว' });

    const provinceData = await Province.findOne({ name_th: req.body.shop_province });
    if (!provinceData) return res.status(400).json({ msg: 'ไม่พบจังหวัดที่ระบุ' });

    const districtData = await District.findOne({ name_th: req.body.shop_district, province_id: provinceData.id });
    if (!districtData) return res.status(400).json({ msg: 'อำเภอไม่สัมพันธ์กับจังหวัดที่เลือก' });

    const subdistrictData = await Subdistrict.findOne({ name_th: req.body.shop_subdistrict, district_id: districtData.id });
    if (!subdistrictData) return res.status(400).json({ msg: 'ตำบลไม่สัมพันธ์กับอำเภอที่เลือก' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const shop = new Shop({
      shopName,
      email,
      password: hashedPassword,
      address,
      shop_province: provinceData._id,
      shop_district: districtData._id,
      shop_subdistrict: subdistrictData._id,
      businessLicense: '', // สำหรับไฟล์เดียว
    });

    await shop.save();

    // สร้างโฟลเดอร์ถ้ายังไม่มี
    const shopDir = path.join(__dirname, '..', 'uploads', shop._id.toString());
    if (!fs.existsSync(shopDir)) fs.mkdirSync(shopDir, { recursive: true });

    // นับจำนวนไฟล์ในโฟลเดอร์
    const existingFiles = fs.readdirSync(shopDir);
    const nextIndex = existingFiles.length + 1; // เช่นมี 2 ไฟล์อยู่แล้ว => pic3

    const ext = path.extname(file.originalname);
    const newFileName = `pic${nextIndex}${ext}`;
    const newPath = path.join(shopDir, newFileName);
    fs.renameSync(file.path, newPath);

    shop.businessLicense = `/uploads/${shop._id}/${newFileName}`;
    await shop.save();

    res.status(201).json({ msg: 'สมัครร้านค้าสำเร็จ', shopId: shop._id });
  } catch (error) {
    res.status(500).json({ msg: 'เกิดข้อผิดพลาด', error: error.message });
  }
};

// เข้าสู่ระบบ
const loginShop = async (req, res) => {
  try {
    const { email, password } = req.body;

    const shop = await Shop.findOne({ email });
    if (!shop) return res.status(400).json({ msg: 'ไม่พบร้านค้านี้' });

    const isMatch = await bcrypt.compare(password, shop.password);
    if (!isMatch) return res.status(401).json({ msg: 'รหัสผ่านไม่ถูกต้อง' });

    const token = jwt.sign({ shopId: shop._id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, shop: { id: shop._id, shopName: shop.shopName, email: shop.email } });
  } catch (error) {
    res.status(500).json({ msg: 'เกิดข้อผิดพลาด', error: error.message });
  }
};

// ดึงข้อมูลร้านจาก token
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
