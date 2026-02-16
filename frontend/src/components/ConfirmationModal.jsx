import React from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle, Info, XCircle, Loader2, X } from "lucide-react";
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
import { Button } from "@/components/ui/button";

const iconMap = {
  warning: { icon: AlertTriangle, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  danger: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" },
  success: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10" },
  info: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10" },
};

export const ConfirmationModal = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  variant = "warning", // warning, danger, success, info
  loading = false,
  confirmButtonVariant = "default", // default, destructive, outline
  showIcon = true,
  children, // Additional content
}) => {
  const { t } = useTranslation();
  const iconConfig = iconMap[variant] || iconMap.warning;
  const Icon = iconConfig.icon;

  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onOpenChange(false);
  };

  // Determine button variant based on modal variant
  const getConfirmButtonClass = () => {
    if (confirmButtonVariant === "destructive" || variant === "danger") {
      return "bg-red-600 hover:bg-red-700 text-white";
    }
    if (variant === "success") {
      return "bg-green-600 hover:bg-green-700 text-white";
    }
    return "bg-primary hover:bg-primary/90";
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-gray-900 border-white/10 max-w-md" data-testid="confirmation-modal">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            {showIcon && (
              <div className={`p-3 rounded-full ${iconConfig.bg}`}>
                <Icon className={`w-6 h-6 ${iconConfig.color}`} />
              </div>
            )}
            <div className="flex-1">
              <AlertDialogTitle className="text-lg font-semibold">
                {title}
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-2 text-gray-400">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
          
          {/* Additional content */}
          {children && (
            <div className="mt-4 pt-4 border-t border-white/10">
              {children}
            </div>
          )}
        </AlertDialogHeader>
        
        <AlertDialogFooter className="mt-4 gap-2 sm:gap-2">
          <AlertDialogCancel 
            onClick={handleCancel}
            className="bg-transparent border-white/20 hover:bg-white/10"
            disabled={loading}
          >
            {cancelText || t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={getConfirmButtonClass()}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              confirmText || t("common.confirm")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// Preset confirmation modals for common actions
export const DeleteConfirmModal = ({ open, onOpenChange, itemName, onConfirm, loading }) => (
  <ConfirmationModal
    open={open}
    onOpenChange={onOpenChange}
    variant="danger"
    title="Delete Confirmation"
    description={`Are you sure you want to delete "${itemName}"? This action cannot be undone.`}
    confirmText="Delete"
    confirmButtonVariant="destructive"
    onConfirm={onConfirm}
    loading={loading}
  />
);

export const PurchaseConfirmModal = ({ open, onOpenChange, itemName, cost, onConfirm, loading }) => (
  <ConfirmationModal
    open={open}
    onOpenChange={onOpenChange}
    variant="info"
    title="Confirm Purchase"
    description={`You are about to purchase "${itemName}".`}
    confirmText="Purchase"
    onConfirm={onConfirm}
    loading={loading}
  >
    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
      <span className="text-gray-400">Cost</span>
      <span className="font-semibold text-yellow-400">{cost} coins</span>
    </div>
  </ConfirmationModal>
);

export const UnlockEpisodeModal = ({ open, onOpenChange, episodeNumber, seriesTitle, cost, currentCoins, onConfirm, loading }) => (
  <ConfirmationModal
    open={open}
    onOpenChange={onOpenChange}
    variant="info"
    title={`Unlock Episode ${episodeNumber}`}
    description={`Unlock this episode of "${seriesTitle}" to continue watching.`}
    confirmText="Unlock Now"
    onConfirm={onConfirm}
    loading={loading}
  >
    <div className="space-y-2">
      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
        <span className="text-gray-400">Episode Cost</span>
        <span className="font-semibold text-yellow-400">{cost} coins</span>
      </div>
      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
        <span className="text-gray-400">Your Balance</span>
        <span className={`font-semibold ${currentCoins >= cost ? 'text-green-400' : 'text-red-400'}`}>
          {currentCoins} coins
        </span>
      </div>
      {currentCoins < cost && (
        <p className="text-xs text-red-400 text-center mt-2">
          Not enough coins. Visit the store to get more!
        </p>
      )}
    </div>
  </ConfirmationModal>
);

export const LogoutConfirmModal = ({ open, onOpenChange, onConfirm, loading }) => (
  <ConfirmationModal
    open={open}
    onOpenChange={onOpenChange}
    variant="warning"
    title="Sign Out"
    description="Are you sure you want to sign out? You'll need to sign in again to access your account."
    confirmText="Sign Out"
    confirmButtonVariant="destructive"
    onConfirm={onConfirm}
    loading={loading}
  />
);

export const ClaimRewardModal = ({ open, onOpenChange, rewardName, rewardAmount, onConfirm, loading }) => (
  <ConfirmationModal
    open={open}
    onOpenChange={onOpenChange}
    variant="success"
    title="Claim Reward"
    description={`You're about to claim your ${rewardName}!`}
    confirmText="Claim Now"
    onConfirm={onConfirm}
    loading={loading}
  >
    <div className="flex items-center justify-center p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg">
      <span className="text-2xl font-bold text-yellow-400">+{rewardAmount} coins</span>
    </div>
  </ConfirmationModal>
);

export default ConfirmationModal;
