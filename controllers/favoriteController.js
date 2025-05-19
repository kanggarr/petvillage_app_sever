const Favorite = require("../models/favorite");

const toggleFavorite = async (req, res) => {
  const { petId, subcribe } = req.body;
  const userId = req.user._id;

  if (!petId?.trim()) {
    return res.status(400).json({ message: "petId is required" });
  }

  if (!subcribe) {
    subcribe = true;
  }


  try {

    // ตรวจสอบว่า petId เป็น ObjectId ที่ valid หรือไม่
    if (!mongoose.Types.ObjectId.isValid(petId)) {
      return res.status(400).json({ message: "Invalid petId" });
    }

    const exists = await Favorite.findOne({ user: userId, pet: petId });

    if (subcribe && !exists) {
      // ถ้ายังไม่มี ให้เพิ่ม
      const favorite = await Favorite.create({ user: userId, pet: petId });
      return res.json({ success: true, message: "ติดตามสัตว์เลี้ยงแล้ว" });

    } else if (!subcribe && exists) {

      // ถ้ามีแล้ว ให้ลบ
      await Favorite.deleteOne({ _id: exists._id });
      return res.json({ success: true, message: "เลิกติดตามสัตว์เลี้ยงแล้ว" });
    } else {
      // ถ้าไม่มีการเปลี่ยนแปลง
      return res.status(200).json({ success: false, message: "ไม่มีการเปลี่ยนแปลง" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getFavorites = async (req, res) => {
  try {
    const userId = req.user._id;

    const favorites = await Favorite.find({ user: userId }).populate("pet");
    res.json(favorites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  toggleFavorite,
  getFavorites
};
