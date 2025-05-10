const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');
// const { validateUserPermission } = require('../middleware/shopMiddleware');

// ✅ ลงทะเบียนร้านค้า พร้อมอัปโหลดไฟล์
router.post(
  '/register',
  shopController.uploadSingle, // middleware อัปโหลดไฟล์
  shopController.registerShop
);

// ✅ เข้าสู่ระบบร้านค้า
router.post('/login', shopController.loginShop);

// ✅ ดึงข้อมูลร้านค้าจาก token (ถ้าใช้ middleware ในอนาคตให้ uncomment validateUserPermission)
router.get('/me', /* validateUserPermission, */ shopController.getCurrentShop);

// ✅ เพิ่มจุดตรวจสอบสถานะและอนุมัติถ้ามี controller (ยังไม่มีใน shopController.js ที่คุณให้มา)
router.get('/status', /* validateUserPermission, */ (req, res) => {
  res.json({ msg: 'ยังไม่ได้เขียน controller สำหรับตรวจสอบสถานะ' });
});

router.put('/approve/:id', /* validateUserPermission, */ (req, res) => {
  res.json({ msg: 'ยังไม่ได้เขียน controller สำหรับการอนุมัติร้านค้า' });
});

module.exports = router;
