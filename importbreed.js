const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const Breed = require('./models/breed'); // ปรับ path ตามจริง

// โหลดค่าจาก .env
dotenv.config();
const MONGODB_URI = process.env.MONGO_URI;

async function importBreeds() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    const dataPath = path.join(__dirname, 'data', 'breed.json');
    const rawData = fs.readFileSync(dataPath);
    const breedData = JSON.parse(rawData);

    const formattedBreeds = breedData.flatMap(item =>
      item.breeds.map(breed => ({
        type: item.type,
        name: breed.name_th  // ถ้าอยากใช้ name_en ก็เปลี่ยนตรงนี้
      }))
    );

    await Breed.deleteMany(); // ล้างของเก่าก่อน import ใหม่
    await Breed.insertMany(formattedBreeds);

    console.log('✅ Breed data imported successfully');
  } catch (err) {
    console.error('❌ Error importing breeds:', err);
  } finally {
    mongoose.disconnect();
  }
}

importBreeds();
