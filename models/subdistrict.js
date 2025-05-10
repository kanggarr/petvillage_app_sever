const mongoose = require('mongoose');

const subdistrictSchema = new mongoose.Schema({
  name_th: { type: String, required: true },
  name_en: { type: String, required: true },
  zip_code: { type: String, required: true },
  district_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'District',
    required: true
  }
});

module.exports = mongoose.model('Subdistrict', subdistrictSchema);
