const Message = require('../models/messages');
const Chatroom = require('../models/chatroom');
const User = require('../models/user');
const Shop = require('../models/shop');
const mongoose = require('mongoose');

/**
 * Initialize Socket.IO handlers
 * Call this function in your server.js after setting up Socket.IO
 * @param {SocketIO.Server} io - Socket.IO server instance
 */
const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    // Handle authentication
    socket.on('authenticate', (token) => {
      socket.authenticated = true;
    });

    // Handle joining a room
    socket.on('joinRoom', (roomId) => {
      if (!socket.authenticated) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }
      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        socket.emit('error', { message: 'Invalid roomId' });
        return;
      }
      socket.join(roomId);
      socket.emit('joinedRoom', { roomId });
    });

    // Handle leaving a room
    socket.on('leaveRoom', (roomId) => {
      if (!socket.authenticated) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }
      socket.leave(roomId);
    });

    // Handle typing events
    socket.on('typing', (roomId) => {
      if (!socket.authenticated || !mongoose.Types.ObjectId.isValid(roomId)) {
        return;
      }
      socket.to(roomId).emit('typing', { userId: socket.id, roomId });
    });

    socket.on('stopTyping', (roomId) => {
      if (!socket.authenticated || !mongoose.Types.ObjectId.isValid(roomId)) {
        return;
      }
      socket.to(roomId).emit('stopTyping', { roomId });
    });

    // Handle chat message
    socket.on('chatMessage', ({ roomId, message }) => {
      if (!socket.authenticated || !mongoose.Types.ObjectId.isValid(roomId)) {
        return;
      }
      console.log(`Emitting newMessage to room ${roomId}:`, message);
      io.to(roomId).emit('newMessage', { roomId, message });
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

/**
 * Get messages for a specific chat room with pagination
 */
const getMessagesRoomByUser = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ error: 'Invalid roomId format' });
    }

    const roomObjectId = new mongoose.Types.ObjectId(roomId);

    const messages = await Message.find({ roomId: roomObjectId })
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('sender', 'username');

    const { userId } = req.query;
    if (userId) {
      const messageIds = messages.map(msg => msg._id);
      await Message.updateMany(
        { _id: { $in: messageIds } },
        { $addToSet: { readBy: userId } }
      );
    }

    res.json(messages.reverse());
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Create a new message in a chat room
 */
const createMessage = async (req, res) => {
  try {
    const { roomId, sender, senderType, content, attachments } = req.body;

    if (!roomId || !sender || !senderType || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ error: 'Invalid roomId format' });
    }

    const roomObjectId = new mongoose.Types.ObjectId(roomId);

    const chatroom = await Chatroom.findById(roomObjectId);
    if (!chatroom) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    const messageData = {
      roomId: roomObjectId,
      sender,
      senderType,
      content,
      readBy: [{ userId: sender, readAt: new Date() }],
    };

    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      messageData.attachments = attachments;
    }

    const newMessage = new Message(messageData);
    const saved = await newMessage.save();

    await Chatroom.findByIdAndUpdate(roomObjectId, { lastMessage: saved._id, updatedAt: Date.now() });

    const populatedMessage = await Message.findById(saved._id).populate('sender', 'username');

    if (req.app.get('io')) {
      const io = req.app.get('io');
      console.log(`Emitting newMessage to room ${roomId}:`, populatedMessage);
      io.to(roomId).emit('newMessage', { roomId, message: populatedMessage });
    }

    res.status(201).json(populatedMessage);
  } catch (err) {
    console.error('Error creating message:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get the latest message from a specific chat room
 */
const getLatestMessageByRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ error: 'Invalid roomId format' });
    }

    const roomObjectId = new mongoose.Types.ObjectId(roomId);

    const latest = await Message.findOne({ roomId: roomObjectId })
      .sort({ timestamp: -1 })
      .populate('sender', 'username');

    res.json(latest || { message: 'No messages found' });
  } catch (err) {
    console.error('Error fetching latest message:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Create a new chat room between a user and a shop
 */
const createChatRoom = async (req, res) => {
  console.log('Creating chat room...');
  try {
    const { shopId, roomName } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      console.log('Missing user ID');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!shopId) {
      console.log('Missing shopId');
      return res.status(400).json({ error: 'shopId is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(shopId)) {
      console.log('Invalid shopId');
      return res.status(400).json({ error: 'Invalid shopId' });
    }

    const shop = await User.findById(shopId);
    if (!shop) {
      console.log('User not found');
      return res.status(404).json({ error: 'User not found' });
    }
    if (shop.role !== 'shop') {
      console.log('User is not a shop');
      return res.status(404).json({ error: 'Shop not found' });
    }

    const existingRoom = await Chatroom.findOne({
      user: userId,
      shop: shopId,
    });

    if (existingRoom) {
      console.log('Existing chat room found:', existingRoom._id);
      return res.status(200).json({
        message: 'Chat room already exists',
        chatroom: {
          _id: existingRoom._id,
          roomName: existingRoom.roomName,
          user: existingRoom.user,
          shop: existingRoom.shop,
          lastMessage: existingRoom.lastMessage,
          createdAt: existingRoom.createdAt,
          updatedAt: existingRoom.updatedAt,
        },
      });
    }

    const newRoom = new Chatroom({
      roomName: roomName || `Chat with ${shop.username}`,
      user: userId,
      shop: shopId,
    });

    await newRoom.save();

    const populatedRoom = await Chatroom.findById(newRoom._id)
      .populate('user', 'username email')
      .populate('shop', 'username email');

    const welcomeMessage = new Message({
      roomId: newRoom._id,
      sender: 'system',
      senderType: 'User',
      content: 'Welcome to your new conversation! You can now start chatting.',
    });

    await welcomeMessage.save();

    newRoom.lastMessage = welcomeMessage._id;
    newRoom.updatedAt = new Date();
    await newRoom.save();

    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(newRoom._id.toString()).emit('newRoom', {
        room: {
          _id: populatedRoom._id,
          roomName: populatedRoom.roomName,
          user: populatedRoom.user,
          shop: populatedRoom.shop,
          lastMessage: populatedRoom.lastMessage,
          createdAt: populatedRoom.createdAt,
          updatedAt: populatedRoom.updatedAt,
        },
      });
    }

    console.log('Chat room created successfully');
    return res.status(201).json({
      message: 'Chat room created successfully',
      chatroom: {
        _id: populatedRoom._id,
        roomName: populatedRoom.roomName,
        user: populatedRoom.user,
        shop: populatedRoom.shop,
        lastMessage: populatedRoom.lastMessage,
        createdAt: populatedRoom.createdAt,
        updatedAt: populatedRoom.updatedAt,
      },
    });
  } catch (err) {
    console.error('Error creating chat room:', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
};

/**
 * Get all chat rooms for a specific user with latest messages
 */
const getChatRoomByUser = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid userId' });
    }

    const rooms = await Chatroom.find({ user: userId })
      .populate({ path: 'user', select: 'username id profileImage' })
      .populate({ path: 'shop', select: 'username id profileImage' })
      .sort({ updatedAt: -1 });

    const roomsWithLatestMessage = await Promise.all(rooms.map(async (room) => {
      const latestMessage = await Message.findOne({ roomId: room._id })
        .sort({ timestamp: -1 })
        .limit(1)
        .populate('sender', 'username');

      const unreadCount = await Message.countDocuments({
        roomId: room._id,
        sender: { $ne: userId },
        readBy: { $ne: userId },
      });

      return {
        _id: room._id,
        roomName: room.roomName,
        user: room.user,
        shop: room.shop,
        lastMessage: latestMessage || null,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
        unreadCount,
      };
    }));

    res.json(roomsWithLatestMessage);
  } catch (err) {
    console.error('Error getting user chat rooms:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get all chat rooms for a specific shop with latest messages
 */
const getChatRoomByShop = async (req, res) => {
  try {
    const { shopId } = req.query;

    if (!shopId) {
      return res.status(400).json({ error: 'shopId is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(shopId)) {
      return res.status(400).json({ error: 'Invalid shopId' });
    }

    const rooms = await Chatroom.find({ shop: shopId })
      .populate({ path: 'user', select: 'username id profileImage' })
      .populate({ path: 'shop', select: 'username id profileImage' })
      .sort({ updatedAt: -1 });

    const roomsWithLatestMessage = await Promise.all(rooms.map(async (room) => {
      const latestMessage = await Message.findOne({ roomId: room._id })
        .sort({ timestamp: -1 })
        .limit(1)
        .populate('sender', 'username');

      const unreadCount = await Message.countDocuments({
        roomId: room._id,
        sender: { $ne: shopId },
        readBy: { $ne: shopId },
      });

      return {
        _id: room._id,
        roomName: room.roomName,
        user: room.user,
        shop: room.shop,
        lastMessage: latestMessage || null,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
        unreadCount,
      };
    }));

    res.json(roomsWithLatestMessage);
  } catch (err) {
    console.error('Error getting shop chat rooms:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Mark messages as read
 */
const markMessagesAsRead = async (req, res) => {
  try {
    const { roomId, userId } = req.body;

    if (!roomId || !userId) {
      return res.status(400).json({ error: 'roomId and userId are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ error: 'Invalid roomId' });
    }

    await Message.updateMany(
      {
        roomId,
        'readBy.userId': { $ne: userId },
      },
      {
        $addToSet: { readBy: { userId: userId, readAt: new Date() } },
      }
    );

    res.json({ success: true, message: 'Messages marked as read' });
  } catch (err) {
    console.error('Error marking messages as read:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Delete a message (soft delete)
 */
const deleteMessage = async (req, res) => {
  try {
    const { messageId, userId } = req.body;

    if (!messageId) {
      return res.status(400).json({ error: 'messageId is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ error: 'Invalid messageId' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.sender.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }

    message.content = 'This message was deleted';
    message.isDeleted = true;
    await message.save();

    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(message.roomId.toString()).emit('messageDeleted', { messageId });
    }

    res.json({ success: true, message: 'Message deleted' });
  } catch (err) {
    console.error('Error deleting message:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get all chat rooms for the current user or shop
 */
const getUserChats = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // ดึงข้อมูล chat rooms พร้อม populate
    const rooms = await Chatroom.find({
      $or: [{ user: userId }, { shop: userId }],
    })
      .populate({
        path: 'user',
        select: 'username email profileImage',
        options: { lean: true }, // ใช้ lean ใน populate
      })
      .populate({
        path: 'shop',
        select: 'username email profileImage',
        options: { lean: true },
      })
      .populate({
        path: 'lastMessage',
        select: 'content sender createdAt',
        populate: { path: 'sender', select: 'username', options: { lean: true } },
        options: { lean: true },
      })
      .sort({ updatedAt: -1 })
      .lean();

    // คำนวณ unreadCount
    const roomIds = rooms.map(r => r._id);
    const unreadAgg = await Message.aggregate([
      {
        $match: {
          roomId: { $in: roomIds.map(id => new mongoose.Types.ObjectId(id)) },
          sender: { $ne: new mongoose.Types.ObjectId(userId) }, // ข้อความที่ไม่ใช่ของผู้ใช้
          'readBy.userId': { $ne: new mongoose.Types.ObjectId(userId) }, // ยังไม่ได้อ่าน
        },
      },
      {
        $group: {
          _id: '$roomId',
          count: { $sum: 1 },
        },
      },
    ]);

    const unreadMap = unreadAgg.reduce((acc, { _id, count }) => {
      acc[_id.toString()] = count;
      return acc;
    }, {});

    // สร้าง JSON response พร้อม fallback สำหรับ null
    const result = rooms.map(room => ({
      _id: room._id ? room._id.toString() : '', // ป้องกัน _id เป็น null
      roomName: room.roomName || '', // fallback ถ้า roomName เป็น null
      user: room.user
        ? {
          _id: room.user._id ? room.user._id.toString() : '',
          username: room.user.username || '',
          email: room.user.email || '',
          profileImage: room.user.profileImage || null,
        }
        : { _id: '', username: '', email: '', profileImage: null }, // fallback ถ้า user เป็น null
      shop: room.shop
        ? {
          _id: room.shop._id ? room.shop._id.toString() : '',
          username: room.shop.username || '',
          email: room.shop.email || '',
          profileImage: room.shop.profileImage || null,
        }
        : { _id: '', username: '', email: '', profileImage: null }, // fallback ถ้า shop เป็น null
      lastMessage: room.lastMessage
        ? {
          _id: room.lastMessage._id ? room.lastMessage._id.toString() : '',
          content: room.lastMessage.content || '',
          sender: room.lastMessage.sender
            ? {
              _id: room.lastMessage.sender._id ? room.lastMessage.sender._id.toString() : '',
              username: room.lastMessage.sender.username || '',
            }
            : { _id: '', username: '' },
          createdAt: room.lastMessage.createdAt || new Date().toISOString(),
        }
        : null,
      createdAt: room.createdAt ? room.createdAt.toISOString() : new Date().toISOString(), // fallback
      updatedAt: room.updatedAt ? room.updatedAt.toISOString() : new Date().toISOString(), // fallback
      unreadCount: unreadMap[room._id.toString()] || 0,
    }));

    return res.json(result);
  } catch (err) {
    console.error('Error fetching user chats:', err);
    return res.status(500).json({ error: 'Failed to fetch chat rooms', details: err.message });
  }
};
/**
 * Get messages for a specific chat room
 */
const getRoomMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ error: 'Invalid roomId format' });
    }

    const room = await Chatroom.findOne({
      _id: roomId,
      $or: [{ user: userId }, { shop: userId }],
    });

    if (!room) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    const messages = await Message.find({ roomId: roomId })
      .sort({ timestamp: 1 })
      .populate('sender', 'username');

    console.log('messages : ', messages);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching room messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};



module.exports = {
  getUserChats,
  getRoomMessages,
  getMessagesRoomByUser,
  createMessage,
  getLatestMessageByRoom,
  createChatRoom,
  getChatRoomByUser,
  getChatRoomByShop,
  markMessagesAsRead,
  deleteMessage,
  sendMessage,
  initializeSocket,
};