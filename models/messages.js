const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  roomId: String,           // <== เพิ่มห้อง
  sender: String,           // shop | customer หรือ user id
  content: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Message', MessageSchema);