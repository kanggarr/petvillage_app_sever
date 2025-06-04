const multer = require('multer');
const path = require('path');

const storagePet = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/pets/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueName + ext);
  }
});

const uploadPet = multer({
  storage: storagePet,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('รองรับเฉพาะไฟล์รูปภาพ (jpg, jpeg, png)'));
    }
  }
});

module.exports = uploadPet;