@echo off
echo ========================================
echo   Nurse Scheduling System - Full Start
echo ========================================
echo.

echo Step 1: Checking MongoDB status...
sc query MongoDB | find "RUNNING" >nul
if %errorlevel% equ 0 (
    echo [OK] MongoDB is already running
) else (
    echo [WARNING] MongoDB is not running
    echo Please run START-MONGODB.bat as Administrator first!
    echo.
    pause
    exit /b 1
)

echo.
echo Step 2: Starting Backend Server (Port 5000)...
cd backend
start "Backend Server" cmd /k "node server.js"
timeout /t 3 >nul

echo.
echo Step 3: Starting Frontend (Port 5173)...
cd ..\frontend
start "Frontend Dev Server" cmd /k "npm run dev"

echo.
echo ========================================
echo   Both servers are starting...
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo Press any key to close this window...
pause >nul
