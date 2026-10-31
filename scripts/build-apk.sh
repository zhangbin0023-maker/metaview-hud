#!/bin/bash
# MetaView HUD — Android APK Build Script
# 使用 Capacitor 将 Web App 打包为 Android APK
# 
# 前提条件：
#   - Android Studio (含 JBR JDK)
#   - Android SDK (Build Tools 36.0.0)
#   - Node.js 18+
#
# 使用方法：
#   ./build-apk.sh          # 构建 debug APK
#   ./build-apk.sh release   # 构建 release APK (需要签名配置)

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$PROJECT_DIR/android"
JAVA_HOME="${JAVA_HOME:-C:\\Program Files\\Android\\Android Studio\\jbr}"
ANDROID_HOME="${ANDROID_HOME:-C:\\Users\\speed\\AppData\\Local\\Android\\Sdk}"

echo "========================================="
echo "  MetaView HUD — APK Builder"
echo "========================================="
echo ""
echo "Project: $PROJECT_DIR"
echo "Java:    $JAVA_HOME"
echo "SDK:     $ANDROID_HOME"
echo ""

# Step 1: Build web assets
echo "[1/4] Building web assets..."
cd "$PROJECT_DIR"
npm run build

# Step 2: Sync to Android
echo ""
echo "[2/4] Syncing Capacitor..."
npx cap sync android

# Step 3: Build APK
echo ""
echo "[3/4] Building APK..."
cd "$ANDROID_DIR"
export JAVA_HOME
export ANDROID_HOME
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

BUILD_TYPE="${1:-debug}"
if [ "$BUILD_TYPE" = "release" ]; then
    ./gradlew assembleRelease
else
    ./gradlew assembleDebug
fi

# Step 4: Show result
echo ""
echo "[4/4] Build complete!"
APK_PATH="$ANDROID_DIR/app/build/outputs/apk/$BUILD_TYPE/app-$BUILD_TYPE.apk"
if [ -f "$APK_PATH" ]; then
    echo ""
    echo "========================================="
    echo "  APK generated successfully!"
    echo "========================================="
    echo "  Path: $APK_PATH"
    ls -lh "$APK_PATH"
    echo ""
    echo "  Install to device:"
    echo "    adb install \"$APK_PATH\""
    echo "========================================="
else
    echo "ERROR: APK not found at expected path"
    exit 1
fi
