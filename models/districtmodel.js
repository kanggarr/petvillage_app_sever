const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  name_th: { type: String, required: true },
  province_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Province',
    required: true
  }
});
module.exports = mongoose.model('District', schema);
