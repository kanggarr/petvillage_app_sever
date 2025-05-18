const Message = require('../models/messages');
const Chatroom = require('../models/chatroom'); // ✅ ต้อง import
const User = require('../models/user');     // ✅ ต้อง import
const Shop = require('../models/shop');     // ✅ ต้อง import
const mongoose = require('mongoose');
const { login } = require('./authController');
const getMessagesRoomByUser = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const messages = await Message.find({ roomId })
      .sort({ timestamp: -1 }) // ดึงล่าสุดก่อน
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json(messages.reverse()); // กลับลำดับให้เก่าสุดอยู่ล่าง
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const createMessage = async (req, res) => {
  try {
    const { roomId, sender, senderType, content } = req.body;

    if (!roomId || !sender || !senderType || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // ตรวจสอบ sender ว่ามีอยู่ในระบบไหม
    if (senderType === 'User') {
      const user = await User.findOne({ username: sender });
      if (!user) return res.status(400).json({ error: 'User not found' });
    } else if (senderType === 'Shop') {
      const shop = await Shop.findOne({ shopName: sender });
      if (!shop) return res.status(400).json({ error: 'Shop not found' });
    } else {
      return res.status(400).json({ error: 'Invalid senderType' });
    }

    const newMessage = new Message({ roomId, sender, senderType, content });
    const saved = await newMessage.save();

    res.status(201).json(saved);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};


const getLatestMessageByRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const latest = await Message.findOne({ roomId })
      .sort({ timestamp: -1 });

    res.json(latest);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};


const createChatRoom = async (req, res) => {
  try {
    const { userId, shopId } = req.body;

    // 🔍 Validate input
    if (!userId || !shopId) {
      return res.status(400).json({ error: 'userId and shopId are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid userId' });
    }

    if (!mongoose.Types.ObjectId.isValid(shopId)) {
      return res.status(400).json({ error: 'Invalid shopId' });
    }

    // ✅ ตรวจสอบว่าผู้ใช้และร้านค้ามีอยู่ในระบบหรือไม่
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const shop = await User.findById(shopId);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    // 🔁 ตรวจสอบว่าห้องแชทนี้มีอยู่แล้วหรือยัง
    const result = await Chatroom.findOne({
      user: new mongoose.Types.ObjectId(userId),
      shop: new mongoose.Types.ObjectId(shopId)
    });

    if (result) {
      return res.status(400).json({ error: 'Chat room already exists' });
    }



    // 🆕 สร้างห้องแชทใหม่
    const newRoom = new Chatroom({
      roomName: 'New Chat',
      user,
      shop
    });

    await newRoom.save();

    return res.status(201).json(newRoom);
  } catch (err) {
    console.error('Error creating chat room:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

const getChatRoomByUser = async (req, res) => {
  try {
    const { userId } = req.query;

    // ตรวจสอบว่า userId ถูกส่งมาหรือไม่
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // ตรวจสอบว่า userId เป็น ObjectId ที่ valid หรือไม่
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid userId' });
    }

    const rooms = await Chatroom.find({ user: userId })
      .populate({path: 'user', select: 'username id'})
      .populate({path: 'shop', select: 'username id'}) // เติมข้อมูลร้านค้า
      .sort({ updatedAt: -1 });

    res.json(rooms);
  } catch (err) {
    console.error('getChatRoomByUser error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ดึงห้องแชททั้งหมดของร้านค้า
const getChatRoomByShop = async (req, res) => {
  try {
    const { shopId } = req.query;

    // ตรวจสอบว่า shopId ถูกส่งมาหรือไม่
    if (!shopId) {
      return res.status(400).json({ error: 'shopId is required' });
    }

    // ตรวจสอบว่า shopId เป็น ObjectId ที่ valid หรือไม่
    if (!mongoose.Types.ObjectId.isValid(shopId)) {
      return res.status(400).json({ error: 'Invalid shopId' });
    }

    const rooms = await Chatroom.find({ shop: shopId })
      .populate({path: 'user', select: 'username id'})
      .populate({path: 'shop', select: 'username id'}) // เติมข้อมูลร้านค้า
      .sort({ updatedAt: -1 });

    res.json(rooms);
  } catch (err) {
    console.error('getChatRoomByShop error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getMessagesRoomByUser,
  createMessage,
  getLatestMessageByRoom,
  createChatRoom,
  getChatRoomByUser,
  getChatRoomByShop
};