const express = require('express');
const router = express.Router();
const { validateUserPermission } = require("../middleware/userMiddleware");
const { test, getCurrentUserProfile, updateUser, updatePassword } = require('../controllers/userController');

/**
 * @route GET /api/user/test
 * @desc Test endpoint (protected)
 * @access Private - Requires authentication
 */
router.get('/test', validateUserPermission, test);

// All routes below this middleware will require authentication
router.use(validateUserPermission);
router.get('/profile', getCurrentUserProfile);
router.put('/update', validateUserPermission, updateUser);
router.put('/password', validateUserPermission, updatePassword);

module.exports = router;