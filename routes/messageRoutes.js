const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

router.get('/latest/:roomId', messageController.getLatestMessageByRoom);
router.post('/', messageController.createMessage);
router.post('/newChat', messageController.createChatRoom);
router.get('/userchats', messageController.getChatRoomByUser);
router.get('/shopchats', messageController.getChatRoomByShop);
module.exports = router;
