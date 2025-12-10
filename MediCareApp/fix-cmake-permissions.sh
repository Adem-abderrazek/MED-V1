#!/bin/bash
# Fix CMake installation permissions
# Run with: sudo ./fix-cmake-permissions.sh

if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  This script must be run with sudo"
    echo "Usage: sudo ./fix-cmake-permissions.sh"
    exit 1
fi

SDK_DIR="/usr/lib/android-sdk"

echo "🔧 Fixing CMake installation permissions..."
echo ""

# Create and make cmake directory writable
mkdir -p "$SDK_DIR/cmake"
chmod -R 777 "$SDK_DIR/cmake"
chown -R root:root "$SDK_DIR/cmake"
echo "✅ Made $SDK_DIR/cmake writable"

# Also ensure the SDK directory itself allows access
chmod 755 "$SDK_DIR"

# Make sure .temp directory is writable (Gradle uses this for downloads)
mkdir -p "$SDK_DIR/.temp"
chmod 777 "$SDK_DIR/.temp"
chown root:root "$SDK_DIR/.temp"
echo "✅ Made $SDK_DIR/.temp writable"

# Accept CMake license if needed
LICENSES_DIR="$SDK_DIR/licenses"
mkdir -p "$LICENSES_DIR"
# CMake license hash (if different from Android SDK license)
if [ ! -f "$LICENSES_DIR/android-sdk-license" ]; then
    echo "24333f8a63b6825ea9c5514f83c2829b004d1fee" > "$LICENSES_DIR/android-sdk-license"
    chmod 644 "$LICENSES_DIR/android-sdk-license"
    echo "✅ Created Android SDK license"
fi

echo ""
echo "✅ CMake permissions fixed!"
echo ""
echo "Gradle should now be able to install CMake 3.22.1"
echo ""
echo "Next step: Run 'npx expo run:android' again"


