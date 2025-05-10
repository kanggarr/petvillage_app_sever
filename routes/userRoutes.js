const express = require('express');
const router = express.Router();
const { validateUserPermission } = require("../middleware/userMidleware");
const { test } = require('../controllers/userController');

/**
 * @route GET /api/user/test
 * @desc Test endpoint (protected)
 * @access Private - Requires authentication
 */
router.get('/test', validateUserPermission, test);

/**
 * Example of how to create additional protected routes
 * All routes below this middleware will require authentication
 */
// router.use(validateUserPermission);
// router.get('/profile', getUserProfile);
// router.put('/profile', updateUserProfile);

module.exports = router;