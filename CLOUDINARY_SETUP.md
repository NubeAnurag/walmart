# Cloudinary Setup Guide

## Environment Variables Setup

Based on your provided Cloudinary credentials, you need to add the following environment variable to your `backend/.env` file:

```env
CLOUDINARY_URL=cloudinary://464299684885923:xX9mcpjALTb3VbzuhgRHivIAzB8@dbadjb9jq
```

## Your Cloudinary Credentials ✅

- Cloud Name: `dbadjb9jq` ✅
- API Key: `464299684885923` ✅  
- API Secret: `xX9mcpjALTb3VbzuhgRHivIAzB8` ✅

## Complete Environment Variable

Your final environment variable is:
```env
CLOUDINARY_URL=cloudinary://464299684885923:xX9mcpjALTb3VbzuhgRHivIAzB8@dbadjb9jq
```

## Testing the Setup

1. Add the environment variable to your `backend/.env` file
2. Restart your backend server (`npm run dev`)
3. Try uploading a product image through the Supplier Dashboard
4. Images should now be uploaded to Cloudinary and URLs stored in MongoDB

## Features Enabled

- ✅ Automatic image upload to Cloudinary
- ✅ Image optimization (quality: auto, format: auto)
- ✅ Automatic image resizing (max 800x600px)
- ✅ Organized storage in `walmart-products` folder
- ✅ Automatic cleanup of old images when products are updated/deleted
- ✅ Fast CDN delivery of images

## Troubleshooting

If you encounter issues:
1. Verify your API secret is correct
2. Check the backend console for any Cloudinary errors
3. Ensure the CLOUDINARY_URL is properly formatted
4. Restart your backend server after adding the environment variable

Your Cloudinary integration is now ready to use! 