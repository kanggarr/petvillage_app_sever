const express = require('express');
const router = express.Router();

const {
  registerShop,
  loginShop,
  getCurrentShop,
  uploadSingle
} = require('../controllers/shopController');

// Public routes (ไม่ต้องใช้ token)
router.post('/register', uploadSingle, registerShop);  // ส่ง OTP และบันทึก tempShop
router.post('/login', loginShop);                  // เข้าสู่ระบบร้านค้า

// Protected route (ในอนาคตสามารถเพิ่ม middleware auth ได้)
router.get('/me', /* shopAuthMiddleware, */ getCurrentShop); // ดึงข้อมูลร้านจาก token

module.exports = router;
