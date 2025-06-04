const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chatroom',
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'senderType', // Dynamically reference User or Shop based on senderType
    required: true,
  },
  senderType: {
    type: String,
    required: true,
    enum: ['User', 'Shop'],
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  readBy: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      readAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  attachments: [
    {
      type: String,
      url: String,
      fileType: String,
    },
  ],
});

messageSchema.index({ roomId: 1, timestamp: -1 });

module.exports = mongoose.model('Message', messageSchema);