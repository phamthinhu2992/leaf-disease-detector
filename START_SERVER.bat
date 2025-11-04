@echo off
title AI Plant Disease Detection - Professional Server
color 0A

echo.
echo =====================================
echo   🌿 AI PLANT DISEASE DETECTOR 🌿
echo        Professional Edition
echo =====================================
echo.

:: Kill any existing processes on port 8765
echo [1/5] 🧹 Cleaning up existing processes...
for /f "tokens=5" %%i in ('netstat -ano ^| findstr :8765') do (
    echo Stopping process %%i...
    taskkill /PID %%i /F >nul 2>&1
)
timeout /t 2 /nobreak >nul

:: Navigate to server directory
echo [2/5] 📂 Setting up environment...
cd /d "%~dp0server"
if not exist "dist" (
    echo Creating dist directory...
    mkdir dist
)

:: Build TypeScript
echo [3/5] 🔨 Building application...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed! Check your TypeScript code.
    pause
    exit /b 1
)

:: Start the server
echo [4/5] 🚀 Starting server...
start "" node dist/index.js

:: Wait for server to start
echo [5/5] ⏳ Waiting for server initialization...
timeout /t 5 /nobreak >nul

:: Start HTTPS tunnel
echo 🌐 Creating secure HTTPS tunnel...
start "" npx localtunnel --port 8765

:: Get local IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do set "LOCAL_IP=%%a"
set LOCAL_IP=%LOCAL_IP: =%

echo.
echo =====================================
echo        ✅ SERVER READY! ✅
echo =====================================
echo.
echo 📱 LOCAL ACCESS (Same WiFi):
echo    http://%LOCAL_IP%:8765/test-upload
echo    http://localhost:8765/test-upload
echo.
echo 🌍 HTTPS PUBLIC ACCESS:
echo    Check the tunnel window for HTTPS URL
echo    (Usually: https://xxxxx.loca.lt/test-upload)
echo.
echo 🔧 MANAGEMENT:
echo    Health Check: http://%LOCAL_IP%:8765/health
echo    API Docs: http://%LOCAL_IP%:8765/api
echo.
echo 💡 FEATURES:
echo    ✅ Camera capture (HTTPS required)
echo    ✅ File upload support
echo    ✅ 80+ plant diseases database
echo    ✅ AI chatbot assistance
echo    ✅ Real-time analysis
echo.
echo =====================================
echo Press any key to open web interface...
echo Or close this window to stop server
echo =====================================
pause >nul

:: Open default browser
start "" "http://localhost:8765/test-upload"

echo.
echo 🎉 Web interface opened!
echo Keep this window open to maintain server
echo Press Ctrl+C to stop server
echo.
pause