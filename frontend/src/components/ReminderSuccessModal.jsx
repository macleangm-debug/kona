import React, { useState } from "react";
import { Bell, BellRing, Check, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const ReminderSuccessModal = ({ open, onClose }) => {
  const [permissionState, setPermissionState] = useState('default'); // 'default', 'granted', 'denied', 'unsupported'
  const [loading, setLoading] = useState(false);

  const requestNotificationPermission = async () => {
    setLoading(true);
    
    // Check if notifications are supported
    if (!('Notification' in window)) {
      setPermissionState('unsupported');
      setLoading(false);
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      
      if (permission === 'granted') {
        // Show a test notification
        new Notification('Kona', {
          body: 'You\'ll be notified when new episodes drop!',
          icon: '/favicon.ico'
        });
        toast.success('Notifications enabled!');
        setTimeout(onClose, 1500);
      }
    } catch (error) {
      console.error('Notification permission error:', error);
      setPermissionState('denied');
    }
    setLoading(false);
  };

  const openSettings = () => {
    // Guide user to enable notifications
    toast.info('Go to your browser settings to enable notifications for this site');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[300px] bg-card border-white/10 text-center" data-testid="reminder-success-modal">
        <DialogHeader>
          <DialogTitle className="sr-only">Reminder Set</DialogTitle>
          <DialogDescription className="sr-only">Enable notifications</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {permissionState === 'granted' ? (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                <BellRing className="w-8 h-8 text-white" />
              </div>
              <h2 className="font-heading text-xl mb-2">Notifications Enabled!</h2>
              <p className="text-sm text-muted-foreground mb-6">
                We'll notify you when this series is released
              </p>
            </>
          ) : permissionState === 'denied' ? (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                <Bell className="w-8 h-8 text-white" />
              </div>
              <h2 className="font-heading text-xl mb-2">Notifications Blocked</h2>
              <p className="text-sm text-muted-foreground mb-4">
                To receive alerts, please enable notifications in your browser settings:
              </p>
              <div className="text-left text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3 mb-4">
                <p className="font-medium text-white mb-2">How to enable:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Tap the lock/info icon in your browser's address bar</li>
                  <li>Find "Notifications" setting</li>
                  <li>Change to "Allow"</li>
                  <li>Refresh this page</li>
                </ol>
              </div>
              <Button 
                onClick={openSettings}
                className="w-full bg-primary hover:bg-primary/90 rounded-full"
              >
                Got It
              </Button>
            </>
          ) : permissionState === 'unsupported' ? (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                <Bell className="w-8 h-8 text-white" />
              </div>
              <h2 className="font-heading text-xl mb-2">Not Supported</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Your browser doesn't support push notifications. Try using Chrome or Safari.
              </p>
              <Button 
                onClick={onClose}
                variant="outline"
                className="w-full rounded-full"
              >
                Close
              </Button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                <Check className="w-8 h-8 text-white" />
              </div>
              <h2 className="font-heading text-xl mb-2">Reserved successfully!</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Enable notifications to get alerted when the drama is released
              </p>
              <Button 
                onClick={requestNotificationPermission}
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 rounded-full"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Turn On'}
              </Button>
              <button 
                onClick={onClose}
                className="mt-3 text-sm text-muted-foreground hover:text-white transition-colors"
              >
                Maybe Later
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReminderSuccessModal;
