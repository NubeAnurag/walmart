const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_REDIRECT_URI
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists with this Google ID
    let user = await User.findByGoogleId(profile.id);
    
    if (user) {
      return done(null, user);
    }
    
    // Check if user exists with the same email
    user = await User.findByEmail(profile.emails[0].value);
    
    if (user) {
      // Link Google account to existing user
      user.googleId = profile.id;
      user.authProvider = 'google';
      user.avatar = profile.photos[0]?.value || user.avatar;
      await user.save();
      return done(null, user);
    }
    
    // Create new user
    const newUser = new User({
      googleId: profile.id,
      email: profile.emails[0].value,
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
      avatar: profile.photos[0]?.value,
      authProvider: 'google',
      role: 'customer', // Default role for Google OAuth users
      isActive: true
    });
    
    await newUser.save();
    return done(null, newUser);
    
  } catch (error) {
    console.error('Google OAuth error:', error);
    return done(error, null);
  }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByIdActive(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport; 