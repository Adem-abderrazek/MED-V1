#!/bin/bash
# Android build script with proper environment setup
export ANDROID_HOME=/usr/lib/android-sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/emulator

echo "🚀 Starting Android build..."
echo "📱 ANDROID_HOME: $ANDROID_HOME"
echo ""

npx expo run:android
