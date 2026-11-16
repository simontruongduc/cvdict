#!/usr/bin/env bash
# Builds the web app, syncs it into the Android project and assembles a debug APK.
set -euo pipefail
cd "$(dirname "$0")/.."
export JAVA_HOME="${JAVA_HOME_ANDROID:-/Applications/Android Studio.app/Contents/jbr/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
npm run build
npx cap sync android
(cd android && ./gradlew assembleDebug --console=plain)
cp android/app/build/outputs/apk/debug/app-debug.apk CVDict-debug.apk
echo "APK: $(pwd)/CVDict-debug.apk"
