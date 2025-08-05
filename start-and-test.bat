@echo off
echo.
echo ========================================
echo   FootageFlow MVP - Complete Startup
echo ========================================
echo.

echo 🔧 Checking prerequisites...

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

echo ✅ Node.js is installed

:: Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo ✅ npm is installed
echo.

echo 📦 Installing dependencies...
echo.

:: Install backend dependencies
echo Installing backend dependencies...
cd backend
if not exist node_modules (
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install backend dependencies
        pause
        exit /b 1
    )
)

:: Setup database
echo.
echo 🗄️ Setting up database...
call npx prisma db push
if %errorlevel% neq 0 (
    echo ❌ Failed to setup database
    pause
    exit /b 1
)

call npx prisma generate
if %errorlevel% neq 0 (
    echo ❌ Failed to generate Prisma client
    pause
    exit /b 1
)

echo ✅ Database setup complete

:: Install frontend dependencies
echo.
echo Installing frontend dependencies...
cd ..\frontend
if not exist node_modules (
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install frontend dependencies
        pause
        exit /b 1
    )
)

cd ..

echo ✅ All dependencies installed
echo.

echo 🚀 Starting servers...
echo.

:: Start backend server
echo Starting backend server...
start "FootageFlow Backend" cmd /k "cd backend && npm run dev"

:: Wait for backend to start
echo Waiting for backend to start...
timeout /t 5 /nobreak > nul

:: Test backend
echo.
echo 🧪 Testing backend API...
node test-api.js

if %errorlevel% neq 0 (
    echo ⚠️ Some backend tests failed, but continuing...
)

:: Wait a bit more
timeout /t 3 /nobreak > nul

:: Start frontend server
echo.
echo Starting frontend server...
start "FootageFlow Frontend" cmd /k "cd frontend && npm start"

echo.
echo ⏳ Waiting for frontend to start...
timeout /t 10 /nobreak > nul

echo.
echo ========================================
echo   🎉 FootageFlow MVP is now running!
echo ========================================
echo.
echo 🌐 Frontend: http://localhost:5173
echo 🔧 Backend:  http://localhost:5174
echo 📊 Health:   http://localhost:5174/health
echo.
echo 📝 What you can do now:
echo.
echo 1. 🔐 Login with Google OAuth
echo 2. 📤 Upload videos (drag & drop)
echo 3. 🤖 AI transcription & vision analysis
echo 4. 🔍 Smart search with natural language
echo 5. ✨ Generate AI-powered stories
echo.
echo 🎨 UI Features:
echo - Smooth animations and transitions
echo - Spotlight effects on key elements
echo - Gradient hover effects on buttons
echo - Interactive cards with hover animations
echo - Enhanced search with filters
echo - Story generator with suggestions
echo.
echo 🔧 Troubleshooting:
echo - If login fails, check Google OAuth credentials
echo - If upload fails, check Cloudinary configuration
echo - If AI features fail, check API keys (Gemini, AssemblyAI)
echo - Check browser console for any errors
echo.
echo Press Ctrl+C in the server windows to stop the servers
echo.

:: Try to open the browser
echo 🌐 Opening browser...
start http://localhost:5173

echo.
echo ✅ Setup complete! Check your browser.
echo.
pause
