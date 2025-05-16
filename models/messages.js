const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    trim: true
  },

  sender: {
    type: String,
    required: true,
    trim: true
  },

  senderType: {
    type: String,
    required: true,
    enum: ['User', 'Shop']
  },

  content: {
    type: String,
    required: true,
    trim: true
  },

  timestamp: {
    type: Date,
    default: Date.now
  }
});

messageSchema.index({ roomId: 1, timestamp: -1 });

module.exports = mongoose.model('Message', messageSchema);
