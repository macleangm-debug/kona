import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/config";
import { useAuth } from "@/contexts/AuthContext";

export const useMilestoneNotifications = () => {
  const { token } = useAuth();
  const [notification, setNotification] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!token || dismissed) return;

    const checkMilestoneProximity = async () => {
      try {
        const res = await axios.get(`${API}/referral/milestone-proximity`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.data.has_notification) {
          // Check if we've shown this notification recently
          const lastShown = sessionStorage.getItem('kona-milestone-alert-shown');
          const lastMilestone = sessionStorage.getItem('kona-milestone-alert-id');
          
          if (lastShown && lastMilestone === res.data.milestone?.id) {
            return; // Already shown this session for this milestone
          }
          
          setNotification(res.data);
          // Delay showing to not overlap with other popups
          setTimeout(() => setShowAlert(true), 5000);
        }
      } catch (e) {
        console.error('Failed to check milestone proximity:', e);
      }
    };

    // Check after a delay to not interfere with initial load
    const timer = setTimeout(checkMilestoneProximity, 8000);
    return () => clearTimeout(timer);
  }, [token, dismissed]);

  const dismissAlert = () => {
    setShowAlert(false);
    setDismissed(true);
    if (notification?.milestone?.id) {
      sessionStorage.setItem('kona-milestone-alert-shown', 'true');
      sessionStorage.setItem('kona-milestone-alert-id', notification.milestone.id);
    }
  };

  return { notification, showAlert, dismissAlert };
};

export default useMilestoneNotifications;
