# Quick Start: Vercel Environment Variables Setup

## 🚀 Immediate Action Required

You need to set environment variables in Vercel for your deployment to work properly.

## 📋 Essential Variables to Set First

### 1. Go to Vercel Dashboard
1. Open your project in Vercel dashboard
2. Click "Settings" → "Environment Variables"

### 2. Add These Critical Variables

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `REACT_APP_API_URL` | `/api` | Production, Preview, Development |
| `MONGODB_URI` | `mongodb+srv://your_username:your_password@cluster0.od4oyep.mongodb.net/walmart_digital` | Production, Preview |
| `JWT_SECRET` | `your-super-secret-jwt-key-here` | Production, Preview |

### 3. Optional but Recommended

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `GOOGLE_CLIENT_ID` | `your-google-client-id.apps.googleusercontent.com` | Production, Preview |
| `GOOGLE_CLIENT_SECRET` | `your-google-client-secret` | Production, Preview |
| `CLOUDINARY_CLOUD_NAME` | `your-cloud-name` | Production, Preview |
| `CLOUDINARY_API_KEY` | `your-api-key` | Production, Preview |
| `CLOUDINARY_API_SECRET` | `your-api-secret` | Production, Preview |

## ⚡ Quick Setup Steps

1. **Copy your MongoDB connection string** from your backend config
2. **Generate a strong JWT secret** (you can use a password generator)
3. **Add variables in Vercel** using the table above
4. **Deploy** your application

## 🔍 How to Add Variables in Vercel

1. In your Vercel project settings
2. Click "Environment Variables"
3. Click "Add New"
4. Enter variable name and value
5. Select environment (Production, Preview)
6. Click "Save"

## ✅ Verification

After setting variables:
1. Deploy your project
2. Check that API calls work
3. Test login functionality
4. Verify database connections

## 📖 Full Guide

For complete setup instructions, see `FRONTEND_ENVIRONMENT_SETUP.md`

## 🆘 Need Help?

- Check the full guide for troubleshooting
- Verify all variables are set correctly
- Ensure MongoDB connection string is valid
- Test with a simple API call first 