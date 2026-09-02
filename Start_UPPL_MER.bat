@echo off
title UPPL MER Automation & Audit System
echo ========================================================
echo   UPPL MER Automation & Audit System (100%% Offline)
echo ========================================================
echo.
echo Starting application on local port 3300...
echo.

cd /d "%~dp0\web"
start "" http://localhost:3300
npm run dev

pause
