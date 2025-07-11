const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Register new user
const register = async (req, res) => {
  try {
    const { email, password, role, firstName, lastName, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email address'
      });
    }

    // Create new user
    const user = new User({
      email,
      password,
      role,
      firstName,
      lastName,
      phone
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.toJSON(),
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) { // Duplicate key error
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email address'
      });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Find user by email (includes password for verification)
    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Verify password
    const isPasswordValid = await user.verifyPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Validate role - user can only login with their registered role
    if (role && user.role !== role) {
      return res.status(403).json({
        success: false,
        message: `Access denied. You are registered as a ${user.role}, not as a ${role}. Please use the correct role to login.`
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// Logout user
const logout = (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0)
  });

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};

// Verify token and get user info
const verifyToken = async (req, res) => {
  try {
    const user = req.user; // Set by auth middleware

    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user: user.toJSON()
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during token verification'
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = req.user; // Set by auth middleware

    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user: user.toJSON()
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving profile'
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const userId = req.user.id || req.user._id;

    const updatedUser = await User.updateProfile(userId, {
      firstName,
      lastName,
      phone
    });

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser.toJSON()
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
};

// Google OAuth credential verification
const googleVerify = async (req, res) => {
  try {
    const { credential, role } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Google credential is required'
      });
    }

    // Verify the Google credential
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email;
    const firstName = payload.given_name;
    const lastName = payload.family_name;
    const avatar = payload.picture;

    // Check if user already exists with this Google ID
    let user = await User.findByGoogleId(googleId);
    
    if (user) {
      // Validate role - user can only login with their registered role
      if (role && user.role !== role) {
        return res.status(403).json({
          success: false,
          message: `Access denied. You are registered as a ${user.role}, not as a ${role}. Please use the correct role to login.`
        });
      }

      // User exists, generate token and login
      const token = generateToken(user._id);

      // Set cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      return res.json({
        success: true,
        message: 'Google sign-in successful',
        data: {
          user: user.toJSON(),
          token
        }
      });
    }
    
    // Check if user exists with the same email
    user = await User.findByEmail(email);
    
    if (user) {
      // Validate role - user can only login with their registered role
      if (role && user.role !== role) {
        return res.status(403).json({
          success: false,
          message: `Access denied. You are registered as a ${user.role}, not as a ${role}. Please use the correct role to login.`
        });
      }

      // Link Google account to existing user
      user.googleId = googleId;
      user.authProvider = 'google';
      user.avatar = avatar || user.avatar;
      await user.save();

      const token = generateToken(user._id);

      // Set cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      return res.json({
        success: true,
        message: 'Google account linked successfully',
        data: {
          user: user.toJSON(),
          token
        }
      });
    }
    
    // Create new user
    const newUser = new User({
      googleId,
      email,
      firstName,
      lastName,
      avatar,
      authProvider: 'google',
      role: role || 'customer', // Use provided role or default to customer
      isActive: true
    });
    
    await newUser.save();

    const token = generateToken(newUser._id);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({
      success: true,
      message: 'Google sign-up successful',
      data: {
        user: newUser.toJSON(),
        token
      }
    });

  } catch (error) {
    console.error('Google verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Google sign-in failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Authentication error'
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  verifyToken,
  getProfile,
  updateProfile,
  googleVerify
}; 