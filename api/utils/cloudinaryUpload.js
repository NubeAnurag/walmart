const cloudinary = require('../config/cloudinary');

/**
 * Upload image to Cloudinary from base64 data
 * @param {string} base64Data - Base64 encoded image data (data:image/...;base64,...)
 * @param {string} folder - Cloudinary folder name (optional)
 * @param {string} publicId - Custom public ID (optional)
 * @returns {Promise<object>} - Upload result object
 */
const uploadImageToCloudinary = async (base64Data, folder = 'walmart-products', publicId = null) => {
  try {
    // Validate base64 data
    if (!base64Data || typeof base64Data !== 'string' || !base64Data.startsWith('data:image/')) {
      throw new Error('Invalid base64 image data');
    }

    const uploadOptions = {
      folder,
      resource_type: 'auto',
      quality: 'auto',
      fetch_format: 'auto',
      transformation: [
        { width: 800, height: 600, crop: 'limit' },
        { quality: 'auto' }
      ]
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    const result = await cloudinary.uploader.upload(base64Data, uploadOptions);
    
    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload image to Cloudinary: ${error.message}`);
  }
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Public ID of the image to delete
 * @returns {Promise<object>} - Deletion result
 */
const deleteImageFromCloudinary = async (publicId) => {
  try {
    if (!publicId) {
      throw new Error('Public ID is required for deletion');
    }

    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error(`Failed to delete image from Cloudinary: ${error.message}`);
  }
};

/**
 * Generate optimized image URL
 * @param {string} publicId - Public ID of the image
 * @param {object} options - Transformation options
 * @returns {string} - Optimized image URL
 */
const getOptimizedImageUrl = (publicId, options = {}) => {
  const defaultOptions = {
    width: 400,
    height: 300,
    crop: 'fill',
    quality: 'auto',
    fetch_format: 'auto'
  };

  const transformOptions = { ...defaultOptions, ...options };
  
  return cloudinary.url(publicId, transformOptions);
};

module.exports = {
  uploadImageToCloudinary,
  deleteImageFromCloudinary,
  getOptimizedImageUrl
}; 