// routes/api.js - Root level router
const express = require('express');
const router = express.Router();

const { validateUserPermission } = require('../middleware/userMiddleware');

// Sub-routes
// router.use('/users', validateToken, require('./userRoutes'));
router.use('/auth', require('./authRoutes'));
router.use('/users', validateUserPermission, require('./userRoutes'));
router.use('/pet',require('./petRoutes'));
router.use('/blog', require('./blogRoutes'));
router.use('/filter', require('./filterRoutes'));
router.use('/chat', require('./messageRoutes'));
router.use('/favorites', require('./favoriteRoutes'));

module.exports = router;