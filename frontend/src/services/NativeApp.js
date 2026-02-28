/**
 * Kona Native App Integration
 * Capacitor plugins for iOS and Android native features
 */

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Network } from '@capacitor/network';
import { Share } from '@capacitor/share';
import { Browser } from '@capacitor/browser';
import { Device } from '@capacitor/device';
import { NativeBiometric, BiometryType } from 'capacitor-native-biometric';

// Check if running as native app
export const isNativeApp = () => Capacitor.isNativePlatform();
export const getPlatform = () => Capacitor.getPlatform(); // 'ios', 'android', 'web'

/**
 * Initialize native app features
 */
export const initializeNativeApp = async () => {
  if (!isNativeApp()) return;

  try {
    // Hide splash screen after app loads
    await SplashScreen.hide();

    // Set status bar style
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0f0f23' });

    // Setup app lifecycle listeners
    setupAppListeners();

    // Setup network listener
    setupNetworkListener();

    console.log('Native app initialized successfully');
  } catch (error) {
    console.error('Native app initialization error:', error);
  }
};

/**
 * App lifecycle listeners
 */
const setupAppListeners = () => {
  // Handle app state changes
  App.addListener('appStateChange', ({ isActive }) => {
    console.log('App state changed. Is active:', isActive);
    if (isActive) {
      // App came to foreground
      window.dispatchEvent(new CustomEvent('app:resume'));
    } else {
      // App went to background
      window.dispatchEvent(new CustomEvent('app:pause'));
    }
  });

  // Handle back button (Android)
  App.addListener('backButton', ({ canGoBack }) => {
    if (!canGoBack) {
      App.exitApp();
    } else {
      window.history.back();
    }
  });

  // Handle deep links
  App.addListener('appUrlOpen', (event) => {
    console.log('Deep link opened:', event.url);
    window.dispatchEvent(new CustomEvent('app:deeplink', { detail: event.url }));
  });
};

/**
 * Network status listener
 */
let networkStatus = { connected: true, connectionType: 'wifi' };

const setupNetworkListener = () => {
  Network.addListener('networkStatusChange', (status) => {
    networkStatus = status;
    console.log('Network status changed:', status);
    window.dispatchEvent(new CustomEvent('app:networkChange', { detail: status }));
  });

  // Get initial status
  Network.getStatus().then((status) => {
    networkStatus = status;
  });
};

export const getNetworkStatus = () => networkStatus;

/**
 * Push Notifications
 */
export const initPushNotifications = async (onTokenReceived, onNotificationReceived) => {
  if (!isNativeApp()) return null;

  try {
    // Request permission
    const permStatus = await PushNotifications.requestPermissions();
    
    if (permStatus.receive !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }

    // Register for push notifications
    await PushNotifications.register();

    // Listen for registration
    PushNotifications.addListener('registration', (token) => {
      console.log('Push registration success, token:', token.value);
      if (onTokenReceived) onTokenReceived(token.value);
    });

    // Listen for registration errors
    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error);
    });

    // Listen for push notifications received
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received:', notification);
      if (onNotificationReceived) onNotificationReceived(notification);
    });

    // Listen for push notification action (tapped)
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('Push notification action:', action);
      window.dispatchEvent(new CustomEvent('app:notificationTapped', { detail: action }));
    });

    return true;
  } catch (error) {
    console.error('Push notification setup error:', error);
    return null;
  }
};

/**
 * Local Notifications
 */
export const showLocalNotification = async ({ title, body, id = Date.now(), data = {} }) => {
  if (!isNativeApp()) {
    // Fallback to web notifications
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
    return;
  }

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title,
          body,
          schedule: { at: new Date(Date.now() + 100) },
          extra: data,
          smallIcon: 'ic_stat_icon',
          iconColor: '#8b5cf6'
        }
      ]
    });
  } catch (error) {
    console.error('Local notification error:', error);
  }
};

/**
 * Biometric Authentication
 */
export const checkBiometricAvailability = async () => {
  if (!isNativeApp()) return { available: false, type: null };

  try {
    const result = await NativeBiometric.isAvailable();
    return {
      available: result.isAvailable,
      type: result.biometryType, // 'fingerprint', 'faceId', 'touchId', 'iris'
      errorCode: result.errorCode
    };
  } catch (error) {
    console.error('Biometric check error:', error);
    return { available: false, type: null };
  }
};

export const authenticateWithBiometric = async (options = {}) => {
  if (!isNativeApp()) return { success: false, error: 'Not a native app' };

  const {
    title = 'Kona Login',
    subtitle = 'Use biometrics to sign in',
    description = 'Place your finger on the sensor or look at your device',
    negativeButtonText = 'Cancel'
  } = options;

  try {
    await NativeBiometric.verifyIdentity({
      title,
      subtitle,
      description,
      negativeButtonText,
      maxAttempts: 3
    });
    return { success: true };
  } catch (error) {
    console.error('Biometric auth error:', error);
    return { success: false, error: error.message || 'Authentication failed' };
  }
};

// Store credentials securely with biometric protection
export const setSecureCredentials = async (server, username, password) => {
  if (!isNativeApp()) {
    // Fallback to localStorage for web (not secure, just for demo)
    localStorage.setItem(`kona_cred_${server}`, JSON.stringify({ username, password }));
    return true;
  }

  try {
    await NativeBiometric.setCredentials({
      server,
      username,
      password
    });
    return true;
  } catch (error) {
    console.error('Set credentials error:', error);
    return false;
  }
};

export const getSecureCredentials = async (server) => {
  if (!isNativeApp()) {
    const cred = localStorage.getItem(`kona_cred_${server}`);
    return cred ? JSON.parse(cred) : null;
  }

  try {
    const credentials = await NativeBiometric.getCredentials({ server });
    return credentials;
  } catch (error) {
    console.error('Get credentials error:', error);
    return null;
  }
};

export const deleteSecureCredentials = async (server) => {
  if (!isNativeApp()) {
    localStorage.removeItem(`kona_cred_${server}`);
    return true;
  }

  try {
    await NativeBiometric.deleteCredentials({ server });
    return true;
  } catch (error) {
    console.error('Delete credentials error:', error);
    return false;
  }
};

/**
 * Haptic Feedback
 */
export const hapticFeedback = async (type = 'light') => {
  if (!isNativeApp()) return;

  try {
    switch (type) {
      case 'light':
        await Haptics.impact({ style: ImpactStyle.Light });
        break;
      case 'medium':
        await Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case 'heavy':
        await Haptics.impact({ style: ImpactStyle.Heavy });
        break;
      case 'success':
        await Haptics.notification({ type: NotificationType.Success });
        break;
      case 'warning':
        await Haptics.notification({ type: NotificationType.Warning });
        break;
      case 'error':
        await Haptics.notification({ type: NotificationType.Error });
        break;
      case 'selection':
        await Haptics.selectionStart();
        await Haptics.selectionChanged();
        await Haptics.selectionEnd();
        break;
      default:
        await Haptics.impact({ style: ImpactStyle.Light });
    }
  } catch (error) {
    console.error('Haptic feedback error:', error);
  }
};

/**
 * Share Content
 */
export const shareContent = async ({ title, text, url, dialogTitle = 'Share via' }) => {
  if (!isNativeApp()) {
    // Use Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
    return { success: false, error: 'Share not supported' };
  }

  try {
    await Share.share({ title, text, url, dialogTitle });
    return { success: true };
  } catch (error) {
    console.error('Share error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Open External URL
 */
export const openExternalUrl = async (url) => {
  if (!isNativeApp()) {
    window.open(url, '_blank');
    return;
  }

  try {
    await Browser.open({ url, presentationStyle: 'popover' });
  } catch (error) {
    console.error('Browser open error:', error);
    window.open(url, '_blank');
  }
};

/**
 * Get Device Info
 */
export const getDeviceInfo = async () => {
  try {
    const info = await Device.getInfo();
    const id = await Device.getId();
    return {
      ...info,
      deviceId: id.identifier
    };
  } catch (error) {
    console.error('Device info error:', error);
    return {
      platform: 'web',
      operatingSystem: navigator.platform,
      model: navigator.userAgent
    };
  }
};

/**
 * Hide/Show Splash Screen
 */
export const hideSplashScreen = async () => {
  if (!isNativeApp()) return;
  try {
    await SplashScreen.hide();
  } catch (error) {
    console.error('Hide splash error:', error);
  }
};

export const showSplashScreen = async () => {
  if (!isNativeApp()) return;
  try {
    await SplashScreen.show({
      autoHide: false,
      showDuration: 2000
    });
  } catch (error) {
    console.error('Show splash error:', error);
  }
};

// Export everything as a module
const NativeApp = {
  isNativeApp,
  getPlatform,
  initializeNativeApp,
  getNetworkStatus,
  initPushNotifications,
  showLocalNotification,
  checkBiometricAvailability,
  authenticateWithBiometric,
  setSecureCredentials,
  getSecureCredentials,
  deleteSecureCredentials,
  hapticFeedback,
  shareContent,
  openExternalUrl,
  getDeviceInfo,
  hideSplashScreen,
  showSplashScreen
};

export default NativeApp;
