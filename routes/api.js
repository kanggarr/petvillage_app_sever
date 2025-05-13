// routes/api.js - Root level router
const express = require('express');
const router = express.Router();

// Sub-routes
// router.use('/users', validateToken, require('./userRoutes'));
router.use('/auth', require('./authRoutes'));
router.use('/user',require('./userRoutes'));
router.use('/pet',require('./petRoutes'));
router.use('/blog', require('./blogRoutes'));
router.use('/shop', require('./shopRoutes'));
router.use('/filter', require('./filterRoutes'));
router.use('/message', require('./messageRoutes'));
router.use('/favorites', require('./favoriteRoutes'));

module.exports = router;