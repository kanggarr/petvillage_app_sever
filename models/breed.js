const mongoose = require('mongoose');

const PetBreedSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  pet_type: {
    type: String,
    required: true, // เช่น 'สุนัข', 'แมว'
    enum: ['สุนัข', 'แมว', 'กระต่าย', 'แฮมสเตอร์'] // หรือปรับตามประเภทสัตว์ที่คุณรองรับ
  }
});

module.exports = mongoose.model('PetBreed', PetBreedSchema);
