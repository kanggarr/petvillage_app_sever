const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const validateToken = require('./middleware/validateToken');
const app = express();

dotenv.config();

app.use(express.json());

app.use('/api/users', validateToken, require('./routes/userRoutes'));
app.use('/api/pets', validateToken, require('./routes/pets'));
app.use('/api/posts', require('./routes/postRoutes'));



const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/User', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  }
};

connectDB();

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
