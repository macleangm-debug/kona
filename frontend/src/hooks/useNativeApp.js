/**
 * useNativeApp Hook
 * React hook for easy access to native app features
 */

import { useState, useEffect, useCallback } from 'react';
import NativeApp from '../services/NativeApp';

/**
 * Hook for native app platform detection
 */
export const useNativePlatform = () => {
  const [platform, setPlatform] = useState('web');
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(NativeApp.isNativeApp());
    setPlatform(NativeApp.getPlatform());
  }, []);

  return { platform, isNative, isIOS: platform === 'ios', isAndroid: platform === 'android' };
};

/**
 * Hook for network status
 */
export const useNetworkStatus = () => {
  const [status, setStatus] = useState({ connected: true, connectionType: 'wifi' });

  useEffect(() => {
    // Get initial status
    setStatus(NativeApp.getNetworkStatus());

    // Listen for changes
    const handleNetworkChange = (event) => {
      setStatus(event.detail);
    };

    window.addEventListener('app:networkChange', handleNetworkChange);
    return () => window.removeEventListener('app:networkChange', handleNetworkChange);
  }, []);

  return status;
};

/**
 * Hook for biometric authentication
 */
export const useBiometric = () => {
  const [available, setAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkBiometric = async () => {
      const result = await NativeApp.checkBiometricAvailability();
      setAvailable(result.available);
      setBiometryType(result.type);
      setLoading(false);
    };
    checkBiometric();
  }, []);

  const authenticate = useCallback(async (options) => {
    if (!available) return { success: false, error: 'Biometric not available' };
    return await NativeApp.authenticateWithBiometric(options);
  }, [available]);

  return {
    available,
    biometryType,
    loading,
    authenticate,
    isFaceId: biometryType === 'faceId',
    isTouchId: biometryType === 'touchId' || biometryType === 'fingerprint'
  };
};

/**
 * Hook for app lifecycle events
 */
export const useAppLifecycle = (onResume, onPause) => {
  useEffect(() => {
    const handleResume = () => onResume && onResume();
    const handlePause = () => onPause && onPause();

    window.addEventListener('app:resume', handleResume);
    window.addEventListener('app:pause', handlePause);

    return () => {
      window.removeEventListener('app:resume', handleResume);
      window.removeEventListener('app:pause', handlePause);
    };
  }, [onResume, onPause]);
};

/**
 * Hook for deep links
 */
export const useDeepLink = (onDeepLink) => {
  useEffect(() => {
    const handleDeepLink = (event) => {
      if (onDeepLink) onDeepLink(event.detail);
    };

    window.addEventListener('app:deeplink', handleDeepLink);
    return () => window.removeEventListener('app:deeplink', handleDeepLink);
  }, [onDeepLink]);
};

/**
 * Hook for push notifications
 */
export const usePushNotifications = () => {
  const [token, setToken] = useState(null);
  const [permission, setPermission] = useState('prompt');
  const [lastNotification, setLastNotification] = useState(null);
  const { isNative } = useNativePlatform();

  useEffect(() => {
    if (!isNative) return;

    const setupPush = async () => {
      await NativeApp.initPushNotifications(
        (t) => {
          setToken(t);
          setPermission('granted');
        },
        (notification) => {
          setLastNotification(notification);
        }
      );
    };

    setupPush();
  }, [isNative]);

  return { token, permission, lastNotification };
};

/**
 * Hook for haptic feedback
 */
export const useHaptics = () => {
  const { isNative } = useNativePlatform();

  const impact = useCallback((style = 'light') => {
    if (isNative) NativeApp.hapticFeedback(style);
  }, [isNative]);

  const success = useCallback(() => impact('success'), [impact]);
  const warning = useCallback(() => impact('warning'), [impact]);
  const error = useCallback(() => impact('error'), [impact]);
  const selection = useCallback(() => impact('selection'), [impact]);

  return { impact, success, warning, error, selection };
};

/**
 * Hook for sharing content
 */
export const useShare = () => {
  const share = useCallback(async (options) => {
    return await NativeApp.shareContent(options);
  }, []);

  return { share };
};

/**
 * Main hook combining all native features
 */
export const useNativeApp = () => {
  const platform = useNativePlatform();
  const network = useNetworkStatus();
  const biometric = useBiometric();
  const haptics = useHaptics();
  const { share } = useShare();

  return {
    ...platform,
    network,
    biometric,
    haptics,
    share,
    openUrl: NativeApp.openExternalUrl,
    showNotification: NativeApp.showLocalNotification,
    getDeviceInfo: NativeApp.getDeviceInfo
  };
};

export default useNativeApp;
