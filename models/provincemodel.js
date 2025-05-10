const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  name_th: { type: String, required: true },
  name_en: { type: String }
});
module.exports = mongoose.model('Province', schema);
