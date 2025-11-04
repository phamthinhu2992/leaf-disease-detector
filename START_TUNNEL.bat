@echo off
REM Leaf Disease Detector - Start with HTTPS Tunnel
REM This script starts the server and creates an HTTPS tunnel using ngrok

echo.
echo 🌐 =======================================
echo 🌐 HTTPS Tunnel Setup with ngrok
echo 🌐 =======================================
echo.

REM Check if ngrok is installed
where ngrok >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ ngrok is not installed
    echo Run: npm install -g ngrok
    pause
    exit /b 1
)

REM Start ngrok tunnel
echo 🚀 Starting HTTPS tunnel...
echo.
echo 📍 Local server: http://localhost:8765
echo 🌐 Public HTTPS will be shown below:
echo.

ngrok http 8765 --log=stdout

echo.
echo ✅ Tunnel is active!
echo Share the HTTPS URL above with others
echo.

pause
