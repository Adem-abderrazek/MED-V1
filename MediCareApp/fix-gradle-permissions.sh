#!/bin/bash
# Fix Gradle permissions after running with sudo
# Run with: sudo ./fix-gradle-permissions.sh

if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  This script must be run with sudo"
    echo "Usage: sudo ./fix-gradle-permissions.sh"
    exit 1
fi

PROJECT_DIR="/home/forgotten/Desktop/MED-V1/MediCareApp"
GRADLE_DIR="$PROJECT_DIR/android/.gradle"

echo "🔧 Fixing Gradle permissions..."
echo ""

# Get the current user (the one who ran sudo)
REAL_USER="${SUDO_USER:-$USER}"

if [ -d "$GRADLE_DIR" ]; then
    echo "📁 Found .gradle directory, fixing ownership..."
    chown -R "$REAL_USER:$REAL_USER" "$GRADLE_DIR"
    echo "✅ Fixed ownership of .gradle directory"
else
    echo "ℹ️  .gradle directory doesn't exist yet (will be created on next build)"
fi

# Also fix the android directory to be safe
if [ -d "$PROJECT_DIR/android" ]; then
    echo "📁 Fixing android directory ownership..."
    chown -R "$REAL_USER:$REAL_USER" "$PROJECT_DIR/android"
    echo "✅ Fixed ownership of android directory"
fi

echo ""
echo "✅ Gradle permissions fixed!"
echo ""
echo "You can now run: npx expo run:android"
echo ""

