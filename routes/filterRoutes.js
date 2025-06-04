const express = require('express');
const router = express.Router();
const { filterPets } = require('../controllers/filterController');

// ✅ Filter route
router.get('/pets', filterPets);

module.exports = router;
