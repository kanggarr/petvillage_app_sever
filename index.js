require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const apiRoutes = require('./routes/api');
const Message = require('./models/messages');
const Chatroom = require('./models/chatroom');
const User = require('./models/user');
const messageController = require('./controllers/messageController');

// JWT verification helper
const verifyToken = async (token) => {
  try {
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
    
    // Check if the token has the user property (from login function)
    const userId = decoded.user?.id;
    
    if (!userId) {
      console.error('Token does not contain user ID');
      return null;
    }
    
    const user = await User.findById(userId).select('-password');
    if (!user) {
      console.error('User not found with ID:', userId);
      return null;
    }
    
    return { 
      userId: user._id, 
      username: user.username,
      email: user.email,
      role: user.role
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
};

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/api', apiRoutes); // ✅ ใช้ router รวมทุกเส้นทาง


// Make io available to controllers
app.set('io', io);

// Initialize Socket.IO handlers
messageController.initializeSocket(io);

// Chat route
app.get('/chat', (req, res) => {
  res.sendFile(__dirname + '/public/chat.html');
});

app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/public/login.html');
});

// Connect MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Store active users and their rooms
const activeUsers = new Map();



const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
