// example
const express = require('express');
const router = express.Router();

const { 
  register,
  verifyOTP,
  login,
  refreshToken,
  forgetPassword,
  resetPassword,
  verifyResetOTP,
  resendOTP
} = require('../controllers/authController');

// Public routes (ไม่ต้องการ authentication)
router.post('/register', register);
router.post('/verify', verifyOTP);
router.post('/resend', resendOTP);
router.post('/login', login);
router.post('/refreshtoken', refreshToken);
router.post('/forgotpassword', forgetPassword);
router.post('/verifyReset', verifyResetOTP);
router.post('/resetpassword', resetPassword);


module.exports = router;