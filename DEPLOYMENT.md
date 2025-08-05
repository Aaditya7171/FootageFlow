# FootageFlow Deployment Guide

This guide will help you deploy FootageFlow to production using Render (backend) and Vercel (frontend).

## 🚀 Pre-Deployment Checklist

### ✅ All Features Working
- [x] Groq Whisper transcription
- [x] Video story generation (actual video files)
- [x] Text story generation with modal display
- [x] EmailJS services (welcome, OTP, feedback)
- [x] Smart video tagging
- [x] Mobile-responsive design
- [x] Real-time status updates

### ✅ Environment Variables Ready
- [x] Database URL (PostgreSQL)
- [x] Cloudinary credentials
- [x] Google OAuth credentials
- [x] AI API keys (Gemini, Groq, Clarifai)
- [x] EmailJS configuration
- [x] JWT secret

## 🌐 Backend Deployment (Render)

### Step 1: Prepare Repository
1. Ensure all code is committed to GitHub
2. Verify `render.yaml` is in root directory
3. Check `backend/.env.example` exists

### Step 2: Create Render Service
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure service:
   - **Name**: `footageflow-backend`
   - **Environment**: `Node`
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Plan**: Free (or paid for better performance)

### Step 3: Environment Variables
Add these environment variables in Render:

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=your_postgresql_database_url
JWT_SECRET=your_super_secret_jwt_key
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
DEEPGRAM_API_KEY=your_deepgram_api_key
CLARIFAI_API_KEY=your_clarifai_api_key
ASSEMBLYAI_API_KEY=your_assemblyai_api_key
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

### Step 4: Deploy
1. Click "Create Web Service"
2. Wait for deployment to complete
3. Note your backend URL: `https://footageflow-backend.onrender.com`

## 🎨 Frontend Deployment (Vercel)

### Step 1: Prepare Frontend
1. Ensure `frontend/vercel.json` exists
2. Update API URL in environment variables

### Step 2: Create Vercel Project
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Step 3: Environment Variables
Add this environment variable in Vercel:

```env
VITE_API_URL=https://footageflow-backend.onrender.com
```

### Step 4: Deploy
1. Click "Deploy"
2. Wait for deployment to complete
3. Your frontend will be available at: `https://footage-flow.vercel.app`

## 🔧 Post-Deployment Configuration

### Update OAuth Redirect URLs
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to APIs & Services → Credentials
3. Edit your OAuth 2.0 Client ID
4. Add authorized redirect URIs:
   - `https://footageflow-backend.onrender.com/auth/google/callback`
   - `https://footage-flow.vercel.app/auth/callback`

### Update CORS Settings
The backend automatically allows your frontend URL based on `FRONTEND_URL` environment variable.

### Test Email Services
1. Test welcome email on new user registration
2. Test OTP email with forgot password
3. Test feedback email submission

## 📊 Monitoring & Maintenance

### Render Monitoring
- Check service logs in Render dashboard
- Monitor resource usage
- Set up alerts for downtime

### Vercel Monitoring
- Check deployment logs
- Monitor function execution
- Review analytics

### Database Maintenance
- Regular backups of PostgreSQL database
- Monitor connection limits
- Optimize queries if needed

## 🚨 Troubleshooting

### Common Issues

#### Backend Not Starting
- Check environment variables are set correctly
- Verify database connection string
- Check Render logs for specific errors

#### Frontend API Errors
- Verify `VITE_API_URL` points to correct backend
- Check CORS configuration
- Ensure backend is running

#### Email Services Not Working
- Verify EmailJS template IDs match
- Check API keys are correct
- Test templates in EmailJS dashboard

#### Video Processing Errors
- Ensure Cloudinary credentials are correct
- Check FFmpeg is available (should be automatic on Render)
- Verify video file formats are supported

### Performance Optimization

#### Backend
- Use Redis for caching (upgrade from memory storage)
- Optimize database queries
- Implement rate limiting

#### Frontend
- Enable Vercel Analytics
- Optimize images and assets
- Implement lazy loading

## 🔐 Security Considerations

### Production Security
- Use strong JWT secrets
- Enable HTTPS only
- Implement rate limiting
- Regular security updates

### API Keys
- Store all keys as environment variables
- Never commit keys to repository
- Rotate keys regularly
- Use least privilege access

## 📈 Scaling

### When to Scale
- High user traffic
- Video processing delays
- Database performance issues

### Scaling Options
- Upgrade Render plan
- Use Vercel Pro features
- Implement CDN for videos
- Add Redis caching
- Database read replicas

## ✅ Deployment Checklist

- [ ] Backend deployed to Render
- [ ] Frontend deployed to Vercel
- [ ] Environment variables configured
- [ ] OAuth redirect URLs updated
- [ ] Email services tested
- [ ] Video upload/processing tested
- [ ] Story generation tested
- [ ] Mobile responsiveness verified
- [ ] Performance optimized
- [ ] Monitoring set up

## 🎉 Go Live!

Once all checks pass, your FootageFlow application is ready for production use!

**Frontend**: https://footage-flow.vercel.app
**Backend**: https://footageflow-backend.onrender.com

---

For support during deployment, contact: footageflow01@gmail.com
