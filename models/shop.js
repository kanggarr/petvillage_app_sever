const mongoose = require('mongoose');

const ShopSchema = new mongoose.Schema({
  shopName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  shop_province: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Province',
    required: true
  },
  shop_district: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'District',
    required: true
  },
  shop_subdistrict: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subdistrict',
    required: true
  },
  businessLicense: {
    type: [String],
    required: true // ต้องอัปโหลด
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending' // รอแอดมินอนุมัติ
  }
}, { timestamps: true });

module.exports = mongoose.model('Shop', ShopSchema);
