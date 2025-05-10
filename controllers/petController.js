const Pet = require('../models/pet');
const Breed = require('../models/breed');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// โหลดไฟล์ location JSON
const Province = require('../models/provincemodel'); // import model
const District = require('../models/districtmodel');
const Subdistrict = require('../models/subdistrict');

// โหลดไฟล์ breed JSON
const breedData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'breed.json'), 'utf-8'));

// สร้างโฟลเดอร์ temp สำหรับอัปโหลดไฟล์
const tempDir = path.join(__dirname, '..', 'uploads', 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// ตั้งค่า multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tempDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
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

// CREATE
const createPet = async (req, res) => {
  try {
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ msg: 'กรุณาอัปโหลดรูปภาพอย่างน้อย 1 รูป' });
    }

    // หาสายพันธุ์
    const breedDoc = await Breed.findOne({ name: req.body.pet_breed });
    if (!breedDoc) return res.status(400).json({ msg: "ไม่พบสายพันธุ์ในระบบ" });

    // แปลงจังหวัด/อำเภอ/ตำบลเป็น ObjectId
    const province = await Province.findOne({ name_th: req.body.pet_province });
    if (!province) return res.status(400).json({ msg: 'ไม่พบจังหวัดที่ระบุ' });

    const district = await District.findOne({ name_th: req.body.pet_district, province_id: province.id });
    if (!district) return res.status(400).json({ msg: 'อำเภอไม่สัมพันธ์กับจังหวัดที่เลือก' });

    const subdistrict = await Subdistrict.findOne({ name_th: req.body.pet_subdistrict, district_id: district.id });
    if (!subdistrict) return res.status(400).json({ msg: 'ตำบลไม่สัมพันธ์กับอำเภอที่เลือก' });

    // เตรียมข้อมูล
    const petData = {
      ...req.body,
      pet_breed: breedDoc._id,
      pet_province: province._id,
      pet_district: district._id,
      pet_subdistrict: subdistrict._id,
      pet_image: [],
    };

    const newPet = new Pet(petData);
    await newPet.save();

    // ย้ายไฟล์จาก temp ไปยังไดเรกทอรีตาม _id
    const postDir = path.join(__dirname, '..', 'uploads', newPet._id.toString());
    if (!fs.existsSync(postDir)) {
      fs.mkdirSync(postDir, { recursive: true });
    }

    const petImages = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = path.extname(file.originalname);
      const newFileName = `pic${i + 1}${ext}`;
      const newPath = path.join(postDir, newFileName);

      fs.renameSync(file.path, newPath);
      petImages.push(`/uploads/${newPet._id}/${newFileName}`);
    }

    newPet.pet_image = petImages;
    await newPet.save();

    const petObj = newPet.toObject();
    petObj.pet_shipping = JSON.parse(JSON.stringify(petObj.pet_shipping));

    res.status(201).json({ msg: "โพสต์สัตว์เลี้ยงสำเร็จ", pet: petObj });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "ไม่สามารถสร้างโพสต์ได้", error: error.message });
  }
};

// READ ALL
const getAllPets = async (req, res) => {
  try {
    const pets = await Pet.find();
    res.status(200).json(pets);
  } catch (error) {
    res.status(500).json({ msg: "เกิดข้อผิดพลาดในการดึงข้อมูล", error: error.message });
  }
};

// READ ONE
const getPetById = async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);
    if (!pet) return res.status(404).json({ msg: "ไม่พบข้อมูลสัตว์เลี้ยง" });
    res.status(200).json(pet);
  } catch (error) {
    res.status(500).json({ msg: "เกิดข้อผิดพลาด", error: error.message });
  }
};

// UPDATE
const updatePet = async (req, res) => {
  try {
    const pet = await Pet.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!pet) return res.status(404).json({ msg: "ไม่พบข้อมูลสัตว์เลี้ยง" });
    res.status(200).json({ msg: "อัปเดตข้อมูลสำเร็จ", pet });
  } catch (error) {
    res.status(500).json({ msg: "เกิดข้อผิดพลาดในการอัปเดต", error: error.message });
  }
};

// DELETE
const deletePet = async (req, res) => {
  try {
    const pet = await Pet.findByIdAndDelete(req.params.id);
    if (!pet) return res.status(404).json({ msg: "ไม่พบข้อมูลสัตว์เลี้ยง" });

    const petDir = path.join(__dirname, '..', 'uploads', pet._id.toString());
    if (fs.existsSync(petDir)) {
      fs.rmSync(petDir, { recursive: true, force: true });
    }

    res.status(200).json({ msg: "ลบโพสต์สำเร็จ" });
  } catch (error) {
    res.status(500).json({ msg: "เกิดข้อผิดพลาดในการลบ", error: error.message });
  }
};

// LOCATIONS
// ดึงจังหวัดทั้งหมด
const getProvinces = async (req, res) => {
  try {
    const provinces = await Province.find();
    res.status(200).json(provinces);
  } catch (error) {
    res.status(500).json({ msg: "เกิดข้อผิดพลาด", error: error.message });
  }
};

// ดึงอำเภอจากจังหวัด
const getDistrictsByProvince = async (req, res) => {
  try {
    const provinceName = req.params.provinceName;
    const province = await Province.findOne({ name_th: provinceName });
    if (!province) {
      return res.status(404).json({ msg: 'ไม่พบจังหวัดที่ระบุ' });
    }

    const districts = await District.find({ province_id: province.id });
    res.status(200).json(districts);
  } catch (error) {
    res.status(500).json({ msg: "เกิดข้อผิดพลาด", error: error.message });
  }
};

// ดึงตำบลจากอำเภอ
const getSubdistrictsByDistrict = async (req, res) => {
  try {
    const districtName = req.params.districtName;
    const district = await District.findOne({ name_th: districtName });
    if (!district) {
      return res.status(404).json({ msg: 'ไม่พบอำเภอที่ระบุ' });
    }

    const subdistricts = await Subdistrict.find({ district_id: district.id });
    res.status(200).json(subdistricts);
  } catch (error) {
    res.status(500).json({ msg: "เกิดข้อผิดพลาด", error: error.message });
  }
};

// BREED BY TYPE
const getBreedsByType = async (req, res) => {
  try {
    const type = req.params.type.toLowerCase();
    const breeds = await Breed.find({ type: { $regex: new RegExp(`^${type}$`, 'i') } });

    if (breeds.length === 0) {
      return res.status(404).json({ msg: "ไม่พบสายพันธุ์สำหรับชนิดสัตว์ที่ระบุ" });
    }

    res.status(200).json(breeds);
  } catch (error) {
    res.status(500).json({ msg: "เกิดข้อผิดพลาดในการดึงสายพันธุ์", error: error.message });
  }
};

module.exports = {
  createPet,
  getAllPets,
  getPetById,
  updatePet,
  deletePet,
  upload,
  getProvinces,
  getDistrictsByProvince,
  getSubdistrictsByDistrict,
  getBreedsByType
};
