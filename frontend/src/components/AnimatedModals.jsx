import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle, Info, XCircle, Loader2, LogOut, Gift, Coins, Download, Users, ShoppingBag } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";

// Animated coin/confetti component
const AnimatedCoins = ({ count = 5 }) => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {[...Array(count)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute text-2xl"
        initial={{ 
          x: "50%", 
          y: "50%", 
          scale: 0,
          rotate: 0 
        }}
        animate={{ 
          x: `${20 + Math.random() * 60}%`,
          y: `${Math.random() * 100}%`,
          scale: [0, 1.2, 1],
          rotate: Math.random() * 360
        }}
        transition={{ 
          duration: 0.8, 
          delay: i * 0.1,
          ease: "easeOut"
        }}
      >
        🪙
      </motion.div>
    ))}
  </div>
);

// Confetti explosion
const Confetti = ({ count = 20 }) => {
  const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#A855F7", "#22C55E", "#3B82F6"];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{ backgroundColor: colors[i % colors.length] }}
          initial={{ 
            x: "50%", 
            y: "50%", 
            scale: 0 
          }}
          animate={{ 
            x: `${Math.random() * 100}%`,
            y: `${Math.random() * 100}%`,
            scale: [0, 1, 0.5],
            opacity: [1, 1, 0]
          }}
          transition={{ 
            duration: 1.2, 
            delay: i * 0.02,
            ease: "easeOut"
          }}
        />
      ))}
    </div>
  );
};

// Waving hand animation
const WavingHand = () => (
  <motion.span
    className="text-4xl inline-block"
    animate={{ 
      rotate: [0, 14, -8, 14, -4, 10, 0],
      scale: [1, 1.1, 1]
    }}
    transition={{ 
      duration: 1.5,
      repeat: Infinity,
      repeatDelay: 1
    }}
  >
    👋
  </motion.span>
);

// Bouncing icon animation
const BouncingIcon = ({ children }) => (
  <motion.div
    animate={{ 
      y: [0, -10, 0],
      scale: [1, 1.1, 1]
    }}
    transition={{ 
      duration: 0.6,
      repeat: Infinity,
      repeatDelay: 0.5
    }}
  >
    {children}
  </motion.div>
);

// Pulsing glow effect
const PulsingGlow = ({ color = "purple", children }) => (
  <motion.div
    className={`relative`}
    animate={{
      boxShadow: [
        `0 0 20px rgba(168, 85, 247, 0.3)`,
        `0 0 40px rgba(168, 85, 247, 0.6)`,
        `0 0 20px rgba(168, 85, 247, 0.3)`,
      ]
    }}
    transition={{ duration: 2, repeat: Infinity }}
    style={{ borderRadius: "50%" }}
  >
    {children}
  </motion.div>
);

// Success checkmark animation
const AnimatedCheckmark = () => (
  <motion.div
    className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center"
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ type: "spring", stiffness: 200, damping: 15 }}
  >
    <motion.div
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
    >
      <CheckCircle className="w-8 h-8 text-green-400" />
    </motion.div>
  </motion.div>
);

// Animated download icon
const AnimatedDownload = () => (
  <motion.div
    className="relative w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center"
  >
    <motion.div
      animate={{ y: [0, 5, 0] }}
      transition={{ duration: 1, repeat: Infinity }}
    >
      <Download className="w-8 h-8 text-blue-400" />
    </motion.div>
    <motion.div
      className="absolute bottom-2 left-1/2 transform -translate-x-1/2"
      animate={{ scaleX: [0.5, 1, 0.5] }}
      transition={{ duration: 1, repeat: Infinity }}
    >
      <div className="w-6 h-0.5 bg-blue-400 rounded" />
    </motion.div>
  </motion.div>
);

// Base Animated Modal
export const AnimatedConfirmationModal = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  cancelText,
  onConfirm,
  variant = "info",
  loading = false,
  animationType = "default", // default, coins, confetti, wave, bounce, download
  children,
  icon: CustomIcon,
}) => {
  const { t } = useTranslation();
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (open) {
      setShowAnimation(true);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm();
    }
  };

  const getButtonClass = () => {
    switch (variant) {
      case "danger": return "bg-red-600 hover:bg-red-700 text-white";
      case "success": return "bg-green-600 hover:bg-green-700 text-white";
      case "warning": return "bg-yellow-600 hover:bg-yellow-700 text-black";
      default: return "bg-primary hover:bg-primary/90";
    }
  };

  const getIconBg = () => {
    switch (variant) {
      case "danger": return "bg-red-500/20";
      case "success": return "bg-green-500/20";
      case "warning": return "bg-yellow-500/20";
      default: return "bg-primary/20";
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-gray-900 border-white/10 max-w-md overflow-hidden" data-testid="animated-confirmation-modal">
        {/* Background animations */}
        <AnimatePresence>
          {showAnimation && animationType === "coins" && <AnimatedCoins count={8} />}
          {showAnimation && animationType === "confetti" && <Confetti count={30} />}
        </AnimatePresence>

        <AlertDialogHeader className="relative z-10">
          <motion.div 
            className="flex flex-col items-center text-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Animated Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
            >
              {animationType === "wave" && <WavingHand />}
              {animationType === "download" && <AnimatedDownload />}
              {animationType === "coins" && (
                <div className={`p-4 rounded-full ${getIconBg()}`}>
                  <BouncingIcon>
                    <Coins className="w-8 h-8 text-yellow-400" />
                  </BouncingIcon>
                </div>
              )}
              {animationType === "confetti" && <AnimatedCheckmark />}
              {animationType === "default" && CustomIcon && (
                <div className={`p-4 rounded-full ${getIconBg()}`}>
                  <CustomIcon className="w-8 h-8" />
                </div>
              )}
            </motion.div>

            <div>
              <AlertDialogTitle className="text-xl font-bold">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {title}
                </motion.span>
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-2 text-gray-400">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {description}
                </motion.span>
              </AlertDialogDescription>
            </div>
          </motion.div>

          {children && (
            <motion.div 
              className="mt-4 pt-4 border-t border-white/10"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {children}
            </motion.div>
          )}
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-6 gap-2 relative z-10">
          <motion.div
            className="flex gap-2 w-full"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <AlertDialogCancel
              className="flex-1 bg-transparent border-white/20 hover:bg-white/10"
              disabled={loading}
            >
              {cancelText || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={`flex-1 ${getButtonClass()}`}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                confirmText || "Confirm"
              )}
            </AlertDialogAction>
          </motion.div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// Logout Modal with waving animation
export const LogoutConfirmModal = ({ open, onOpenChange, onConfirm, loading }) => (
  <AnimatedConfirmationModal
    open={open}
    onOpenChange={onOpenChange}
    variant="warning"
    animationType="wave"
    title="Goodbye! 👋"
    description="Are you sure you want to sign out? We'll miss you!"
    confirmText="Sign Out"
    onConfirm={onConfirm}
    loading={loading}
  />
);

// Claim Reward Modal with coins animation
export const ClaimRewardModal = ({ open, onOpenChange, rewardName, rewardAmount, onConfirm, loading }) => (
  <AnimatedConfirmationModal
    open={open}
    onOpenChange={onOpenChange}
    variant="success"
    animationType="coins"
    title="🎉 Claim Your Reward!"
    description={`You've earned the ${rewardName} milestone!`}
    confirmText="Claim Now!"
    onConfirm={onConfirm}
    loading={loading}
  >
    <motion.div 
      className="flex items-center justify-center p-4 bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-yellow-500/20 rounded-xl"
      animate={{ 
        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
      }}
      transition={{ duration: 3, repeat: Infinity }}
    >
      <motion.span 
        className="text-3xl font-bold text-yellow-400"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
      >
        +{rewardAmount} coins
      </motion.span>
    </motion.div>
  </AnimatedConfirmationModal>
);

// Purchase Success Modal with confetti
export const PurchaseSuccessModal = ({ open, onOpenChange, itemName, onConfirm }) => (
  <AnimatedConfirmationModal
    open={open}
    onOpenChange={onOpenChange}
    variant="success"
    animationType="confetti"
    title="Purchase Complete! 🎊"
    description={`You've successfully purchased ${itemName}!`}
    confirmText="Awesome!"
    onConfirm={onConfirm}
  />
);

// Unlock Episode Modal with coins
export const UnlockEpisodeModal = ({ open, onOpenChange, episodeNumber, seriesTitle, cost, currentCoins, onConfirm, loading }) => {
  const canAfford = currentCoins >= cost;
  
  return (
    <AnimatedConfirmationModal
      open={open}
      onOpenChange={onOpenChange}
      variant={canAfford ? "info" : "warning"}
      animationType="coins"
      title={`Unlock Episode ${episodeNumber}`}
      description={`Continue watching "${seriesTitle}"`}
      confirmText={canAfford ? "Unlock Now" : "Not Enough Coins"}
      onConfirm={canAfford ? onConfirm : undefined}
      loading={loading}
    >
      <div className="space-y-3">
        <motion.div 
          className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <span className="text-gray-400">Episode Cost</span>
          <span className="font-semibold text-yellow-400 flex items-center gap-1">
            <Coins className="w-4 h-4" /> {cost}
          </span>
        </motion.div>
        <motion.div 
          className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <span className="text-gray-400">Your Balance</span>
          <span className={`font-semibold flex items-center gap-1 ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
            <Coins className="w-4 h-4" /> {currentCoins}
          </span>
        </motion.div>
        {!canAfford && (
          <motion.p 
            className="text-sm text-red-400 text-center bg-red-500/10 p-2 rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            You need {cost - currentCoins} more coins! Visit the store.
          </motion.p>
        )}
      </div>
    </AnimatedConfirmationModal>
  );
};

// Download Episode Modal
export const DownloadEpisodeModal = ({ open, onOpenChange, episodeName, onConfirm, loading, isVip = false }) => (
  <AnimatedConfirmationModal
    open={open}
    onOpenChange={onOpenChange}
    variant={isVip ? "info" : "warning"}
    animationType="download"
    title={isVip ? "Download Episode" : "VIP Feature"}
    description={isVip 
      ? `Download "${episodeName}" for offline viewing. Available for 30 days.`
      : "Offline downloads are available for VIP members only."
    }
    confirmText={isVip ? "Download" : "Upgrade to VIP"}
    onConfirm={onConfirm}
    loading={loading}
  >
    {isVip && (
      <div className="text-xs text-gray-400 space-y-1 bg-white/5 p-3 rounded-lg">
        <p>• Download expires in 30 days</p>
        <p>• Max 2 devices allowed</p>
        <p>• Encrypted for your protection</p>
      </div>
    )}
  </AnimatedConfirmationModal>
);

// Join Watch Party Modal
export const JoinWatchPartyModal = ({ open, onOpenChange, hostName, seriesTitle, onConfirm, loading }) => (
  <AnimatedConfirmationModal
    open={open}
    onOpenChange={onOpenChange}
    variant="info"
    animationType="confetti"
    title="🎬 Watch Party Invite!"
    description={`${hostName} invited you to watch "${seriesTitle}" together!`}
    confirmText="Join Party"
    onConfirm={onConfirm}
    loading={loading}
    icon={Users}
  />
);

export default AnimatedConfirmationModal;
