const mongoose = require('mongoose');

const petSchema = new mongoose.Schema({
  pet_name: {
    type: String,
    required: true,
    maxlength: 100
  },
  pet_image: {
    type: [String],
    required: true
  },
  pet_type: {
    type: String,
    required: true
  },
  pet_breed: {
    type: mongoose.Schema.Types.ObjectId,  // <-- เปลี่ยนจาก String เป็น ObjectId
    ref: 'PetBreed',                       // <-- อ้างอิงไปที่ breed collection
    required: true
  },
  pet_gender: {
    type: String,
    enum: ['เพศผู้', 'เพศเมีย', 'ไม่แน่ใจ'],
    required: true
  },
  pet_age: {
    type: Number,
    min: 0,
    max: 30,
    required: true
  },
  pet_description: {
    type: String,
    required: true,
    minlength: 10
  },
  pet_price: {
    type: Number,
    min: 0,
    required: true
  },
  pet_is_adoptable: {
    type: Boolean,
    required: true
  },
  pet_address: {
    type: String,
    required: true
  },
  pet_province: {
    type: String,
    required: true
  },
  pet_distinct: {
    type: String,
    required: true
  },
  pet_subdistinct: {
    type: String,
    required: true
  },
  pet_shipping: {
    type: String,
    enum: ['นัดรับ', 'จัดส่งทั่วประเทศ'],
    required: true
  }
});

module.exports = mongoose.model('Pet', petSchema);
