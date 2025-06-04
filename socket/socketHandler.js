const Message = require('../models/messages');
const Chatroom = require('../models/chatroom');
const User = require('../models/user');

/**
 * Socket.IO connection handler for real-time chat functionality
 * @param {Object} io - Socket.IO server instance
 */
module.exports = (io) => {
  console.log('Socket.IO handler initialized');
  
  // Store active users
  const activeUsers = new Map();
  
  io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);
    
    // Handle user authentication and join
    socket.on('authenticate', async ({ userId, userType }) => {
      try {
        console.log(`Authentication attempt - userId: ${userId}, userType: ${userType}`);
        
        // Store user information mapped to socket ID
        activeUsers.set(socket.id, { userId, userType });
        
        // Join a room based on user ID for private messages
        socket.join(userId);
        
        console.log(`User ${userId} authenticated as ${userType}`);
        
        // Broadcast user online status
        io.emit('userStatus', { userId, status: 'online' });
        
        // Get chat rooms for the user
        let rooms = [];
        if (userType.toLowerCase() === 'user') {
          rooms = await Chatroom.find({ user: userId })
            .populate({ path: 'user', select: 'username id' })
            .populate({ path: 'shop', select: 'username id' });
        } else if (userType.toLowerCase() === 'shop') {
          rooms = await Chatroom.find({ shop: userId })
            .populate({ path: 'user', select: 'username id' })
            .populate({ path: 'shop', select: 'username id' });
        }
        
        console.log(`Found ${rooms.length} rooms for user ${userId}`);
        
        // Join each chat room
        rooms.forEach(room => {
          socket.join(room._id.toString());
          console.log(`User ${userId} joined room: ${room._id}`);
        });
        
        // Send rooms list to the user
        socket.emit('chatRooms', rooms);
        
      } catch (error) {
        console.error('Authentication error:', error);
        socket.emit('error', { message: 'Authentication failed' });
      }
    });
    
    // Handle joining a specific chat room
    socket.on('joinRoom', (roomId) => {
      // Handle both object format and string format for compatibility with different clients
      const roomIdStr = typeof roomId === 'object' ? roomId.roomId : roomId;
      
      socket.join(roomIdStr);
      console.log(`Socket ${socket.id} joined room: ${roomIdStr}`);
      
      // Acknowledge room join
      socket.emit('roomJoined', { roomId: roomIdStr });
    });
    
    // Handle new message
    socket.on('sendMessage', async (messageData) => {
      try {
        console.log('Received message data:', messageData);
        
        // Handle different message formats (for compatibility with different clients)
        let roomId, sender, senderType, content;
        
        if (typeof messageData === 'object' && messageData !== null) {
          // Extract fields based on the format
          roomId = messageData.roomId || messageData.room_id;
          sender = messageData.sender || messageData.senderId || messageData.sender_id;
          senderType = messageData.senderType || messageData.sender_type || 'User';
          content = messageData.content || messageData.message || messageData.text;
        }
        
        if (!roomId || !sender || !content) {
          console.error('Missing required fields in message data');
          socket.emit('error', { message: 'Missing required fields' });
          return;
        }
        
        console.log(`Creating message in room ${roomId} from ${sender}: ${content}`);
        
        // Create and save new message
        const newMessage = new Message({
          roomId,
          sender,
          senderType,
          content,
          readBy: [sender] // Sender has read their own message
        });
        
        const savedMessage = await newMessage.save();
        console.log('Message saved:', savedMessage._id);
        
        // Update chatroom's updatedAt timestamp
        await Chatroom.findByIdAndUpdate(roomId, { updatedAt: Date.now() });
        
        // Send message to all users in the room
        io.to(roomId).emit('newMessage', savedMessage);
        console.log(`Emitted newMessage to room ${roomId}`);
        
        // For Flutter compatibility
        io.to(roomId).emit('messageFromServer', savedMessage);
        
        // Find recipients in the room (user and shop)
        const room = await Chatroom.findById(roomId);
        
        if (room) {
          // Send notification to the other party if they're online
          const recipientId = (senderType.toLowerCase() === 'user' && room.shop.toString() !== sender) 
            ? room.shop.toString() 
            : room.user.toString();
          
          io.to(recipientId).emit('messageNotification', {
            roomId,
            sender,
            senderType,
            content,
            timestamp: savedMessage.timestamp
          });
          console.log(`Sent notification to recipient ${recipientId}`);
        }
        
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
    
    // Handle typing status
    socket.on('typing', (data) => {
      // Handle different formats
      let roomId, userId, isTyping;
      
      if (typeof data === 'object' && data !== null) {
        roomId = data.roomId || data.room_id;
        userId = data.userId || data.user_id;
        isTyping = data.isTyping || data.is_typing;
      }
      
      if (!roomId || !userId) return;
      
      socket.to(roomId).emit('userTyping', { userId, isTyping });
    });
    
    // Handle read receipts
    socket.on('messageRead', async (data) => {
      try {
        // Handle different formats
        let roomId, messageId, userId;
        
        if (typeof data === 'object' && data !== null) {
          roomId = data.roomId || data.room_id;
          messageId = data.messageId || data.message_id;
          userId = data.userId || data.user_id;
        }
        
        if (!messageId || !userId) return;
        
        // Update message read status in database
        await Message.findByIdAndUpdate(messageId, { 
          $addToSet: { readBy: userId } 
        });
        
        // Broadcast read status to room
        if (roomId) {
          io.to(roomId).emit('messageReadStatus', { messageId, userId });
        }
        
      } catch (error) {
        console.error('Error updating read status:', error);
      }
    });
    
    // Handle user logout or disconnect
    socket.on('disconnect', () => {
      const user = activeUsers.get(socket.id);
      if (user) {
        console.log(`User disconnected: ${user.userId}`);
        // Broadcast offline status
        io.emit('userStatus', { userId: user.userId, status: 'offline' });
        // Remove from active users
        activeUsers.delete(socket.id);
      } else {
        console.log(`Socket disconnected: ${socket.id}`);
      }
    });
  });
};
