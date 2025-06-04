const Blog = require('../models/blog');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// เตรียม multer แบบพื้นฐานก่อนรู้ post_id
const tempUploadDir = path.join(__dirname, '..', 'uploads', 'temp');
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempUploadDir); // ชั่วคราว
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // ใช้ชื่อเดิมไว้ก่อน
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = allowedTypes.test(file.mimetype);

    if (extName && mimeType) {
      cb(null, true);
    } else {
      cb(new Error('อนุญาตเฉพาะไฟล์ .jpeg, .jpg, และ .png เท่านั้น'));
    }
  }
});

// ✅ POST /api/blog/create
const createBlog = async (req, res) => {
  try {
    const { title_name, description } = req.body;
    const images = req.files;

    if (!title_name || !description || !images || images.length === 0) {
      return res.status(400).json({ message: 'กรุณาระบุข้อมูลให้ครบถ้วน' });
    }

    // 1. สร้าง blog entry เพื่อเอา _id มาก่อน
    const newBlog = new Blog({ title_name, description, images_url: [] });
    await newBlog.save();

    // 2. สร้างโฟลเดอร์ /uploads/<blogId>
    const blogId = newBlog._id.toString();
    const blogUploadDir = path.join(__dirname, '..', 'uploads', blogId);
    if (!fs.existsSync(blogUploadDir)) {
      fs.mkdirSync(blogUploadDir, { recursive: true });
    }

    // 3. ย้ายไฟล์ + ตั้งชื่อ pic1, pic2, ...
    const imageUrls = [];

    images.forEach((file, index) => {
      const ext = path.extname(file.originalname);
      const newFileName = `pic${index + 1}${ext}`;
      const newFilePath = path.join(blogUploadDir, newFileName);

      // ย้ายไฟล์จาก temp ไปยังโฟลเดอร์เป้าหมาย
      fs.renameSync(file.path, newFilePath);

      // เก็บ URL ลง array
      imageUrls.push(`/uploads/${blogId}/${newFileName}`);
    });

    // 4. อัปเดต images_url ใน blog
    newBlog.images_url = imageUrls;
    await newBlog.save();

    res.status(201).json({ message: 'สร้างบล็อกสำเร็จ', blog: newBlog });

  } catch (err) {
    console.error('Error creating blog:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
};

// ✅ GET /api/blog
const getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ created_at: -1 });
    res.status(200).json(blogs);
  } catch (err) {
    console.error('Error fetching blogs:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
  }
};

// ✅ GET /api/blog/image/:blogId/:filename
const getBlogImage = (req, res) => {
  const { blogId, filename } = req.params;
  const filePath = path.join(__dirname, '..', 'uploads', blogId, filename);

  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error sending image file:', err);
      res.status(404).json({ message: 'ไม่พบรูปภาพ' });
    }
  });
};

module.exports = { createBlog, getAllBlogs, getBlogImage, upload };
