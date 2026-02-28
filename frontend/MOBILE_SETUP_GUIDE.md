# Kona Mobile App - Production Setup Guide

## Overview

This guide covers setting up:
1. **Firebase** - Analytics, Push Notifications, Crashlytics
2. **Codemagic** - CI/CD for iOS and Android builds
3. **App Store Connect** - iOS distribution
4. **Google Play Console** - Android distribution

---

## 1. Firebase Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add Project"
3. Name it "Kona" or "Kona Streaming"
4. Enable Google Analytics (recommended)
5. Select or create an Analytics account

### Step 2: Add iOS App

1. In Firebase Console, click "Add app" → iOS
2. **Bundle ID**: `com.kona.streaming`
3. **App nickname**: Kona iOS
4. Download `GoogleService-Info.plist`
5. Place it in: `frontend/ios/App/App/GoogleService-Info.plist`

### Step 3: Add Android App

1. Click "Add app" → Android
2. **Package name**: `com.kona.streaming`
3. **App nickname**: Kona Android
4. **SHA-1**: (Get from your keystore - see below)
5. Download `google-services.json`
6. Place it in: `frontend/android/app/google-services.json`

### Step 4: Get SHA-1 for Android

```bash
# For debug keystore
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# For release keystore
keytool -list -v -keystore your-release-key.keystore -alias your-alias
```

### Step 5: Update Firebase Config

Edit `frontend/src/services/Firebase.js` with your config:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "kona-xxxxx.firebaseapp.com",
  projectId: "kona-xxxxx",
  storageBucket: "kona-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
  measurementId: "G-XXXXXXX"
};
```

Or use environment variables in `.env`:
```
REACT_APP_FIREBASE_API_KEY=AIza...
REACT_APP_FIREBASE_AUTH_DOMAIN=kona-xxxxx.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=kona-xxxxx
REACT_APP_FIREBASE_STORAGE_BUCKET=kona-xxxxx.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abc123
REACT_APP_FIREBASE_MEASUREMENT_ID=G-XXXXXXX
```

### Step 6: Enable Firebase Services

In Firebase Console:
- **Analytics**: Enabled by default
- **Cloud Messaging**: Go to Project Settings → Cloud Messaging → Enable
- **Crashlytics**: Go to Crashlytics → Enable

---

## 2. Codemagic Setup

### Step 1: Sign Up

1. Go to [Codemagic](https://codemagic.io)
2. Sign up with GitHub/GitLab/Bitbucket
3. Connect your Kona repository

### Step 2: Add Repository

1. Click "Add application"
2. Select your repository
3. Select "React Native App" or "Other"
4. Codemagic will detect `codemagic.yaml`

### Step 3: Configure iOS Signing

In Codemagic Dashboard → App Settings → Environment Variables:

**App Store Connect API Key:**
1. Go to [App Store Connect](https://appstoreconnect.apple.com) → Users → Keys
2. Generate new API key (Admin role)
3. Download the .p8 file

Add to Codemagic:
```
APP_STORE_CONNECT_KEY_IDENTIFIER = XXXXXXXXXX
APP_STORE_CONNECT_ISSUER_ID = xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
APP_STORE_CONNECT_PRIVATE_KEY = (content of .p8 file)
```

**Apple Distribution Certificate:**
1. In Xcode → Preferences → Accounts → Manage Certificates
2. Create Apple Distribution certificate
3. Export as .p12 file

Add to Codemagic:
```
CERTIFICATE_PRIVATE_KEY = (base64 encoded .p12)
```

### Step 4: Configure Android Signing

**Generate Release Keystore:**
```bash
keytool -genkey -v -keystore kona-release.keystore -alias kona -keyalg RSA -keysize 2048 -validity 10000
```

**Add to Codemagic:**
```bash
# Base64 encode keystore
base64 -i kona-release.keystore | pbcopy
```

Add environment variables:
```
KEYSTORE = (base64 encoded keystore)
KEYSTORE_PASSWORD = your_keystore_password
KEY_ALIAS = kona
KEY_PASSWORD = your_key_password
```

### Step 5: Google Play Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create Service Account with "Service Account User" role
3. In Play Console → Setup → API access → Link service account
4. Grant "Release manager" permission
5. Download JSON key

Add to Codemagic:
```
GCLOUD_SERVICE_ACCOUNT_CREDENTIALS = (content of JSON key)
```

### Step 6: Trigger Build

1. Push to `main` branch, or
2. Create a tag `v1.0.0`, or
3. Click "Start new build" in Codemagic

---

## 3. App Store Connect Setup (iOS)

### Step 1: Create App

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. My Apps → "+" → New App
3. Fill in:
   - **Platform**: iOS
   - **Name**: Kona
   - **Primary Language**: English
   - **Bundle ID**: com.kona.streaming
   - **SKU**: kona-ios-001

### Step 2: App Information

Fill in from `app-store/ios/APP_STORE_LISTING.md`:
- Subtitle
- Category
- Age Rating
- Privacy Policy URL

### Step 3: Prepare Submission

- Add screenshots (all required sizes)
- Add app preview video (optional)
- Fill in description, keywords
- Set pricing

### Step 4: TestFlight

1. Codemagic uploads build to TestFlight automatically
2. Add testers in TestFlight section
3. Submit for Beta App Review (first time only)

---

## 4. Google Play Console Setup (Android)

### Step 1: Create App

1. Go to [Play Console](https://play.google.com/console)
2. All apps → Create app
3. Fill in:
   - **App name**: Kona
   - **Default language**: English
   - **App or game**: App
   - **Free or paid**: Free

### Step 2: Store Listing

Fill in from `app-store/android/PLAY_STORE_LISTING.md`:
- Short description
- Full description
- Screenshots
- Feature graphic

### Step 3: Content Rating

Complete the content rating questionnaire

### Step 4: App Content

- Set up privacy policy
- Ads declaration
- Target audience

### Step 5: Release

1. Create Internal testing track
2. Codemagic uploads AAB automatically
3. Promote to production when ready

---

## 5. Environment Variables Summary

### Frontend `.env`
```
# Firebase
REACT_APP_FIREBASE_API_KEY=
REACT_APP_FIREBASE_AUTH_DOMAIN=
REACT_APP_FIREBASE_PROJECT_ID=
REACT_APP_FIREBASE_STORAGE_BUCKET=
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=
REACT_APP_FIREBASE_APP_ID=
REACT_APP_FIREBASE_MEASUREMENT_ID=
REACT_APP_FIREBASE_VAPID_KEY=

# Backend
REACT_APP_BACKEND_URL=https://api.kona.com
```

### Codemagic Environment Variables
```
# iOS
APP_STORE_CONNECT_KEY_IDENTIFIER=
APP_STORE_CONNECT_ISSUER_ID=
APP_STORE_CONNECT_PRIVATE_KEY=
CERTIFICATE_PRIVATE_KEY=

# Android
KEYSTORE=
KEYSTORE_PASSWORD=
KEY_ALIAS=
KEY_PASSWORD=
GCLOUD_SERVICE_ACCOUNT_CREDENTIALS=

# Firebase
FIREBASE_TOKEN=
```

---

## 6. Checklist Before First Build

### iOS
- [ ] Apple Developer account ($99/year)
- [ ] App Store Connect app created
- [ ] API key generated
- [ ] Bundle ID registered
- [ ] GoogleService-Info.plist in place

### Android
- [ ] Google Play Developer account ($25)
- [ ] Play Console app created
- [ ] Service account configured
- [ ] Release keystore generated
- [ ] google-services.json in place

### Codemagic
- [ ] Repository connected
- [ ] All environment variables set
- [ ] iOS signing configured
- [ ] Android signing configured

---

## 7. Useful Commands

```bash
# Build locally
cd frontend
yarn build
npx cap sync

# Open in Xcode
npx cap open ios

# Open in Android Studio
npx cap open android

# Run on iOS simulator
npx cap run ios

# Run on Android emulator
npx cap run android
```

---

## Support

- **Codemagic Docs**: https://docs.codemagic.io
- **Capacitor Docs**: https://capacitorjs.com/docs
- **Firebase Docs**: https://firebase.google.com/docs
- **App Store Connect Help**: https://developer.apple.com/help/app-store-connect
- **Play Console Help**: https://support.google.com/googleplay/android-developer
