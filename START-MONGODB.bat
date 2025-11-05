@echo off
echo Starting MongoDB Service...
net start MongoDB
if %errorlevel% equ 0 (
    echo MongoDB started successfully!
    echo.
    echo Now you can start the backend server.
    echo Run: cd backend && node server.js
) else (
    echo Failed to start MongoDB. Please run this file as Administrator.
    echo Right-click and select "Run as administrator"
)
pause
