import axios from "axios";
import { API } from "@/config";

class NotificationService {
  constructor() {
    this.swRegistration = null;
    this.vapidPublicKey = null;
  }

  async init() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications not supported');
      return false;
    }

    try {
      this.swRegistration = await navigator.serviceWorker.ready;
      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }

  async requestPermission() {
    if (!('Notification' in window)) {
      return 'unsupported';
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  async subscribe(token) {
    if (!this.swRegistration) {
      await this.init();
    }

    if (!this.swRegistration) {
      throw new Error('Service Worker not ready');
    }

    try {
      // Check if already subscribed
      let subscription = await this.swRegistration.pushManager.getSubscription();
      
      if (!subscription) {
        // Create new subscription
        // Note: In production, you'd get this from your backend
        const vapidKey = await this.getVapidPublicKey();
        
        subscription = await this.swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(vapidKey)
        });
      }

      // Send subscription to backend
      await axios.post(`${API}/notifications/subscribe`, {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
          auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth'))))
        }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      return subscription;
    } catch (error) {
      console.error('Subscription failed:', error);
      throw error;
    }
  }

  async unsubscribe(token) {
    if (!this.swRegistration) {
      return;
    }

    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await axios.delete(`${API}/notifications/unsubscribe`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error('Unsubscription failed:', error);
    }
  }

  async getVapidPublicKey() {
    if (this.vapidPublicKey) {
      return this.vapidPublicKey;
    }

    try {
      const res = await axios.get(`${API}/notifications/vapid-key`);
      this.vapidPublicKey = res.data.public_key;
      return this.vapidPublicKey;
    } catch (error) {
      // Fallback for development
      return 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
    }
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async isSubscribed() {
    if (!this.swRegistration) {
      await this.init();
    }

    if (!this.swRegistration) {
      return false;
    }

    const subscription = await this.swRegistration.pushManager.getSubscription();
    return !!subscription;
  }

  getPermissionStatus() {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  // Show local notification (for testing)
  async showLocalNotification(title, options = {}) {
    if (Notification.permission !== 'granted') {
      return;
    }

    if (this.swRegistration) {
      await this.swRegistration.showNotification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        ...options
      });
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
