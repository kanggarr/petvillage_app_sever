const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        // Verify token
        // Use TOKEN_SECRET as that's what's used in the login function
        const secret = process.env.TOKEN_SECRET;
        const decoded = jwt.verify(token, secret);
        
        // Add user info to request object
        // The token structure from login function has user info nested under 'user' property
        req.user = decoded.user || {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role
        };
        
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        return res.status(401).json({ message: 'Not authorized' });
    }
};

// Middleware to check if user has specific role
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `User role ${req.user.role} is not authorized to access this route` 
            });
        }
        next();
    };
};

module.exports = {
    authenticate,
    authorize
};
