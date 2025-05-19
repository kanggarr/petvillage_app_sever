const Favorite = require("../models/favorite");

const toggleFavorite = async (req, res) => {
  try {
    const { petId } = req.body;
    const userId = req.user._id;

    const exists = await Favorite.findOne({ user: userId, pet: petId });

    if (exists) {
      // ถ้ามีแล้ว ให้ลบ
      await Favorite.deleteOne({ _id: exists._id });
      return res.json({ success: true, message: "Removed from favorites" });
    } else {
      // ถ้ายังไม่มี ให้เพิ่ม
      const favorite = await Favorite.create({ user: userId, pet: petId });
      return res.status(200).json(favorite);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getFavorites = async (req, res) => {
  try {
    const userId = req.user._id;

    // Populate pet เฉพาะที่ยังมีอยู่จริง
    const favorites = await Favorite.find({ user: userId })
      .populate({
        path: "pet",
        match: { _id: { $exists: true } } // ดึงเฉพาะ pet ที่ยังมีอยู่
      })
      .lean(); // แปลงผลลัพธ์ให้เป็น plain object เพื่อให้ filter ทำงานง่าย

    // กรองเฉพาะ favorite ที่ยังมี pet
    const filteredFavorites = favorites.filter(fav => fav.pet !== null);

    res.json(filteredFavorites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


module.exports = {
  toggleFavorite,
  getFavorites
};