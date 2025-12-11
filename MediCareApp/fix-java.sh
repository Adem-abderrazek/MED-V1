#!/bin/bash
# Fix Java JDK installation for Android builds
# Run with: sudo ./fix-java.sh

if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  This script must be run with sudo"
    echo "Usage: sudo ./fix-java.sh"
    exit 1
fi

echo "☕ Fixing Java JDK installation..."
echo ""

# Check if javac exists
if ! command -v javac &> /dev/null; then
    echo "❌ javac (Java compiler) not found!"
    echo ""
    echo "Installing OpenJDK 17 Development Kit..."
    
    # Install JDK
    apt-get update -qq
    apt-get install -y openjdk-17-jdk
    
    echo ""
    echo "✅ OpenJDK 17 JDK installed"
else
    echo "✅ javac found: $(which javac)"
    javac -version
fi

echo ""
echo "📋 Java setup:"
java -version
echo ""
javac -version 2>&1 || echo "⚠️  javac still not found"

echo ""
echo "✅ Java fix complete!"
echo ""
echo "If javac is still missing, you may need to:"
echo "  1. Install: sudo apt-get install openjdk-17-jdk"
echo "  2. Set JAVA_HOME: export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64"
echo ""
echo "Then try: npx expo run:android"


