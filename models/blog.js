const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title_name: {
    type: String,
    required: true
  },
  images_url: {
    type: [String],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Blog', blogSchema);