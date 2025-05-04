// example
const express = require('express');
const router = express.Router();
const { 
  register, 
  resendOtp, 
  getUsers, 
  updateUser, 
  verifyOtp, 
  deleteUser, 
  sayHello 
} = require('../controllers/authController');
// const { protect } = require('../middleware/validateToken');

// Public routes (ไม่ต้องการ authentication)
router.post('/register', register);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.get('/hello', sayHello);

// Protected routes (ต้องการ authentication)
// router.get('/', protect, getUsers);
// router.put('/update', protect, updateUser);
// router.delete('/', protect, deleteUser);

module.exports = router;