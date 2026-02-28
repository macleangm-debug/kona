/**
 * Firebase Configuration for Kona
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to https://console.firebase.google.com
 * 2. Create a new project named "Kona"
 * 3. Add iOS app (com.kona.streaming) and Android app (com.kona.streaming)
 * 4. Download google-services.json (Android) and GoogleService-Info.plist (iOS)
 * 5. Replace the config below with your actual Firebase config
 * 6. Place google-services.json in /android/app/
 * 7. Place GoogleService-Info.plist in /ios/App/App/
 */

import { initializeApp } from 'firebase/app';
import { getAnalytics, logEvent, setUserProperties } from 'firebase/analytics';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { Capacitor } from '@capacitor/core';

// Firebase configuration - REPLACE WITH YOUR ACTUAL CONFIG
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "kona-app.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "kona-app",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "kona-app.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "YOUR_APP_ID",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "YOUR_MEASUREMENT_ID"
};

// Initialize Firebase
let app = null;
let analytics = null;
let messaging = null;

export const initializeFirebase = () => {
  try {
    // Don't initialize if config is not set
    if (firebaseConfig.apiKey === "YOUR_API_KEY") {
      console.warn('Firebase not configured. Add your Firebase config to use analytics and push notifications.');
      return null;
    }

    app = initializeApp(firebaseConfig);
    
    // Analytics only works in browser
    if (typeof window !== 'undefined' && !Capacitor.isNativePlatform()) {
      analytics = getAnalytics(app);
    }
    
    console.log('Firebase initialized successfully');
    return app;
  } catch (error) {
    console.error('Firebase initialization error:', error);
    return null;
  }
};

/**
 * Analytics Functions
 */
export const trackEvent = (eventName, params = {}) => {
  if (!analytics) return;
  
  try {
    logEvent(analytics, eventName, params);
  } catch (error) {
    console.error('Analytics error:', error);
  }
};

// Pre-defined events for Kona
export const KonaAnalytics = {
  // Content Events
  viewSeries: (seriesId, seriesTitle) => 
    trackEvent('view_series', { series_id: seriesId, series_title: seriesTitle }),
  
  playEpisode: (seriesId, episodeId, episodeNumber) => 
    trackEvent('play_episode', { series_id: seriesId, episode_id: episodeId, episode_number: episodeNumber }),
  
  completeEpisode: (seriesId, episodeId, watchTime) => 
    trackEvent('complete_episode', { series_id: seriesId, episode_id: episodeId, watch_time_seconds: watchTime }),
  
  // Engagement Events
  likeContent: (contentId, contentType) => 
    trackEvent('like_content', { content_id: contentId, content_type: contentType }),
  
  shareContent: (contentId, platform) => 
    trackEvent('share_content', { content_id: contentId, share_platform: platform }),
  
  addToWatchlist: (seriesId) => 
    trackEvent('add_to_watchlist', { series_id: seriesId }),
  
  // Monetization Events
  purchaseCoins: (amount, price, currency) => 
    trackEvent('purchase', { value: price, currency: currency, items: [{ item_name: 'coins', quantity: amount }] }),
  
  tipCreator: (creatorId, amount) => 
    trackEvent('tip_creator', { creator_id: creatorId, tip_amount: amount }),
  
  unlockContent: (contentId, coinsCost) => 
    trackEvent('unlock_content', { content_id: contentId, coins_spent: coinsCost }),
  
  // User Events
  signUp: (method) => 
    trackEvent('sign_up', { method: method }),
  
  login: (method) => 
    trackEvent('login', { method: method }),
  
  referFriend: (referralCode) => 
    trackEvent('refer_friend', { referral_code: referralCode }),
  
  // Creator Events
  uploadContent: (contentType) => 
    trackEvent('upload_content', { content_type: contentType }),
  
  publishSeries: (seriesId) => 
    trackEvent('publish_series', { series_id: seriesId }),
};

// Set user properties
export const setUserProperty = (name, value) => {
  if (!analytics) return;
  
  try {
    setUserProperties(analytics, { [name]: value });
  } catch (error) {
    console.error('Set user property error:', error);
  }
};

export const setKonaUserProperties = (user) => {
  if (!user) return;
  
  setUserProperty('user_type', user.role || 'viewer');
  setUserProperty('is_creator', user.is_creator ? 'yes' : 'no');
  setUserProperty('is_premium', user.is_premium ? 'yes' : 'no');
  setUserProperty('country', user.country || 'unknown');
  setUserProperty('language', user.language || 'en');
};

/**
 * Push Notifications (Web)
 */
export const initializeWebPush = async (onMessageCallback) => {
  if (Capacitor.isNativePlatform()) {
    // Use Capacitor push notifications for native
    return null;
  }

  if (!messaging) {
    try {
      messaging = getMessaging(app);
    } catch (error) {
      console.error('Messaging initialization error:', error);
      return null;
    }
  }

  try {
    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    // Get token
    const token = await getToken(messaging, {
      vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY
    });

    console.log('FCM Token:', token);

    // Listen for messages
    onMessage(messaging, (payload) => {
      console.log('Message received:', payload);
      if (onMessageCallback) {
        onMessageCallback(payload);
      }
    });

    return token;
  } catch (error) {
    console.error('Push notification error:', error);
    return null;
  }
};

/**
 * Crashlytics (Native only via Capacitor plugin)
 */
export const logCrashlytics = {
  log: (message) => {
    console.log('[Crashlytics]', message);
    // Native implementation handled by @capacitor-firebase/crashlytics
  },
  
  setUserId: (userId) => {
    console.log('[Crashlytics] User ID:', userId);
  },
  
  recordError: (error) => {
    console.error('[Crashlytics] Error:', error);
  }
};

export { app, analytics, messaging };
export default { initializeFirebase, trackEvent, KonaAnalytics, setKonaUserProperties };
