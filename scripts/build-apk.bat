@echo off
REM TurboMeta Agent HUD - Android APK Build Script (Windows)
REM Usage: build-apk.bat [debug|release]

setlocal

set PROJECT_DIR=%~dp0..
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set ANDROID_HOME=C:\Users\speed\AppData\Local\Android\Sdk
set BUILD_TYPE=%1
if "%BUILD_TYPE%"=="" set BUILD_TYPE=debug

echo =========================================
echo   TurboMeta Agent HUD - APK Builder
echo =========================================
echo.
echo Project: %PROJECT_DIR%
echo Java:    %JAVA_HOME%
echo SDK:     %ANDROID_HOME%
echo Build:   %BUILD_TYPE%
echo.

REM Step 1: Build web assets
echo [1/4] Building web assets...
cd /d "%PROJECT_DIR%"
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Web build failed
    exit /b 1
)

REM Step 2: Sync Capacitor
echo.
echo [2/4] Syncing Capacitor...
call npx cap sync android
if %errorlevel% neq 0 (
    echo ERROR: Capacitor sync failed
    exit /b 1
)

REM Step 3: Build APK
echo.
echo [3/4] Building APK...
cd /d "%PROJECT_DIR%\android"
set PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%

if "%BUILD_TYPE%"=="release" (
    call gradlew assembleRelease
) else (
    call gradlew assembleDebug
)
if %errorlevel% neq 0 (
    echo ERROR: Gradle build failed
    exit /b 1
)

REM Step 4: Show result
echo.
echo [4/4] Build complete!
set APK_PATH=%PROJECT_DIR%\android\app\build\outputs\apk\%BUILD_TYPE%\app-%BUILD_TYPE%.apk
if exist "%APK_PATH%" (
    echo.
    echo =========================================
    echo   APK generated successfully!
    echo =========================================
    echo   Path: %APK_PATH%
    dir "%APK_PATH%"
    echo.
    echo   Install to device:
    echo     adb install "%APK_PATH%"
    echo =========================================
) else (
    echo ERROR: APK not found at expected path
    exit /b 1
)

endlocal
