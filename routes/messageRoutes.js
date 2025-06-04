const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticate } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticate);

// Chat room routes
router.get('/userchats', messageController.getUserChats); // Get all chat rooms for current user
router.post('/newChat', messageController.createChatRoom); // Create a new chat room

// Message routes
router.get('/room/:roomId', messageController.getRoomMessages); // Get messages for a room
router.post('/send', messageController.sendMessage); // Send a new message

// Deprecated/legacy routes (keep for backward compatibility)
router.get('/latest/:roomId', messageController.getLatestMessageByRoom);
router.post('/read', messageController.markMessagesAsRead);
router.post('/delete', messageController.deleteMessage);

module.exports = router;
