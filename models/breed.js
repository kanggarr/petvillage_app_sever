const mongoose = require('mongoose');

const breedSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    required: true  // เช่น "สุนัข", "แมว", "กระต่าย", "แฮมสเตอร์"
  }
});

module.exports = mongoose.model('Breed', breedSchema);  // ชื่อ model คือ 'Breed'
