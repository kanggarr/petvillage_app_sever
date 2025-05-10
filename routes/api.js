// routes/api.js - Root level router
const express = require('express');
const router = express.Router();

// Sub-routes
// router.use('/users', validateToken, require('./userRoutes'));
router.use('/auth', require('./authRoutes'));
router.use('/user',require('./userRoutes'));
router.use('/pet',require('./petRoutes'));
router.use('/blog', require('./blogRoutes'));

module.exports = router;