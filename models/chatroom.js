const mongoose = require('mongoose');

const { Schema, Types } = mongoose;

const chatRoomSchema = new Schema({

    roomName: {
        type: String,
        required: true,
        trim: true
    },

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },

    createdAt: {
        type: Date,
        default: Date.now
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Chatroom', chatRoomSchema);
