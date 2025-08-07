# FootageFlow Deployment Guide

This guide will help you deploy FootageFlow to production using Render (backend) and Vercel (frontend).

## Prerequisites

1. GitHub repository with your FootageFlow code
2. Render account (https://render.com)
3. Vercel account (https://vercel.com)
4. All environment variables ready (see below)

## Backend Deployment (Render)

### Option 1: Deploy from Repository Root (Recommended)

1. **Create New Web Service on Render**
   - Go to https://render.com/dashboard
   - Click "New" → "Web Service"
   - Connect your GitHub repository

2. **Configure Service Settings**
   - **Name**: `footageflow-backend`
   - **Environment**: `Node`
   - **Region**: Choose closest to your users
   - **Branch**: `master` or `main`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npx prisma generate`
   - **Start Command**: `npm start`

3. **Add Environment Variables**
   Add all these environment variables in Render dashboard:

   ```
   NODE_ENV=production
   PORT=10000
   DATABASE_URL=your_postgresql_database_url
   JWT_SECRET=your_jwt_secret_key
   CLOUDINARY_URL=your_cloudinary_url
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GEMINI_API_KEY=your_gemini_api_key
   GROQ_API_KEY=your_groq_api_key
   DEEPGRAM_API_KEY=your_deepgram_api_key
   ASSEMBLYAI_API_KEY=your_assemblyai_api_key
   CLARIFAI_API_KEY=your_clarifai_api_key
   FIREBASE_PROJECT_ID=your_firebase_project_id
   FIREBASE_CLIENT_EMAIL=your_firebase_client_email
   FIREBASE_PRIVATE_KEY=your_firebase_private_key
   FRONTEND_URL=https://footage-flow.vercel.app
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Note your backend URL: `https://footageflow.onrender.com`

### Option 2: Deploy from Backend Directory

If Option 1 doesn't work, you can create a separate repository with just the backend code:

1. Create a new repository with only the `backend` folder contents
2. Use the `backend/render.yaml` configuration file
3. Deploy using the same environment variables

## Frontend Deployment (Vercel)

### Step 1: Prepare Frontend

1. **Update API URL in vercel.json**
   The `frontend/vercel.json` file is already configured with the correct settings.

2. **Environment Variables**
   The following environment variables need to be configured in Vercel:
   - `REACT_APP_API_URL`: Points to your Render backend
   - Firebase configuration variables
   - Google OAuth client ID

### Step 2: Deploy to Vercel

1. **Create New Project on Vercel**
   - Go to https://vercel.com/dashboard
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Project Settings**
   - **Framework Preset**: `Create React App`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `build` (auto-detected)

3. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete
   - Your frontend will be available at: `https://footage-flow.vercel.app`

## Post-Deployment Configuration

### 1. Update OAuth Redirect URLs

1. **Google Cloud Console**
   - Go to https://console.cloud.google.com
   - Navigate to APIs & Services → Credentials
   - Edit your OAuth 2.0 Client ID
   - Add authorized redirect URIs:
     - `https://footageflow.onrender.com/auth/google/callback`
     - `https://footage-flow.vercel.app/auth/callback`
   - Add authorized JavaScript origins:
     - `https://footage-flow.vercel.app`
     - `https://footageflow.onrender.com`

### 2. Test Deployment

1. **Backend Health Check**
   - Visit: `https://footageflow.onrender.com/health`
   - Should return: `{"status": "OK", "message": "FootageFlow API is running"}`

2. **Frontend Access**
   - Visit: `https://footage-flow.vercel.app`
   - Test user registration/login
   - Test video upload functionality

### 3. Update Environment Variables (if needed)

If you need to update any environment variables:

- **Render**: Go to your service dashboard → Environment tab
- **Vercel**: Go to your project dashboard → Settings → Environment Variables

## Troubleshooting

### Common Render Issues

1. **"cd: backend: No such file or directory"**
   - Solution: Use `rootDir: backend` in render.yaml instead of `cd backend` in commands

2. **Prisma Database Connection Issues**
   - Ensure DATABASE_URL is correctly formatted
   - Check that your database allows connections from Render's IP ranges

3. **Build Timeouts**
   - Consider upgrading to a paid Render plan for faster builds

### Common Vercel Issues

1. **Environment Variables Not Working**
   - Ensure variables start with `REACT_APP_`
   - Redeploy after adding environment variables

2. **API Calls Failing**
   - Check that REACT_APP_API_URL points to your Render backend
   - Verify CORS settings in backend

### Monitoring

- **Render Logs**: Available in your service dashboard
- **Vercel Logs**: Available in your project dashboard → Functions tab
- **Database Monitoring**: Check your database dashboard for performance

## Security Notes

1. **Environment Variables**: Never commit real API keys to your repository
2. **CORS**: Ensure your backend only allows requests from your frontend domain
3. **HTTPS**: Both Render and Vercel provide HTTPS by default
4. **Database**: Use connection pooling and SSL for database connections

## Support

If you encounter issues:
1. Check the logs in Render/Vercel dashboards
2. Verify all environment variables are set correctly
3. Test API endpoints individually
4. Check OAuth configuration in Google Cloud Console
