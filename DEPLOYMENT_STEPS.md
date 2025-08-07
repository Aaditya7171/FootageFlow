# 🚀 FootageFlow Deployment Steps

## Current Status
- ✅ Backend URL: `https://footageflow.onrender.com`
- 🔄 Frontend: Needs to be deployed to Vercel

## 🔧 Fixes Applied

### Frontend Vercel Configuration Fixed
- Updated `vercel.json` to use proper Create React App configuration
- Removed conflicting build settings that were causing the deployment failure
- Updated API URL to point to your Render backend

## 📋 Step-by-Step Deployment

### 1. Redeploy Frontend to Vercel

**Option A: Redeploy Current Project**
1. Go to your Vercel dashboard
2. Find your `footage-flow` project
3. Go to Settings → Environment Variables
4. Add these environment variables:

```
REACT_APP_API_URL=https://footageflow.onrender.com
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_firebase_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_firebase_app_id
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
GENERATE_SOURCEMAP=false
```

4. Go to Deployments tab
5. Click "Redeploy" on the latest deployment

**Option B: Create New Project (Recommended)**
1. Delete the current failed project from Vercel
2. Create a new project:
   - **Repository**: `Aaditya7171/FootageFlow`
   - **Framework**: `Create React App`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `build` (auto-detected)
3. Add the environment variables listed above
4. Deploy

### 2. Update Backend Environment Variables

In your Render dashboard for the backend service, update:

```
FRONTEND_URL=https://your-vercel-app-url.vercel.app
```

Replace `your-vercel-app-url` with your actual Vercel app URL.

### 3. Update OAuth Configuration

**Google Cloud Console:**
1. Go to https://console.cloud.google.com
2. Navigate to APIs & Services → Credentials
3. Edit your OAuth 2.0 Client ID
4. Update **Authorized JavaScript origins**:
   - Add: `https://your-vercel-app-url.vercel.app`
   - Add: `https://footageflow.onrender.com`
5. Update **Authorized redirect URIs**:
   - Add: `https://footageflow.onrender.com/auth/google/callback`
   - Add: `https://your-vercel-app-url.vercel.app/auth/callback`

## 🔑 Required Environment Variables

### Backend (Render) - Already Set ✅
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
FRONTEND_URL=your_frontend_url_after_vercel_deployment
```

### Frontend (Vercel) - Need to Add ⚠️
```
REACT_APP_API_URL=https://footageflow.onrender.com
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_firebase_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_firebase_app_id
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
GENERATE_SOURCEMAP=false
```

## 🧪 Testing After Deployment

### 1. Backend Health Check
Visit: `https://footageflow.onrender.com/health`
Should return: `{"status": "OK", "timestamp": "...", "environment": "production"}`

### 2. Frontend Access
Visit your Vercel URL and test:
- ✅ Page loads without errors
- ✅ Google OAuth login works
- ✅ Video upload functionality
- ✅ API calls to backend work

### 3. Full Integration Test
1. Register/Login with Google
2. Upload a test video
3. Check if transcription and vision analysis work
4. Test search functionality
5. Generate an AI story

## 🔧 Troubleshooting

### Common Issues:

**1. CORS Errors**
- Ensure `FRONTEND_URL` in backend matches your Vercel URL exactly

**2. OAuth Errors**
- Check Google Cloud Console redirect URIs
- Ensure both HTTP and HTTPS URLs are added if needed

**3. API Connection Issues**
- Verify `REACT_APP_API_URL` in Vercel environment variables
- Check backend logs in Render dashboard

**4. Firebase Errors**
- Ensure all Firebase environment variables are set correctly
- Check Firebase project settings match the environment variables

## 📝 Next Steps After Successful Deployment

1. **Update Documentation**: Update README.md with production URLs
2. **Monitor Performance**: Check Render and Vercel dashboards for performance metrics
3. **Set up Monitoring**: Consider adding error tracking (Sentry, LogRocket, etc.)
4. **SSL Certificates**: Both Render and Vercel provide HTTPS automatically
5. **Custom Domain** (Optional): Add custom domain in Vercel settings

## 🆘 If You Need Help

1. Check deployment logs in Vercel/Render dashboards
2. Test API endpoints individually using tools like Postman
3. Verify all environment variables are set correctly
4. Check browser console for frontend errors
