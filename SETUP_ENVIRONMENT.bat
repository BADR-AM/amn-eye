@echo off
chcp 65001 > nul
title منظومة فحص وتسجيل المجندين - تهيئة بيئة المشروع

echo ======================================================================
echo       جمهورية مصر العربية - وزارة الداخلية - الإدارة العامة للأمن المركزي
echo             منطقة وسط الدلتا - مركز تدريب المجندين
echo             وحدة الأمن والتحريات - تهيئة بيئة العمل والتثبيت
echo ======================================================================
echo.

cd /d "%~dp0"

:: 1. Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [X] خطأ: Node.js غير مثبت على هذا الجهاز!
    echo     يرجى تثبيت Node.js (الإصدار 18 أو 20 أو 22) من: https://nodejs.org
    pause
    exit /b 1
)

:: 2. Install dependencies if node_modules is missing or corrupted
echo [*] جاري التحقق من مكتبات وحزم المشروع (npm install)...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [!] حدث تنبيه أو خطأ أثناء تثبيت الحزم، جاري المحاولة بدون التبعيات الاختيارية...
    call npm install --no-audit
)

:: 3. Run Node setup script for directories and health checks
echo.
node scripts/setup-environment.js

:: 4. Build frontend bundle
echo.
echo [*] جاري بناء واجهة المستخدم (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    echo [X] حدث خطأ أثناء بناء واجهة المستخدم!
    pause
    exit /b 1
)

echo.
echo ======================================================================
echo  [✓] تمت تهيئة المنظومة بنجاح تام!
echo      - يمكنك الآن تشغيل المنظومة عبر: RUN_SYSTEM.bat
echo      - أو بناء برنامج التثبيت عبر: npm run dist
echo ======================================================================
echo.
pause
