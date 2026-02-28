/**
 * Network Status Components
 * Shows offline indicator and handles offline mode
 */

import React from 'react';
import { useNetworkStatus, useNativePlatform } from '@/hooks/useNativeApp';
import { WifiOff, Wifi, Signal } from 'lucide-react';

/**
 * Offline Banner - Shows when device is offline
 */
export const OfflineBanner = () => {
  const { connected, connectionType } = useNetworkStatus();
  
  if (connected) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white py-2 px-4 flex items-center justify-center gap-2 text-sm">
      <WifiOff className="w-4 h-4" />
      <span>You're offline. Some features may not work.</span>
    </div>
  );
};

/**
 * Network Status Icon - Shows current connection type
 */
export const NetworkStatusIcon = ({ className = '' }) => {
  const { connected, connectionType } = useNetworkStatus();
  const { isNative } = useNativePlatform();

  if (!isNative) return null;

  if (!connected) {
    return <WifiOff className={`w-4 h-4 text-red-400 ${className}`} />;
  }

  if (connectionType === 'wifi') {
    return <Wifi className={`w-4 h-4 text-green-400 ${className}`} />;
  }

  if (connectionType === 'cellular') {
    return <Signal className={`w-4 h-4 text-yellow-400 ${className}`} />;
  }

  return <Wifi className={`w-4 h-4 text-green-400 ${className}`} />;
};

/**
 * Offline Wrapper - Wraps content and shows offline message when needed
 */
export const OfflineWrapper = ({ children, offlineMessage = 'This content is not available offline' }) => {
  const { connected } = useNetworkStatus();

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <WifiOff className="w-12 h-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold mb-2">You're Offline</h3>
        <p className="text-sm text-muted-foreground">{offlineMessage}</p>
      </div>
    );
  }

  return children;
};

/**
 * Hook to check if specific content is available offline
 */
export const useOfflineContent = (contentId) => {
  const { connected } = useNetworkStatus();
  const [isAvailableOffline, setIsAvailableOffline] = React.useState(false);

  React.useEffect(() => {
    // Check if content is cached
    const checkCache = async () => {
      if ('caches' in window) {
        const cache = await caches.open('kona-content');
        const response = await cache.match(contentId);
        setIsAvailableOffline(!!response);
      }
    };
    checkCache();
  }, [contentId]);

  return {
    isOnline: connected,
    isAvailableOffline,
    canAccess: connected || isAvailableOffline
  };
};

export default OfflineBanner;
