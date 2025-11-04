@echo off
title Stop AI Plant Disease Server
color 0C

echo.
echo =====================================
echo   🛑 STOPPING AI PLANT DETECTOR 🛑
echo =====================================
echo.

echo [1/3] 🔌 Stopping server processes...
for /f "tokens=5" %%i in ('netstat -ano ^| findstr :8765') do (
    echo Stopping server process %%i...
    taskkill /PID %%i /F >nul 2>&1
)

echo [2/3] 🌐 Stopping tunnel processes...
taskkill /IM node.exe /F >nul 2>&1
taskkill /F /IM "npx.cmd" >nul 2>&1

echo [3/3] 🧹 Cleaning up...
timeout /t 2 /nobreak >nul

echo.
echo ✅ All services stopped successfully!
echo.
pause