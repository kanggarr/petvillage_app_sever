const express = require("express");
const router = express.Router();
const favoriteController = require("../controllers/favoriteController");
const { validateUserPermission } = require("../middleware/userMidleware");

router.post("/", validateUserPermission, favoriteController.toggleFavorite);
router.get("/", validateUserPermission, favoriteController.getFavorites);

module.exports = router;
