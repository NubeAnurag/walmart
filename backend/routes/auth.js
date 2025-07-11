const express = require('express');
const rateLimit = require('express-rate-limit');
// const passport = require('../config/passport');
const jwt = require('jsonwebtoken');
const { 
  register, 
  login, 
  logout, 
  verifyToken, 
  getProfile, 
  updateProfile,
  googleVerify 
} = require('../controllers/authController');
const { 
  registerValidation, 
  loginValidation, 
  updateUserValidation 
} = require('../middleware/validation');
const { verifyToken: authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs (increased for development)
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes
router.post('/register', authLimiter, registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);
router.post('/logout', generalLimiter, logout);

// Google OAuth credential verification
router.post('/google/verify', authLimiter, googleVerify);

// Google OAuth routes (commented out - using Google Identity Services instead)
// router.get('/google', 
//   authLimiter,
//   passport.authenticate('google', { 
//     scope: ['profile', 'email'] 
//   })
// );

// router.get('/google/callback',
//   authLimiter,
//   passport.authenticate('google', { session: false }),
//   (req, res) => {
//     try {
//       // Generate JWT token
//       const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, {
//         expiresIn: process.env.JWT_EXPIRE || '7d'
//       });

//       // Set cookie
//       res.cookie('token', token, {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === 'production',
//         sameSite: 'strict',
//         maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
//       });

//       // Redirect to frontend with success
//       const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard/${req.user.role}?auth=success&token=${token}`;
//       res.redirect(redirectUrl);
//     } catch (error) {
//       console.error('Google OAuth callback error:', error);
//       const errorUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=oauth_failed`;
//       res.redirect(errorUrl);
//     }
//   }
// );

// Protected routes
router.get('/verify', generalLimiter, authMiddleware, verifyToken);
router.get('/profile', generalLimiter, authMiddleware, getProfile);
router.put('/profile', generalLimiter, authMiddleware, updateUserValidation, updateProfile);

// Debug endpoint to check if user exists (development only)
router.post('/debug/user-exists', generalLimiter, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ success: false, message: 'Not found' });
  }
  
  try {
    const { email } = req.body;
    const User = require('../models/User');
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (user) {
      res.json({
        success: true,
        message: 'User found',
        data: {
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive,
          authProvider: user.authProvider,
          createdAt: user.createdAt
        }
      });
    } else {
      res.json({
        success: false,
        message: 'User not found',
        data: null
      });
    }
  } catch (error) {
    console.error('Debug user check error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router; 