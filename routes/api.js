
// routes/api.js - Root level router
const express = require('express');
const router = express.Router();
const validateToken = require('../middleware/validateToken');

// Sub-routes
// router.use('/users', validateToken, require('./userRoutes'));
router.use('/auth', require('./authRoutes'));

module.exports = router;