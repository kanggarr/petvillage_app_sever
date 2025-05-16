const Message = require('../models/messages');
const User = require('../models/user');     // ✅ ต้อง import
const Shop = require('../models/shop');     // ✅ ต้อง import

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

module.exports = {
  getMessagesRoomByUser,
  createMessage,
  getLatestMessageByRoom
};