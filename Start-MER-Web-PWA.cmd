@echo off
title UPPL MER Automation PWA
cd /d "%~dp0\web"
echo ========================================================
echo   UPPL MER Automation & Audit System - React PWA
echo   Starting local server...
echo ========================================================
start http://localhost:3300
npm run dev
pause
