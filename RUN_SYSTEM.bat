@echo off
chcp 65001 > nul
title منظومة فحص وتسجيل المجندين - وحدة الأمن والتحريات

echo ======================================================================
echo       جمهورية مصر العربية - وزارة الداخلية - الإدارة العامة للأمن المركزي
echo             منطقة وسط الدلتا - مركز تدريب المجندين
echo                  وحدة الأمن والتحريات - تشغيل المنظومة
echo ======================================================================
echo.

:: 1. Launch standalone executable (.exe)
if exist "%~dp0RecruitsApp\RecruitsSecuritySystem.exe" (
    echo [✓] تشغيل البرنامج التنفيذي المستقل (.exe)...
    cd /d "%~dp0RecruitsApp"
    start "" "RecruitsSecuritySystem.exe"
    exit /b
)

:: 2. Fallback: Launch server and open window directly
cd /d "%~dp0"
echo [*] تشغيل خادم المنظومة...
start /b node server/server.js
timeout /t 2 > nul

:: Open via native Edge App Mode (Chromium Frameless Desktop Window)
start msedge --app=http://localhost:5000 2>nul || start chrome --app=http://localhost:5000 2>nul || start http://localhost:5000
