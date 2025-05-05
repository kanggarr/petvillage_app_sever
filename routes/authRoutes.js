// example
const express = require('express');
const router = express.Router();

const { 
  register, 
  login,
  refreshToken
} = require('../controllers/authController');

// Public routes (ไม่ต้องการ authentication)
router.post('/register', register);
router.post('/login', login);
router.post('/refreshtoken', refreshToken);


module.exports = router;