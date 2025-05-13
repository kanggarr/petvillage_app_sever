const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

router.get('/:roomId', messageController.getMessagesRoomByUser);
router.get('/latest/:roomId', messageController.getLatestMessageByRoom);
router.post('/', messageController.createMessage);

module.exports = router;
