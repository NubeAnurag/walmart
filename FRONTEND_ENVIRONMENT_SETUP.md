# Frontend Environment Variables Setup for Vercel

## Overview
Your frontend is already configured to use environment variables. The main configurations are:

1. **API Service** (`frontend/src/services/api.js`):
```javascript
baseURL: process.env.REACT_APP_API_URL || '/api'
```

2. **Google Sign-In** (`frontend/src/components/GoogleSignIn.jsx`):
```javascript
window.location.href = `${process.env.REACT_APP_API_URL || ''}/api/auth/google`;
```

3. **Debug Logging** (`frontend/src/components/RegisterModal.jsx`):
```javascript
console.log('📡 API Base URL:', process.env.REACT_APP_API_URL || 'http://localhost:5001/api');
```

## Environment Variables to Set in Vercel

### 1. Go to Vercel Dashboard
1. Navigate to your project in the Vercel dashboard
2. Click on "Settings" tab
3. Click on "Environment Variables" in the left sidebar

### 2. Required Environment Variables

#### API Configuration
```
REACT_APP_API_URL=/api
```
**Value:** `/api` (this will use the Vercel serverless functions)

#### MongoDB Configuration
```
REACT_APP_MONGODB_URI=mongodb+srv://your_username:your_password@cluster0.od4oyep.mongodb.net/walmart_digital
```
**Value:** Your actual MongoDB connection string

#### JWT Secret
```
REACT_APP_JWT_SECRET=your_jwt_secret_here
```
**Value:** A strong, random string for JWT token signing

#### Google OAuth Configuration
```
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
REACT_APP_GOOGLE_CLIENT_SECRET=your_google_client_secret
REACT_APP_GOOGLE_REDIRECT_URI=https://your-domain.vercel.app/api/auth/google/callback
```

#### Cloudinary Configuration (for image uploads)
```
REACT_APP_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
REACT_APP_CLOUDINARY_API_KEY=your_cloudinary_api_key
REACT_APP_CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```
**Alternative:** You can also use a single `CLOUDINARY_URL` variable:
```
REACT_APP_CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
```

#### AI Service Configuration
```
REACT_APP_HUGGING_FACE_API_KEY=your_hugging_face_api_key
REACT_APP_GEMINI_API_KEY=your_gemini_api_key
```

#### Security Configuration
```
REACT_APP_BCRYPT_SALT_ROUNDS=12
```

#### Environment
```
NODE_ENV=production
```

## How to Add Environment Variables in Vercel

### Method 1: Vercel Dashboard
1. In your project settings, go to "Environment Variables"
2. Click "Add New"
3. Enter the variable name (e.g., `REACT_APP_MONGODB_URI`)
4. Enter the variable value
5. Select the environment (Production, Preview, Development)
6. Click "Save"

### Method 2: Vercel CLI
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Add environment variables
vercel env add REACT_APP_MONGODB_URI
vercel env add REACT_APP_JWT_SECRET
vercel env add REACT_APP_CLOUDINARY_CLOUD_NAME
# ... add other variables as needed

# Deploy
vercel --prod
```

## Important Notes

### 1. React Environment Variables
- All environment variables must start with `REACT_APP_` to be accessible in React
- They are embedded during build time, not runtime
- Changes require a new deployment

### 2. Security
- Never commit sensitive environment variables to your repository
- Use Vercel's environment variable system for production secrets
- The `.env` file should be in `.gitignore`

### 3. API URL Configuration
- For Vercel deployment, use `/api` as the `REACT_APP_API_URL`
- This will route requests to your serverless functions in the `/api` directory
- The fallback `/api` ensures it works even without the environment variable

### 4. Environment-Specific Variables
You can set different values for different environments:
- **Production:** Live environment
- **Preview:** Pull request deployments
- **Development:** Local development

## Example Environment Variables Setup

Here's what your Vercel environment variables should look like:

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `REACT_APP_API_URL` | `/api` | Production, Preview, Development |
| `REACT_APP_MONGODB_URI` | `mongodb+srv://username:password@cluster.mongodb.net/walmart_digital` | Production, Preview |
| `REACT_APP_JWT_SECRET` | `your-super-secret-jwt-key-here` | Production, Preview |
| `REACT_APP_GOOGLE_CLIENT_ID` | `your-google-client-id.apps.googleusercontent.com` | Production, Preview |
| `REACT_APP_GOOGLE_CLIENT_SECRET` | `your-google-client-secret` | Production, Preview |
| `REACT_APP_GOOGLE_REDIRECT_URI` | `https://your-domain.vercel.app/api/auth/google/callback` | Production, Preview |
| `REACT_APP_CLOUDINARY_CLOUD_NAME` | `your-cloud-name` | Production, Preview |
| `REACT_APP_CLOUDINARY_API_KEY` | `your-api-key` | Production, Preview |
| `REACT_APP_CLOUDINARY_API_SECRET` | `your-api-secret` | Production, Preview |
| `REACT_APP_CLOUDINARY_URL` | `cloudinary://api_key:api_secret@cloud_name` | Production, Preview |
| `REACT_APP_HUGGING_FACE_API_KEY` | `your-hf-api-key` | Production, Preview |
| `REACT_APP_GEMINI_API_KEY` | `your-gemini-api-key` | Production, Preview |
| `REACT_APP_BCRYPT_SALT_ROUNDS` | `12` | Production, Preview |
| `NODE_ENV` | `production` | Production, Preview |

## Verification

After setting up environment variables:

1. **Deploy your project** to Vercel
2. **Check the build logs** to ensure no environment variable errors
3. **Test the application** to ensure API calls work correctly
4. **Verify in browser console** that the correct API URL is being used

## Troubleshooting

### Common Issues:

1. **Environment variables not accessible**
   - Ensure they start with `REACT_APP_`
   - Redeploy after adding new variables

2. **API calls failing**
   - Check that `REACT_APP_API_URL` is set to `/api`
   - Verify your serverless functions are working

3. **Build errors**
   - Check that all required environment variables are set
   - Ensure no syntax errors in variable values

### Debug Environment Variables:
Add this to your React component temporarily:
```javascript
console.log('Environment Variables:', {
  API_URL: process.env.REACT_APP_API_URL,
  NODE_ENV: process.env.NODE_ENV
});
```

## Backend Environment Variables (for Serverless Functions)

Since your backend is converted to serverless functions in the `/api` directory, you'll also need to set these environment variables for the backend functionality:

### Required Backend Variables
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/walmart_digital
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-domain.vercel.app/api/auth/google/callback
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
HUGGING_FACE_API_KEY=your-hf-api-key
GEMINI_API_KEY=your-gemini-api-key
BCRYPT_SALT_ROUNDS=12
NODE_ENV=production
```

### Important Notes for Backend Variables
- These variables are used by your serverless functions in the `/api` directory
- They don't need the `REACT_APP_` prefix since they're used by Node.js
- Set them in the same Vercel project settings
- The backend will access them directly via `process.env.VARIABLE_NAME`

## Complete Deployment Checklist

### Frontend Variables (REACT_APP_*)
- [ ] `REACT_APP_API_URL=/api`
- [ ] `REACT_APP_MONGODB_URI` (if needed)
- [ ] `REACT_APP_JWT_SECRET` (if needed)
- [ ] `REACT_APP_GOOGLE_CLIENT_ID`
- [ ] `REACT_APP_GOOGLE_CLIENT_SECRET`
- [ ] `REACT_APP_GOOGLE_REDIRECT_URI`
- [ ] `REACT_APP_CLOUDINARY_CLOUD_NAME`
- [ ] `REACT_APP_CLOUDINARY_API_KEY`
- [ ] `REACT_APP_CLOUDINARY_API_SECRET`
- [ ] `REACT_APP_HUGGING_FACE_API_KEY`
- [ ] `REACT_APP_GEMINI_API_KEY`
- [ ] `REACT_APP_BCRYPT_SALT_ROUNDS`
- [ ] `NODE_ENV=production`

### Backend Variables (for Serverless Functions)
- [ ] `MONGODB_URI`
- [ ] `JWT_SECRET`
- [ ] `JWT_EXPIRE`
- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `GOOGLE_REDIRECT_URI`
- [ ] `CLOUDINARY_CLOUD_NAME`
- [ ] `CLOUDINARY_API_KEY`
- [ ] `CLOUDINARY_API_SECRET`
- [ ] `HUGGING_FACE_API_KEY`
- [ ] `GEMINI_API_KEY`
- [ ] `BCRYPT_SALT_ROUNDS`
- [ ] `NODE_ENV=production`

## Next Steps

1. Set up all required environment variables in Vercel (both frontend and backend)
2. Deploy your application
3. Test all functionality
4. Remove any debug console.log statements
5. Monitor the application for any issues

Your frontend is already properly configured to use these environment variables, so once you set them up in Vercel, everything should work seamlessly! 