require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const Province = require('./models/provincemodel');
const District = require('./models/districtmodel');
const Subdistrict = require('./models/subdistrict');

// ตรวจสอบว่าไฟล์ข้อมูลมีอยู่และอ่านได้หรือไม่
const readJsonFile = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`❌ ไม่สามารถอ่านไฟล์ ${filePath}:`, err.message);
    process.exit(1);
  }
};

const provinces = readJsonFile('./data/province.json');
const districts = readJsonFile('./data/district.json');
const subdistricts = readJsonFile('./data/subdistrict.json');

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ MongoDB connected');
  importData();
})
.catch(err => {
  console.error('❌ MongoDB connection failed:', err);
  process.exit(1);
});

process.on('unhandledRejection', err => {
  console.error('❌ Unhandled rejection:', err);
  process.exit(1);
});

async function importData() {
  console.log('🚀 เริ่มกระบวนการ import...');

  try {
    await Province.deleteMany();
    await District.deleteMany();
    await Subdistrict.deleteMany();
    console.log('🧹 ลบข้อมูลเดิมทั้งหมดเรียบร้อยแล้ว');

    const provinceIdMap = {};
    const districtIdMap = {};

    console.log(`📦 เริ่ม import province (${provinces.length} รายการ)`);
    for (const p of provinces) {
      const newProvince = new Province({ name_th: p.name_th, name_en: p.name_en });
      const savedProvince = await newProvince.save();
      provinceIdMap[p.id] = savedProvince._id;
    }
    console.log('✅ เสร็จสิ้นการ import provinces');

    console.log(`📦 เริ่ม import district (${districts.length} รายการ)`);
    for (const d of districts) {
      const mappedProvinceId = provinceIdMap[d.province_id];
      if (!mappedProvinceId) {
        console.warn(`⚠️ ไม่พบ province_id สำหรับ district: ${d.name_th} (id: ${d.province_id})`);
        continue;
      }

      const newDistrict = new District({
        name_th: d.name_th,
        name_en: d.name_en || '',
        province_id: mappedProvinceId
      });
      const savedDistrict = await newDistrict.save();
      districtIdMap[d.id] = savedDistrict._id;
    }
    console.log('✅ เสร็จสิ้นการ import districts');

    console.log(`📦 เริ่ม import subdistrict (${subdistricts.length} รายการ)`);
    let skipped = 0;
    for (const s of subdistricts) {
      const mappedDistrictId = districtIdMap[s.district_id];

      if (!mappedDistrictId) {
        console.warn(`⚠️ ไม่พบ district_id สำหรับ subdistrict: ${s.name_th} (id: ${s.district_id})`);
        skipped++;
        continue;
      }

      if (!s.name_en || !s.zip_code) {
        console.warn(`⚠️ ข้อมูลไม่ครบ subdistrict:`, s);
        skipped++;
        continue;
      }

      try {
        const newSubdistrict = new Subdistrict({
          name_th: s.name_th,
          name_en: s.name_en,
          zip_code: s.zip_code,
          district_id: mappedDistrictId
        });
        await newSubdistrict.save();
      } catch (err) {
        console.error(`❌ Error saving subdistrict: ${s.name_th}`, err.message);
        skipped++;
      }
    }

    console.log(`✅ Import เสร็จเรียบร้อย (Skipped ${skipped} รายการ subdistrict)`);
    process.exit();
  } catch (err) {
    console.error('❌ Error importing data:', err);
    process.exit(1);
  }
}
