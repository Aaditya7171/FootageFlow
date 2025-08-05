@echo off
echo Setting up FootageFlow MVP...
echo.

echo Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo Failed to install backend dependencies
    pause
    exit /b 1
)

echo Setting up database...
call npx prisma db push
if %errorlevel% neq 0 (
    echo Failed to setup database
    pause
    exit /b 1
)

call npx prisma generate
if %errorlevel% neq 0 (
    echo Failed to generate Prisma client
    pause
    exit /b 1
)

echo.
echo Installing frontend dependencies...
cd ..\frontend
call npm install
if %errorlevel% neq 0 (
    echo Failed to install frontend dependencies
    pause
    exit /b 1
)

echo.
echo Setup complete!
echo.
echo To start the application:
echo 1. Backend: cd backend && npm run dev
echo 2. Frontend: cd frontend && npm start
echo.
echo Backend will run on: http://localhost:5174
echo Frontend will run on: http://localhost:5173
echo.
pause
