const express = require('express');
const router = express.Router();

const {
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
} = require('../controllers/petController');

// ตัวอย่างการใช้ route หลัก
router.post('/pets', upload.array('pet_image', 5), createPet);
router.get('/pets', getAllPets);
router.get('/pets/:id', getPetById);
router.put('/pets/:id', updatePet);
router.delete('/pets/:id', deletePet);

// 🔽 Location routes
router.get('/locations/provinces', getProvinces);
router.get('/locations/districts/:provinceId', getDistrictsByProvince);
router.get('/locations/subdistricts/:districtId', getSubdistrictsByDistrict);
router.get('/breeds/:type', getBreedsByType);

module.exports = router;
