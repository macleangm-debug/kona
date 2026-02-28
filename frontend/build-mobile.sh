#!/bin/bash

# Kona Mobile App Build Script
# Builds iOS and Android apps using Capacitor

set -e

echo "🚀 Kona Mobile App Build Script"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the frontend directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Run this script from the frontend directory${NC}"
    exit 1
fi

# Function to print status
print_status() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Build React app
echo ""
echo "📦 Building React app..."
echo "------------------------"

# Set production API URL
export REACT_APP_BACKEND_URL="https://api.kona.com"

# Build the app
yarn build

if [ -d "build" ]; then
    print_status "React build completed"
else
    print_error "React build failed"
    exit 1
fi

# Sync Capacitor
echo ""
echo "🔄 Syncing Capacitor..."
echo "-----------------------"

npx cap sync

print_status "Capacitor sync completed"

# Check if iOS tools are available
echo ""
echo "📱 Platform Status"
echo "------------------"

if command -v xcodebuild &> /dev/null; then
    print_status "Xcode available - iOS build possible"
    IOS_AVAILABLE=true
else
    print_warning "Xcode not found - iOS build skipped"
    IOS_AVAILABLE=false
fi

if [ -d "$ANDROID_HOME" ] || [ -d "$ANDROID_SDK_ROOT" ]; then
    print_status "Android SDK found - Android build possible"
    ANDROID_AVAILABLE=true
else
    print_warning "Android SDK not found - Android build skipped"
    ANDROID_AVAILABLE=false
fi

# Build iOS
if [ "$IOS_AVAILABLE" = true ]; then
    echo ""
    echo "🍎 Building iOS..."
    echo "------------------"
    
    # Add iOS platform if not exists
    if [ ! -d "ios" ]; then
        npx cap add ios
    fi
    
    # Open Xcode for manual build
    echo "Opening Xcode... Build and archive from there."
    npx cap open ios
fi

# Build Android
if [ "$ANDROID_AVAILABLE" = true ]; then
    echo ""
    echo "🤖 Building Android..."
    echo "----------------------"
    
    # Add Android platform if not exists
    if [ ! -d "android" ]; then
        npx cap add android
    fi
    
    # Build APK
    cd android
    ./gradlew assembleRelease
    
    if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
        print_status "Android APK built: android/app/build/outputs/apk/release/app-release.apk"
    fi
    
    # Build AAB for Play Store
    ./gradlew bundleRelease
    
    if [ -f "app/build/outputs/bundle/release/app-release.aab" ]; then
        print_status "Android AAB built: android/app/build/outputs/bundle/release/app-release.aab"
    fi
    
    cd ..
fi

# Summary
echo ""
echo "================================"
echo "🎉 Build Complete!"
echo "================================"
echo ""
echo "Next steps:"
echo ""
if [ "$IOS_AVAILABLE" = true ]; then
    echo "iOS:"
    echo "  1. Open ios/App/App.xcworkspace in Xcode"
    echo "  2. Select your team for signing"
    echo "  3. Build and archive (Product → Archive)"
    echo "  4. Upload to App Store Connect"
fi
echo ""
if [ "$ANDROID_AVAILABLE" = true ]; then
    echo "Android:"
    echo "  1. APK location: android/app/build/outputs/apk/release/"
    echo "  2. AAB location: android/app/build/outputs/bundle/release/"
    echo "  3. Sign the APK/AAB with your release keystore"
    echo "  4. Upload AAB to Google Play Console"
fi
echo ""
echo "📚 Documentation:"
echo "  - iOS: app-store/ios/APP_STORE_LISTING.md"
echo "  - Android: app-store/android/PLAY_STORE_LISTING.md"
