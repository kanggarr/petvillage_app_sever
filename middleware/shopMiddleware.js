const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const Shop = require('../models/shop'); // ใช้ Shop แทน User

/**
 * Middleware to validate shop authentication and permissions
 */
const validateUserPermission = asyncHandler(async (req, res, next) => {
    try {
        const authHeader = req.headers.Authorization || req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ 
                success: false, 
                message: "กรุณาเข้าสู่ระบบก่อนเข้าใช้งาน" 
            });
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: "โทเคนไม่ถูกต้อง" 
            });
        }

        const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

        // ตรวจสอบว่า token มี shopId (เราใช้ shopId แทน user.id)
        if (!decoded.shopId) {
            return res.status(401).json({
                success: false,
                message: "โทเคนไม่ถูกต้องหรือไม่มีสิทธิ์"
            });
        }

        const shop = await Shop.findById(decoded.shopId).select('-password');
        if (!shop) {
            return res.status(401).json({ 
                success: false, 
                message: "ไม่พบร้านค้าในระบบ" 
            });
        }

        // ใส่ shop object ลง req เพื่อให้ controller ใช้งานได้
        req.shop = shop;

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: "โทเคนหมดอายุ กรุณาเข้าสู่ระบบใหม่" 
            });
        }

        return res.status(401).json({ 
            success: false, 
            message: "การยืนยันตัวตนล้มเหลว" 
        });
    }
});

module.exports = { validateUserPermission };
