const express = require('express');
const router = express.Router();

const { upload, createBlog, getAllBlogs, getBlogImage } = require('../controllers/blogController');


// ✅ Routes
router.post('/create', upload.array('images'), createBlog);
router.get('/', getAllBlogs);
router.get('/image/:filename', getBlogImage);

module.exports = router;
