const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ตรวจสอบว่ามีโฟลเดอร์ uploads/businessLicenses แล้วหรือยัง ถ้าไม่มีก็สร้าง
const uploadDir = path.join(__dirname, '..', 'uploads', 'businessLicenses');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// กำหนดการจัดเก็บไฟล์
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// ตรวจสอบประเภทไฟล์
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('รองรับเฉพาะไฟล์ .jpg, .jpeg, .png เท่านั้น'), false);
  }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
