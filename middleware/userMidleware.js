const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const User = require('../models/user');

/**
 * Middleware to validate user authentication and permissions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validateUserPermission = asyncHandler(async (req, res, next) => {
    try {
        // Get authorization header
        const authHeader = req.headers.Authorization || req.headers.authorization;
        
        // Check if auth header exists and has correct format
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ 
                success: false, 
                message: "กรุณาเข้าสู่ระบบก่อนเข้าใช้งาน" 
            });
        }
        
        // Extract token
        const token = authHeader.split(" ")[1];
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: "โทเคนไม่ถูกต้อง" 
            });
        }
        
        // Verify token
        const decoded = jwt.verify(token, process.env.TOKEN_SECRET);


        if(decoded.user.role  == "refresh"){
            return res.status(401).json({ 
                success: false, 
                message: "โทเคนไม่ถูกต้อง" 
            });
        }


        // Get user from token
        const user = await User.findById(decoded.user.id).select('-password');
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: "ไม่พบผู้ใช้งานในระบบ" 
            });
        }
        if (user.role !== "user" && user.role !== "shop") {
            return res.status(403).json({ 
                success: false, 
                message: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลส่วนนี้" 
            });
        }
        // Set user in request object
        req.user = decoded.user;
        
        
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

module.exports = {validateUserPermission};