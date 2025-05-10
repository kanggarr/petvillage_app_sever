const express = require('express');
const router = express.Router();

const {
  createPet,
  getAllPets,
  getPetById,
  updatePet,
  deletePet,
  upload
} = require('../controllers/petController');


// CREATE
router.post('/createpet', upload.array('pet_images', 10), createPet);

// READ ALL
router.get('/', getAllPets);

// READ ONE
router.get('/:id', getPetById);

// UPDATE
router.put('/:id', updatePet);

// DELETE
router.delete('/:id', deletePet);

module.exports = router;
