#!/bin/bash
# Fix all SDK directories for complete installation
# Run with: sudo ./fix-all-sdk-dirs.sh

if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  This script must be run with sudo"
    echo "Usage: sudo ./fix-all-sdk-dirs.sh"
    exit 1
fi

SDK_DIR="/usr/lib/android-sdk"

echo "🔧 Making all SDK directories writable..."
echo ""

# List of directories that Gradle needs to write to
DIRS=(
    "ndk"
    "build-tools"
    "platforms"
    "platform-tools"
    ".temp"
    "licenses"
)

for dir in "${DIRS[@]}"; do
    FULL_PATH="$SDK_DIR/$dir"
    if [ -d "$FULL_PATH" ]; then
        chmod -R 777 "$FULL_PATH"
        chown -R root:root "$FULL_PATH"
        echo "✅ Fixed: $dir"
    else
        mkdir -p "$FULL_PATH"
        chmod 777 "$FULL_PATH"
        chown root:root "$FULL_PATH"
        echo "✅ Created: $dir"
    fi
done

echo ""
echo "✅ All SDK directories are now writable!"
echo ""
echo "Gradle can now install:"
echo "  - NDK (already installed ✅)"
echo "  - Build-Tools 35"
echo "  - Platform 35"
echo ""
echo "Next step: Run 'npx expo run:android'"


