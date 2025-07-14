# Walmart Digital Revolution - Deployment Guide

## Backend Deployment (Render)

### 1. Deploy to Render

1. **Go to [Render.com](https://render.com)** and sign up/login
2. **Create a new Web Service**
3. **Connect your GitHub repository**
4. **Configure the service:**
   - **Name:** `walmart-backend`
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** `Node`

### 2. Environment Variables (Add in Render Dashboard)

```
NODE_ENV=production
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
GOOGLE_AI_API_KEY=your_google_ai_key
```

### 3. Get Your Backend URL

After deployment, Render will give you a URL like:
`https://walmart-backend-xyz.onrender.com`

## Frontend Configuration

### Update Environment Variables

Create a `.env` file in the frontend directory:

```env
REACT_APP_API_URL=https://your-backend-url.onrender.com/api
```

### For Vercel Deployment

Add this environment variable in Vercel dashboard:
- **Name:** `REACT_APP_API_URL`
- **Value:** `https://your-backend-url.onrender.com/api`

## Quick Fix for Current Issue

If you want to test quickly, you can temporarily update the API URL in `frontend/src/services/api.js`:

```javascript
const api = axios.create({
  baseURL: 'https://your-backend-url.onrender.com/api',
  // ... rest of config
});
```

## Testing

1. Deploy backend to Render
2. Update frontend API URL
3. Redeploy frontend to Vercel
4. Test login functionality

## Troubleshooting

- **CORS Issues:** Make sure your backend allows requests from your Vercel domain
- **Database Connection:** Ensure MongoDB Atlas allows connections from Render's IP addresses
- **Environment Variables:** Double-check all environment variables are set correctly 