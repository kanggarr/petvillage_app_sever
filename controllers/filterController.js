const mongoose = require('mongoose');
const Pet = require('../models/pet');
const Province = require('../models/provincemodel');
const Breed = require('../models/breed');

const filterPets = async (req, res) => {
  const {
    pet_type,
    pet_breed,
    pet_gender,
    pet_age,
    pet_province,
    pet_shipping
  } = req.query;

  const query = {};

  if (pet_type) query.pet_type = pet_type;

  if (pet_breed) {
    try {
      const breedDoc = await Breed.findOne({
        name: { $regex: `^${pet_breed}$`, $options: 'i' } // ✅ case-insensitive match
      });
      if (breedDoc) {
        query.pet_breed = breedDoc._id;
      } else {
        return res.status(400).json({ success: false, message: 'ไม่พบพันธุ์สัตว์ที่ระบุ' });
      }
    } catch (err) {
      console.error('[BREED ERROR]', err);
      return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการค้นหาพันธุ์สัตว์' });
    }
  }

  if (pet_gender && pet_gender !== 'ทั้งคู่') {
    query.pet_gender = pet_gender;
  }

  if (pet_age) {
    const ageNumber = Number(pet_age);
    if (!isNaN(ageNumber)) {
      query.pet_age = ageNumber;
    }
  }

  if (pet_shipping) {
    query.pet_shipping = pet_shipping;
  }

  if (pet_province) {
    try {
      const provinceDoc = await Province.findOne({
        name_th: { $regex: `^${pet_province}$`, $options: 'i' }
      });
      if (provinceDoc) {
        query.pet_province = provinceDoc._id;
      } else {
        return res.status(400).json({ success: false, message: 'ไม่พบจังหวัดที่ระบุ' });
      }
    } catch (err) {
      console.error('[PROVINCE ERROR]', err);
      return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการค้นหาจังหวัด' });
    }
  }

  try {
    const pets = await Pet.find(query).populate('pet_breed');
    res.json({ success: true, data: pets });
  } catch (err) {
    console.error('[FILTER ERROR]', err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการค้นหาสัตว์เลี้ยง' });
  }
};

module.exports = {
  filterPets
};
