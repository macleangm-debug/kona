/**
 * BiometricLoginButton Component
 * Shows Face ID / Touch ID login option when available
 */

import React, { useState, useEffect } from 'react';
import { useBiometric, useNativePlatform, useHaptics } from '@/hooks/useNativeApp';
import { Button } from '@/components/ui/button';
import { Fingerprint, ScanFace, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import NativeApp from '@/services/NativeApp';

const BiometricLoginButton = ({ onSuccess, onError, serverName = 'kona.com' }) => {
  const { available, biometryType, loading, authenticate, isFaceId, isTouchId } = useBiometric();
  const { isNative } = useNativePlatform();
  const { success: hapticSuccess, error: hapticError } = useHaptics();
  const [authenticating, setAuthenticating] = useState(false);
  const [hasStoredCredentials, setHasStoredCredentials] = useState(false);

  // Check if we have stored credentials
  useEffect(() => {
    const checkCredentials = async () => {
      if (!isNative || !available) return;
      const creds = await NativeApp.getSecureCredentials(serverName);
      setHasStoredCredentials(!!creds);
    };
    checkCredentials();
  }, [isNative, available, serverName]);

  // Don't show if biometric not available or no stored credentials
  if (loading || !available || !isNative) {
    return null;
  }

  const handleBiometricLogin = async () => {
    setAuthenticating(true);

    try {
      // First, authenticate with biometric
      const result = await authenticate({
        title: isFaceId ? 'Face ID Login' : 'Touch ID Login',
        subtitle: 'Sign in to Kona',
        description: isFaceId 
          ? 'Look at your device to sign in' 
          : 'Place your finger on the sensor to sign in'
      });

      if (!result.success) {
        hapticError();
        toast.error(result.error || 'Authentication failed');
        if (onError) onError(result.error);
        setAuthenticating(false);
        return;
      }

      // Get stored credentials
      const credentials = await NativeApp.getSecureCredentials(serverName);
      
      if (!credentials) {
        toast.error('No saved login found. Please sign in with email first.');
        setAuthenticating(false);
        return;
      }

      hapticSuccess();
      
      // Return credentials for login
      if (onSuccess) {
        onSuccess({
          email: credentials.username,
          password: credentials.password
        });
      }

    } catch (error) {
      hapticError();
      toast.error('Authentication failed');
      if (onError) onError(error.message);
    }

    setAuthenticating(false);
  };

  // If no stored credentials, show setup option
  if (!hasStoredCredentials) {
    return null; // Don't show button if no credentials saved
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full gap-2 border-purple-500/30 hover:bg-purple-500/10"
      onClick={handleBiometricLogin}
      disabled={authenticating}
    >
      {authenticating ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : isFaceId ? (
        <ScanFace className="w-5 h-5 text-purple-400" />
      ) : (
        <Fingerprint className="w-5 h-5 text-purple-400" />
      )}
      {authenticating 
        ? 'Authenticating...' 
        : isFaceId 
          ? 'Sign in with Face ID' 
          : 'Sign in with Touch ID'
      }
    </Button>
  );
};

/**
 * BiometricSetupPrompt Component
 * Shows after successful login to enable biometric for future logins
 */
export const BiometricSetupPrompt = ({ 
  email, 
  password, 
  serverName = 'kona.com',
  onComplete,
  onSkip 
}) => {
  const { available, isFaceId } = useBiometric();
  const { isNative } = useNativePlatform();
  const [saving, setSaving] = useState(false);

  if (!available || !isNative) {
    return null;
  }

  const handleEnable = async () => {
    setSaving(true);
    
    try {
      const success = await NativeApp.setSecureCredentials(serverName, email, password);
      
      if (success) {
        toast.success(`${isFaceId ? 'Face ID' : 'Touch ID'} enabled for quick sign in!`);
        if (onComplete) onComplete();
      } else {
        toast.error('Failed to save credentials');
      }
    } catch (error) {
      toast.error('Failed to enable biometric login');
    }
    
    setSaving(false);
  };

  return (
    <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-3">
        {isFaceId ? (
          <ScanFace className="w-8 h-8 text-purple-400" />
        ) : (
          <Fingerprint className="w-8 h-8 text-purple-400" />
        )}
        <div>
          <h3 className="font-semibold">Enable {isFaceId ? 'Face ID' : 'Touch ID'}?</h3>
          <p className="text-sm text-muted-foreground">
            Sign in faster next time with biometrics
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onSkip}
        >
          Not Now
        </Button>
        <Button
          size="sm"
          className="flex-1 bg-purple-600 hover:bg-purple-700"
          onClick={handleEnable}
          disabled={saving}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enable'}
        </Button>
      </div>
    </div>
  );
};

export default BiometricLoginButton;
