const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
if (process.env.CLOUDINARY_URL) {
  // Parse the CLOUDINARY_URL manually to ensure it works
  const url = process.env.CLOUDINARY_URL;
  
  // Let Cloudinary auto-configure first
  cloudinary.config({ secure: true });
  
  // If auto-config didn't work, manually parse
  if (!cloudinary.config().api_key) {
    const match = url.match(/cloudinary:\/\/(\d+):([^@]+)@(.+)/);
    if (match) {
      const [, api_key, api_secret, cloud_name] = match;
      cloudinary.config({
        cloud_name,
        api_key,
        api_secret,
        secure: true
      });
    }
  }
} else {
  // Fallback to individual environment variables
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

module.exports = cloudinary; 