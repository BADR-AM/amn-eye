@echo off
chcp 65001 > nul
title منظومة فحص وتسجيل المجندين - وحدة الأمن والتحريات

echo ======================================================================
echo       جمهورية مصر العربية - وزارة الداخلية - الإدارة العامة للأمن المركزي
echo             منطقة وسط الدلتا - مركز تدريب المجندين
echo                  وحدة الأمن والتحريات - تشغيل المنظومة
echo ======================================================================
echo.

cd /d "%~dp0"

:: 1. Launch standalone executable (.exe) if packaged
if exist "%~dp0RecruitsApp\RecruitsSecuritySystem.exe" (
    echo [✓] تشغيل البرنامج التنفيذي المستقل (.exe)...
    cd /d "%~dp0RecruitsApp"
    start "" "RecruitsSecuritySystem.exe"
    exit /b
)

:: 2. Ensure essential directories exist
if not exist "%~dp0data" mkdir "%~dp0data"
if not exist "%~dp0uploads" mkdir "%~dp0uploads"
if not exist "%~dp0assets\ai" mkdir "%~dp0assets\ai"
if not exist "%~dp0assets\runtimes" mkdir "%~dp0assets\runtimes"

:: 3. Check dependencies (node_modules)
if not exist "%~dp0node_modules" (
    echo [*] حزم المشروع غير مثبتة، جاري التثبيت التلقائي (npm install)...
    call npm install
    if errorlevel 1 (
        echo [X] حدث خطأ أثناء تثبيت الحزم. يرجى مراجعة موجه الأوامر.
        pause
        exit /b 1
    )
)

:: 4. Check frontend build (dist)
if not exist "%~dp0dist\index.html" (
    echo [*] واجهة المستخدم غير مبنية، جاري بناء الحزمة لأول مرة (npm run build)...
    call npm run build
    if errorlevel 1 (
        echo [X] فشل بناء واجهة المستخدم!
        pause
        exit /b 1
    )
)

:: 5. Launch server and open window directly
echo [*] تشغيل خادم المنظومة...
start /b node server/server.js
timeout /t 2 > nul

:: Open via native Edge App Mode (Chromium Frameless Desktop Window)
start msedge --app=http://localhost:5000 2>nul || start chrome --app=http://localhost:5000 2>nul || start http://localhost:5000
